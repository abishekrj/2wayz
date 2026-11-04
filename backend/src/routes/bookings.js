import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma.js'
import { requireAdmin } from '../middleware/requireAdmin.js'
import { notify, notifyBooking } from '../lib/notifications.js'

const router = Router()
function requirePassenger(req, res, next) {
  const token = req.cookies?.twoWayzPassenger
  if (!token) return res.status(401).json({ message: 'Please log in before requesting a ride.' })
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    if (payload.role !== 'PASSENGER') return res.status(401).json({ message: 'Invalid passenger session.' })
    req.passengerAuth = payload
    next()
  } catch { return res.status(401).json({ message: 'Your session has expired. Please log in again.' }) }
}
function distanceKm(aLat, aLng, bLat, bLng) {
  const radians = value => value * Math.PI / 180
  const dLat = radians(bLat - aLat), dLng = radians(bLng - aLng)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(aLat)) * Math.cos(radians(bLat)) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
function validPoint(point) {
  return point && typeof point.name === 'string' && point.name.trim().length > 0 &&
    Number.isFinite(Number(point.location?.lat)) && Number(point.location.lat) >= -90 && Number(point.location.lat) <= 90 &&
    Number.isFinite(Number(point.location?.lng)) && Number(point.location.lng) >= -180 && Number(point.location.lng) <= 180
}
function fareFor(distanceKmValue) {
  const raw = Math.max(50, 30 + Math.max(0, distanceKmValue - 1) * 18)
  return Math.ceil(raw / 5) * 5
}

router.post('/', requirePassenger, async (req, res, next) => {
  try {
    const { pickup, destination } = req.body || {}
    if (!validPoint(pickup) || !validPoint(destination)) return res.status(400).json({ message: 'Choose pickup and destination locations with map coordinates.' })
    const distanceKmValue = distanceKm(pickup.location.lat, pickup.location.lng, destination.location.lat, destination.location.lng)
    if (distanceKmValue < 0.05 || distanceKmValue > 100) return res.status(400).json({ message: 'Choose a valid local route up to 100 km.' })
    const mode = req.body?.mode === 'schedule' ? 'schedule' : 'instant'
    let scheduledAt = null
    if (mode === 'schedule') {
      scheduledAt = new Date(req.body?.scheduledAt)
      if (!Number.isFinite(scheduledAt.getTime()) || scheduledAt.getTime() < Date.now() + 10 * 60 * 1000 || scheduledAt.getTime() > Date.now() + 30 * 24 * 60 * 60 * 1000) return res.status(400).json({ message: 'Choose a scheduled time at least 10 minutes and no more than 30 days from now.' })
    }
    const estimate = req.body?.estimate || {}
    const estimatedMinutes = Math.min(600, Math.max(1, Math.round(Number(estimate.durationMinutes) || distanceKmValue * 4)))
    const fare = fareFor(distanceKmValue)
    const reference = '2W-' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 90 + 10)
    const booking = await prisma.booking.create({ data: {
      reference,
      passengerId: req.passengerAuth.sub,
      pickupName: pickup.name.trim().slice(0, 200),
      pickupAddress: String(pickup.address || pickup.name).trim().slice(0, 500),
      pickupLat: Number(pickup.location.lat),
      pickupLng: Number(pickup.location.lng),
      destinationName: destination.name.trim().slice(0, 200),
      destinationAddress: String(destination.address || destination.name).trim().slice(0, 500),
      destinationLat: Number(destination.location.lat),
      destinationLng: Number(destination.location.lng),
      distanceKm: Number(distanceKmValue.toFixed(2)),
      estimatedMinutes,
      estimatedFare: fare,
      mode,
      scheduledAt,
      ...(mode === 'schedule' ? { dispatchStatus: 'SCHEDULED' } : {})
    } })
    // Instant rides are offered immediately. Scheduled rides are picked up by the background dispatch worker.
    let offersCreated = 0
    if (mode === 'instant') {
      const settings = await prisma.walletSettings.findUnique({ where: { id: 'default' } })
      const cutoff = new Date(Date.now() - 3 * 60 * 1000)
      if (settings?.isActive) {
        const drivers = await prisma.driver.findMany({
          where: { status: 'APPROVED', isOnline: true, locationUpdatedAt: { gte: cutoff }, currentLat: { not: null }, currentLng: { not: null }, wallet: { is: { balance: { gte: settings.minimumBalance } } } },
          select: { id: true, currentLat: true, currentLng: true, wallet: { select: { id: true } } }
        })
        const withNoDue = await Promise.all(drivers.map(async driver => {
          const due = await prisma.walletTransaction.aggregate({ where: { walletId: driver.wallet.id, type: 'COMMISSION', status: 'DUE' }, _sum: { amount: true, settledAmount: true } })
          return { ...driver, outstanding: Math.max(0, (due._sum.amount || 0) - (due._sum.settledAmount || 0)) }
        }))
        const eligible = withNoDue.filter(driver => driver.outstanding === 0)
          .map(driver => ({ id: driver.id, km: distanceKm(booking.pickupLat, booking.pickupLng, driver.currentLat, driver.currentLng) }))
          .filter(driver => driver.km <= 8).sort((a, b) => a.km - b.km).slice(0, 10)
        if (eligible.length) {
          await prisma.driverOffer.createMany({ data: eligible.map(driver => ({ bookingId: booking.id, driverId: driver.id })), skipDuplicates: true })
          offersCreated = eligible.length
          await Promise.all(eligible.map(driver => notify({ role: 'DRIVER', recipientId: driver.id, type: 'RIDE_OFFER', title: 'New ride offer', message: `A nearby ride request ${booking.reference} is available. Open your driver portal to review it.`, bookingId: booking.id })))
        }
      }
    }
    await notifyBooking({ booking, type: 'BOOKING_CREATED', title: 'Ride request created', message: `Ride ${booking.reference} has been requested.`, includeDriver: false })
    const responseMessage = mode === 'schedule'
      ? `Scheduled ride saved. 2WAYZ will start finding drivers ${Math.min(120, Math.max(1, Number(process.env.SCHEDULED_DISPATCH_LEAD_MINUTES) || 15))} minutes before pickup.`
      : offersCreated ? 'Ride request sent to nearby drivers.' : 'Ride request saved. No nearby online driver is available right now.'
    res.status(201).json({ booking: { id: booking.id, reference: booking.reference, status: booking.status, distanceKm: booking.distanceKm, estimatedMinutes: booking.estimatedMinutes, estimatedFare: booking.estimatedFare, mode: booking.mode, scheduledAt: booking.scheduledAt, dispatchStatus: booking.dispatchStatus }, offersCreated, message: responseMessage })
  } catch (error) { next(error) }
})

