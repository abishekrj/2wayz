import { prisma } from './prisma.js'
import { notify } from './notifications.js'

export async function processDriverSubscriptions() {
  const now = new Date()
  const reminderLimit = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
  const reminders = await prisma.driverSubscription.findMany({
    where: { status: 'ACTIVE', isDailyPlan: false, startsAt: { lte: now }, expiresAt: { gt: now, lte: reminderLimit }, expiryNoticeSentAt: null },
    select: { id: true, driverId: true, planName: true, expiresAt: true }
  })
  for (const subscription of reminders) {
    const marked = await prisma.driverSubscription.updateMany({
      where: { id: subscription.id, expiryNoticeSentAt: null },
      data: { expiryNoticeSentAt: now }
    })
    if (marked.count) await notify({
      role: 'DRIVER', recipientId: subscription.driverId, type: 'SUBSCRIPTION_EXPIRING',
      title: '2WAYZ subscription expiring soon',
      message: 'Your ' + subscription.planName + ' subscription expires on ' + subscription.expiresAt.toLocaleDateString('en-IN') + '. Renew it to continue receiving ride offers.'
    })
  }

  const expired = await prisma.driverSubscription.findMany({
    where: { status: 'ACTIVE', isDailyPlan: false, expiresAt: { lte: now } },
    select: { id: true, driverId: true, planName: true }
  })
  for (const subscription of expired) {
    const changed = await prisma.driverSubscription.updateMany({
      where: { id: subscription.id, status: 'ACTIVE', expiresAt: { lte: now } },
      data: { status: 'EXPIRED' }
    })
    if (!changed.count) continue
    const currentSubscription = await prisma.driverSubscription.findFirst({ where: { driverId: subscription.driverId, status: 'ACTIVE', startsAt: { lte: now }, OR: [{ isDailyPlan: true }, { expiresAt: { gt: now } }] }, select: { id: true } })
    const driver = await prisma.driver.findUnique({ where: { id: subscription.driverId }, select: { isOnline: true } })
    if (!currentSubscription && driver?.isOnline) {
      await prisma.driver.update({ where: { id: subscription.driverId }, data: { isOnline: false } })
      await prisma.driverActivity.create({ data: { driverId: subscription.driverId, eventType: 'OFFLINE', description: 'Automatically set offline because the 2WAYZ subscription expired.' } })
    }
    if (!currentSubscription) await notify({
      role: 'DRIVER', recipientId: subscription.driverId, type: 'SUBSCRIPTION_EXPIRED',
      title: '2WAYZ subscription expired',
      message: 'Your ' + subscription.planName + ' subscription has expired. Submit a renewal payment and wait for Super Admin confirmation before receiving new rides.'
    })
  }
}

/**
 * Rebuild subscription periods from verified payment approvals.
 * Existing rows are updated as well, correcting dates written by older recovery code.
 */
export async function reconcileApprovedDriverSubscriptions(db, driverId) {
  const payments = await db.driverSubscriptionPayment.findMany({
    where: { driverId, status: 'APPROVED' }
  })
  // Sort by the best available approval timestamp; reviewedAt is null on
  // records approved by older app versions.
  payments.sort((a, b) => {
    const aTime = (a.reviewedAt || a.updatedAt || a.createdAt).getTime()
    const bTime = (b.reviewedAt || b.updatedAt || b.createdAt).getTime()
    return aTime - bTime || a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id)
  })

  let previousExpiry = null
  let previousWasDaily = false
  let previousDailyId = null
  let previousDailyStart = null
  const now = new Date()
  const openEndedExpiry = new Date('9999-12-31T23:59:59.999Z')
  const reconciled = []

  for (const payment of payments) {
    const approvalTime = payment.reviewedAt || payment.updatedAt || payment.createdAt
    // A later approved plan replaces an earlier open-ended daily plan.
    if (previousWasDaily && previousDailyId) {
      await db.driverSubscription.updateMany({
        where: { id: previousDailyId, status: 'ACTIVE' },
        data: { status: 'REPLACED' }
      })
      previousExpiry = previousDailyStart
      previousWasDaily = false
      previousDailyId = null
      previousDailyStart = null
    }
    const startsAt = previousExpiry && previousExpiry > approvalTime ? previousExpiry : approvalTime
    const isDailyPlan = Number(payment.durationDays) === 1
    const expiresAt = isDailyPlan ? openEndedExpiry : new Date(startsAt.getTime() + payment.durationDays * 86400000)
    const status = expiresAt > now ? 'ACTIVE' : 'EXPIRED'

    const subscription = await db.driverSubscription.upsert({
      where: { paymentId: payment.id },
      create: { driverId, paymentId: payment.id, planName: payment.planName, amount: payment.amount, durationDays: payment.durationDays, isDailyPlan, startsAt, expiresAt, status },
      update: { driverId, planName: payment.planName, amount: payment.amount, durationDays: payment.durationDays, isDailyPlan, startsAt, expiresAt, status }
    })

    previousExpiry = expiresAt
    previousWasDaily = isDailyPlan
    previousDailyId = isDailyPlan ? subscription.id : null
    previousDailyStart = isDailyPlan ? startsAt : null
    reconciled.push(subscription)
  }

  return reconciled
}
