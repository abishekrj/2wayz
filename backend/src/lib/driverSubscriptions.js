import { prisma } from './prisma.js'
import { notify } from './notifications.js'

export async function processDriverSubscriptions() {
  const now = new Date()
  const reminderLimit = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
  const reminders = await prisma.driverSubscription.findMany({
    where: { status: 'ACTIVE', startsAt: { lte: now }, expiresAt: { gt: now, lte: reminderLimit }, expiryNoticeSentAt: null },
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
    where: { status: 'ACTIVE', expiresAt: { lte: now } },
    select: { id: true, driverId: true, planName: true }
  })
  for (const subscription of expired) {
    const changed = await prisma.driverSubscription.updateMany({
      where: { id: subscription.id, status: 'ACTIVE', expiresAt: { lte: now } },
      data: { status: 'EXPIRED' }
    })
    if (!changed.count) continue
    const currentSubscription = await prisma.driverSubscription.findFirst({ where: { driverId: subscription.driverId, status: 'ACTIVE', startsAt: { lte: now }, expiresAt: { gt: now } }, select: { id: true } })
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
    where: { driverId, status: 'APPROVED' },
    orderBy: [{ reviewedAt: 'asc' }, { updatedAt: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }]
  })

  let previousExpiry = null
  const now = new Date()
  const reconciled = []

  for (const payment of payments) {
    const approvalTime = payment.reviewedAt || payment.updatedAt || payment.createdAt
    const startsAt = previousExpiry && previousExpiry > approvalTime ? previousExpiry : approvalTime
    const expiresAt = new Date(startsAt.getTime() + payment.durationDays * 86400000)
    const status = expiresAt > now ? 'ACTIVE' : 'EXPIRED'

    const subscription = await db.driverSubscription.upsert({
      where: { paymentId: payment.id },
      create: { driverId, paymentId: payment.id, planName: payment.planName, amount: payment.amount, startsAt, expiresAt, status },
      update: { driverId, planName: payment.planName, amount: payment.amount, startsAt, expiresAt, status }
    })

    previousExpiry = expiresAt
    reconciled.push(subscription)
  }

  return reconciled
}