const cancellationReasons = new Set([
  'CHANGE_OF_PLANS',
  'WRONG_PICKUP',
  'WRONG_DESTINATION',
  'DRIVER_UNAVAILABLE',
  'VEHICLE_ISSUE',
  'PASSENGER_UNAVAILABLE',
  'OTHER'
])

router.post('/:id/cancel', requirePassenger, async (req, res, next) => {
  try {
    const reason = String(req.body?.reason || '').toUpperCase()
    const reasonDetails = String(req.body?.details || '').trim().slice(0, 500)
    if (!cancellationReasons.has(reason)) return res.status(400).json({ message: 'Choose a valid cancellation reason.' })
    const result = await prisma.$transaction(async tx => {
      const booking = await tx.booking.findFirst({
        where: { id: req.params.id, passengerId: req.passengerAuth.sub },
        select: { id: true, status: true, driverId: true, passengerId: true, reference: true, mode: true }
      })
      if (!booking) throw Object.assign(new Error('Booking not found.'), { statusCode: 404 })
      if (!['REQUESTED', 'DRIVER_ASSIGNED', 'DRIVER_ARRIVED'].includes(booking.status)) {
        throw Object.assign(new Error('This booking can no longer be cancelled from the passenger app.'), { statusCode: 409 })
      }
      const now = new Date()
      const updated = await tx.booking.updateMany({
        where: { id: booking.id, passengerId: req.passengerAuth.sub, status: booking.status },
        data: { status: 'CANCELLED', cancelledAt: now, cancelledBy: 'PASSENGER', cancellationReason: reason + (reasonDetails ? ': ' + reasonDetails : ''), ...(booking.mode === 'schedule' ? { dispatchStatus: 'CANCELLED' } : {}) }
      })
      if (updated.count !== 1) throw Object.assign(new Error('The booking changed while cancelling. Refresh and try again.'), { statusCode: 409 })
      await tx.driverOffer.updateMany({ where: { bookingId: booking.id, status: 'OFFERED' }, data: { status: 'UNAVAILABLE' } })
      if (booking.driverId) {
        await tx.driverActivity.create({ data: { driverId: booking.driverId, eventType: 'RIDE_CANCELLED', description: 'Passenger cancelled ride ' + booking.reference + '. Reason: ' + reason, bookingId: booking.id } })
      }
      return { id: booking.id, reference: booking.reference, passengerId: booking.passengerId, driverId: booking.driverId, status: 'CANCELLED', cancelledAt: now, cancelledBy: 'PASSENGER', cancellationReason: reason + (reasonDetails ? ': ' + reasonDetails : '') }
    })
    await notifyBooking({ booking: result, type: 'BOOKING_CANCELLED', title: 'Ride cancelled', message: `Passenger cancelled ride ${result.reference}. Reason: ${result.cancellationReason}`, includePassenger: false })
    res.json({ booking: result, message: 'Booking cancelled. No automatic refund or cancellation fee has been applied.' })
  } catch (error) { if (error.statusCode) return res.status(error.statusCode).json({ message: error.message }); next(error) }
})



