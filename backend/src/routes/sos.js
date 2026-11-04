import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma.js'
import { notify } from '../lib/notifications.js'
import { requireAdmin } from '../middleware/requireAdmin.js'

const router = Router()
const activeStatuses = ['REQUESTED', 'DRIVER_ASSIGNED', 'DRIVER_ARRIVED', 'IN_PROGRESS']

function requireRideUser(req, res, next) {
  for (const [cookie, role] of [['twoWayzPassenger', 'PASSENGER'], ['twoWayzDriver', 'DRIVER']]) {
    const token = req.cookies?.[cookie]
    if (!token) continue
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET)
      if (payload.role === role) {
        req.rideUser = { role, id: payload.sub }
        return next()
      }
    } catch {}
  }
  return res.status(401).json({ message: 'Please sign in to send an SOS alert.' })
}

router.post('/trigger', requireRideUser, async (req, res, next) => {
  try {
    const bookingId = String(req.body?.bookingId || '').trim()
    if (!bookingId) return res.status(400).json({ message: 'A booking reference is required for this SOS alert.' })
    const latitude = req.body?.latitude == null ? null : Number(req.body.latitude)
    const longitude = req.body?.longitude == null ? null : Number(req.body.longitude)
    const accuracy = req.body?.locationAccuracy == null ? null : Number(req.body.locationAccuracy)
    if ((latitude == null) !== (longitude == null) ||
      (latitude != null && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)) ||
      (longitude != null && (!Number.isFinite(longitude) || longitude < -180 || longitude > 180)) ||
      (accuracy != null && (!Number.isFinite(accuracy) || accuracy < 0 || accuracy > 100000))) {
      return res.status(400).json({ message: 'The supplied GPS coordinates are invalid.' })
    }

    const ownership = req.rideUser.role === 'PASSENGER'
      ? { id: bookingId, passengerId: req.rideUser.id, status: { in: activeStatuses } }
      : { id: bookingId, driverId: req.rideUser.id, status: { in: ['DRIVER_ASSIGNED', 'DRIVER_ARRIVED', 'IN_PROGRESS'] } }
    const booking = await prisma.booking.findFirst({
      where: ownership,
      select: { id: true, reference: true, passenger: { select: { name: true, phone: true } }, driver: { select: { name: true, phone: true, vehicleNumber: true } } }
    })
    if (!booking) return res.status(404).json({ message: 'This active ride could not be verified. Refresh your ride and try again.' })

    const recent = await prisma.sOSAlert.findFirst({
      where: { bookingId, triggeredByRole: req.rideUser.role, triggeredById: req.rideUser.id, status: { not: 'RESOLVED' }, createdAt: { gte: new Date(Date.now() - 60 * 1000) } },
      orderBy: { createdAt: 'desc' }
    })
    if (recent) return res.status(200).json({ alert: recent, message: 'Your recent SOS alert is already recorded. Super Admin has been notified.' })

    const alert = await prisma.sOSAlert.create({
      data: {
        bookingId,
        triggeredByRole: req.rideUser.role,
        triggeredById: req.rideUser.id,
        latitude,
        longitude,
        locationAccuracy: accuracy,
        description: String(req.body?.description || '').trim().slice(0, 500) || null
      }
    })
    const actor = req.rideUser.role === 'PASSENGER' ? booking.passenger : booking.driver
    await notify({
      role: 'ADMIN',
      type: 'SOS_ALERT',
      title: '🚨 SOS emergency alert',
      message: `${req.rideUser.role === 'PASSENGER' ? 'Passenger' : 'Driver'} ${actor?.name || ''} triggered SOS for ride ${booking.reference}. Immediate review required.`,
      bookingId: booking.id
    })
    res.status(201).json({ alert, message: 'SOS alert sent to 2WAYZ Super Admin. If you are in immediate danger, call 112 now.' })
  } catch (error) { next(error) }
})

router.get('/admin', requireAdmin, async (_req, res, next) => {
  try {
    const alerts = await prisma.sOSAlert.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        booking: {
          select: {
            reference: true, status: true, pickupName: true, pickupAddress: true,
            destinationName: true, destinationAddress: true,
            passenger: { select: { name: true, phone: true } },
            driver: { select: { name: true, phone: true, vehicleNumber: true } }
          }
        }
      }
    })
    res.json({ alerts, openCount: alerts.filter(item => item.status !== 'RESOLVED').length })
  } catch (error) { next(error) }
})

router.patch('/admin/:id', requireAdmin, async (req, res, next) => {
  try {
    const status = String(req.body?.status || '').toUpperCase()
    const actionTaken = String(req.body?.actionTaken || '').trim().slice(0, 2000)
    if (!['ACKNOWLEDGED', 'RESOLVED'].includes(status)) return res.status(400).json({ message: 'Choose acknowledge or resolve.' })
    if (status === 'RESOLVED' && actionTaken.length < 5) return res.status(400).json({ message: 'Record at least a short action note before resolving this alert.' })
    const existing = await prisma.sOSAlert.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ message: 'SOS alert not found.' })
    const alert = await prisma.sOSAlert.update({
      where: { id: existing.id },
      data: {
        status,
        ...(actionTaken ? { actionTaken } : {}),
        ...(status === 'ACKNOWLEDGED' ? { acknowledgedAt: existing.acknowledgedAt || new Date() } : { resolvedAt: new Date(), acknowledgedAt: existing.acknowledgedAt || new Date() })
      }
    })
    res.json({ alert, message: status === 'RESOLVED' ? 'SOS alert marked as resolved.' : 'SOS alert acknowledged.' })
  } catch (error) { next(error) }
})

export default router
