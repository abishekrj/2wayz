import { prisma } from './prisma.js'

export async function notify({ role, recipientId = null, type, title, message, bookingId = null }) {
  if (!role || !type || !title || !message) return
  return prisma.notification.create({
    data: { recipientRole: role, recipientId, type, title, message, bookingId }
  })
}

export async function notifyBooking({ booking, type, title, message, includeAdmin = true, includePassenger = true, includeDriver = true }) {
  const tasks = []
  if (includePassenger && booking.passengerId) tasks.push(notify({ role: 'PASSENGER', recipientId: booking.passengerId, type, title, message, bookingId: booking.id }))
  if (includeDriver && booking.driverId) tasks.push(notify({ role: 'DRIVER', recipientId: booking.driverId, type, title, message, bookingId: booking.id }))
  if (includeAdmin) tasks.push(notify({ role: 'ADMIN', type, title, message, bookingId: booking.id }))
  await Promise.all(tasks)
}