router.post('/:id/retry', requirePassenger, async (req, res, next) => {
  try {
    const booking = await prisma.booking.findFirst({
      where: { id: req.params.id, passengerId: req.passengerAuth.sub },
      select: { id: true, reference: true, status: true, driverId: true, pickupLat: true, pickupLng: true }
    })
    if (!booking) return res.status(404).json({ message: 'Booking not found.' })
    if (booking.status !== 'REQUESTED' || booking.driverId) return res.status(409).json({ message: 'This ride is no longer waiting for a driver. Refresh the booking status.' })

    const settings = await prisma.walletSettings.findUnique({ where: { id: 'default' } })
    if (!settings?.isActive) return res.status(409).json({ message: 'Driver matching is temporarily unavailable. Please try again shortly.' })

    const cutoff = new Date(Date.now() - 3 * 60 * 1000)
    const drivers = await prisma.driver.findMany({
      where: { status: 'APPROVED', isOnline: true, locationUpdatedAt: { gte: cutoff }, currentLat: { not: null }, currentLng: { not: null }, wallet: { is: { balance: { gte: settings.minimumBalance } } } },
      select: { id: true, currentLat: true, currentLng: true, wallet: { select: { id: true } } }
    })
    const withNoDue = await Promise.all(drivers.map(async driver => {
      const due = await prisma.walletTransaction.aggregate({ where: { walletId: driver.wallet.id, type: 'COMMISSION', status: 'DUE' }, _sum: { amount: true, settledAmount: true } })
      return { ...driver, outstanding: Math.max(0, (due._sum.amount || 0) - (due._sum.settledAmount || 0)) }
    }))
    const eligible = withNoDue.filter(driver => driver.outstanding === 0)
      .map(driver => ({ id: driver.id, km: distanceKm(booking.pickupLat, booking.pickupLng, driver.currentLat, driver.currentLng) }))
      .filter(driver => driver.km <= 8)
      .sort((a, b) => a.km - b.km)
      .slice(0, 10)

    if (!eligible.length) return res.json({ offersCreated: 0, message: 'No eligible nearby driver is online right now. You can try again in a little while.' })

    const eligibleIds = eligible.map(driver => driver.id)
    const now = new Date()
    await prisma.$transaction(async tx => {
      await tx.driverOffer.updateMany({
        where: { bookingId: booking.id, driverId: { in: eligibleIds }, status: { in: ['DECLINED', 'UNAVAILABLE', 'EXPIRED'] } },
        data: { status: 'OFFERED', createdAt: now, updatedAt: now }
      })
      await tx.driverOffer.createMany({
        data: eligibleIds.map(driverId => ({ bookingId: booking.id, driverId, status: 'OFFERED' })),
        skipDuplicates: true
      })
    })
    await Promise.all(eligibleIds.map(driverId => notify({
      role: 'DRIVER', recipientId: driverId, type: 'RIDE_OFFER',
      title: 'Ride request available again',
      message: `Passenger has retried ride ${booking.reference}. Open your driver portal to review it.`,
      bookingId: booking.id
    })))
    res.json({ offersCreated: eligibleIds.length, message: `Ride request sent again to ${eligibleIds.length} nearby driver(s).` })
  } catch (error) { next(error) }
})

