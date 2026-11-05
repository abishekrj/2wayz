import { prisma } from './prisma.js'
import { notify } from './notifications.js'

export async function processDriverSubscriptions() {
  const now = new Date()
  const reminderLimit = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
  const reminders = await prisma.driverSubscription.findMany({
    where: { status: 'ACTIVE', expiresAt: { gt: now, lte: reminderLimit }, expiryNoticeSentAt: null },
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
    const driver = await prisma.driver.findUnique({ where: { id: subscription.driverId }, select: { isOnline: true } })
    if (driver?.isOnline) {
      await prisma.driver.update({ where: { id: subscription.driverId }, data: { isOnline: false } })
      await prisma.driverActivity.create({ data: { driverId: subscription.driverId, eventType: 'OFFLINE', description: 'Automatically set offline because the 2WAYZ subscription expired.' } })
    }
    await notify({
      role: 'DRIVER', recipientId: subscription.driverId, type: 'SUBSCRIPTION_EXPIRED',
      title: '2WAYZ subscription expired',
      message: 'Your ' + subscription.planName + ' subscription has expired. Submit a renewal payment and wait for Super Admin confirmation before receiving new rides.'
    })
  }
}