router.get('/admin/scheduled', requireAdmin, async (req, res, next) => {
  try {
    const search = String(req.query.search || '').trim()
    const bookings = await prisma.booking.findMany({
      where: {
        mode: 'schedule',
        ...(search ? { OR: [
          { reference: { contains: search, mode: 'insensitive' } },
          { passenger: { name: { contains: search, mode: 'insensitive' } } },
          { passenger: { phone: { contains: search } } },
          { driver: { is: { name: { contains: search, mode: 'insensitive' } } } },
          { driver: { is: { phone: { contains: search } } } }
        ] } : {})
      },
      orderBy: { scheduledAt: 'desc' },
      take: 200,
      select: {
        id: true, reference: true, status: true, scheduledAt: true, dispatchStatus: true,
        dispatchAttemptCount: true, dispatchLastAttemptAt: true, pickupName: true, pickupAddress: true,
        destinationName: true, destinationAddress: true, estimatedFare: true, createdAt: true,
        passenger: { select: { name: true, phone: true } },
        driver: { select: { name: true, phone: true, vehicleNumber: true } },
        _count: { select: { offers: true } }
      }
    })
    res.json({ bookings })
  } catch (error) { next(error) }
})

router.get('/admin/cancellations', requireAdmin, async (req, res, next) => {
  try {
    const search = String(req.query.search || '').trim()
    const bookings = await prisma.booking.findMany({
      where: {
        status: { in: ['CANCELLED', 'CANCELED'] },
        ...(search ? { OR: [
          { reference: { contains: search, mode: 'insensitive' } },
          { passenger: { name: { contains: search, mode: 'insensitive' } } },
          { passenger: { phone: { contains: search } } },
          { driver: { is: { name: { contains: search, mode: 'insensitive' } } } },
          { driver: { is: { phone: { contains: search } } } }
        ] } : {})
      },
      orderBy: { cancelledAt: 'desc' },
      take: 200,
      select: {
        id: true, reference: true, status: true, driverId: true, pickupName: true, destinationName: true,
        estimatedFare: true, finalFare: true, cancelledAt: true, cancelledBy: true, cancellationReason: true,
        financialAdjustments: { orderBy: { createdAt: 'desc' }, select: { id: true, type: true, amount: true, reason: true, createdBy: true, createdAt: true } },
        passenger: { select: { name: true, phone: true } },
        driver: { select: { name: true, phone: true, vehicleNumber: true } }
      }
    })
    res.json({ bookings })
  } catch (error) { next(error) }
})

router.get('/:id', requirePassenger, async (req, res, next) => {
  try {
    const booking = await prisma.booking.findFirst({ where: { id: req.params.id, passengerId: req.passengerAuth.sub }, include: { driver: { select: { id: true, name: true, phone: true, vehicleNumber: true, currentLat: true, currentLng: true, locationUpdatedAt: true, isOnline: true } } } })
    if (!booking) return res.status(404).json({ message: 'Booking not found.' })
    const locationIsFresh = booking.driver?.isOnline && booking.driver.locationUpdatedAt && Date.now() - booking.driver.locationUpdatedAt.getTime() <= 60000
    res.json({ booking: { id: booking.id, reference: booking.reference, status: booking.status, pickupName: booking.pickupName, pickupAddress: booking.pickupAddress, pickupLat: booking.pickupLat, pickupLng: booking.pickupLng, destinationName: booking.destinationName, destinationAddress: booking.destinationAddress, destinationLat: booking.destinationLat, destinationLng: booking.destinationLng, distanceKm: booking.distanceKm, estimatedMinutes: booking.estimatedMinutes, estimatedFare: booking.estimatedFare, finalFare: booking.finalFare, cancelledAt: booking.cancelledAt, cancelledBy: booking.cancelledBy, cancellationReason: booking.cancellationReason, arrivedAt: booking.arrivedAt, tripStartedAt: booking.tripStartedAt, completedAt: booking.completedAt, mode: booking.mode, scheduledAt: booking.scheduledAt, driver: booking.driver ? { name: booking.driver.name, phone: booking.driver.phone, vehicleNumber: booking.driver.vehicleNumber, currentLat: locationIsFresh ? booking.driver.currentLat : null, currentLng: locationIsFresh ? booking.driver.currentLng : null, locationUpdatedAt: booking.driver.locationUpdatedAt, locationIsFresh: Boolean(locationIsFresh), isOnline: booking.driver.isOnline } : null } })
  } catch (error) { next(error) }
})

router.get('/', requirePassenger, async (req, res, next) => {
  try {
    const bookings = await prisma.booking.findMany({ where: { passengerId: req.passengerAuth.sub }, orderBy: { createdAt: 'desc' }, take: 50, select: { id: true, reference: true, status: true, pickupName: true, destinationName: true, estimatedFare: true, finalFare: true, completedAt: true, cancelledAt: true, cancelledBy: true, cancellationReason: true, createdAt: true } })
    res.json({ bookings })
  } catch (error) { next(error) }
})

export default router
