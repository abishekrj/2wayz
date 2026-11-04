import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma.js'

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
      scheduledAt
    } })
    // Offer instant rides to approved online drivers with fresh GPS reports within 8 km.
    // Scheduled rides are kept pending for a future scheduled-dispatch worker.
    let offersCreated = 0
    if (mode === 'instant') {
      const cutoff = new Date(Date.now() - 3 * 60 * 1000)
      const drivers = await prisma.driver.findMany({ where: { status: 'APPROVED', isOnline: true, locationUpdatedAt: { gte: cutoff }, currentLat: { not: null }, currentLng: { not: null } }, select: { id: true, currentLat: true, currentLng: true } })
      const eligible = drivers.map(driver => ({ id: driver.id, km: distanceKm(booking.pickupLat, booking.pickupLng, driver.currentLat, driver.currentLng) })).filter(driver => driver.km <= 8).sort((a, b) => a.km - b.km).slice(0, 10)
      if (eligible.length) {
        await prisma.driverOffer.createMany({ data: eligible.map(driver => ({ bookingId: booking.id, driverId: driver.id })) , skipDuplicates: true })
        offersCreated = eligible.length
      }
    }
    res.status(201).json({ booking: { id: booking.id, reference: booking.reference, status: booking.status, distanceKm: booking.distanceKm, estimatedMinutes: booking.estimatedMinutes, estimatedFare: booking.estimatedFare, mode: booking.mode, scheduledAt: booking.scheduledAt }, offersCreated, message: offersCreated ? 'Ride request sent to nearby drivers.' : 'Ride request saved. No nearby online driver is available right now.' })
  } catch (error) { next(error) }
})

router.get('/:id', requirePassenger, async (req, res, next) => {
  try {
    const booking = await prisma.booking.findFirst({ where: { id: req.params.id, passengerId: req.passengerAuth.sub }, include: { driver: { select: { id: true, name: true, phone: true, vehicleNumber: true, currentLat: true, currentLng: true, locationUpdatedAt: true, isOnline: true } } } })
    if (!booking) return res.status(404).json({ message: 'Booking not found.' })
    const locationIsFresh = booking.driver?.isOnline && booking.driver.locationUpdatedAt && Date.now() - booking.driver.locationUpdatedAt.getTime() <= 60000
    res.json({ booking: { id: booking.id, reference: booking.reference, status: booking.status, pickupName: booking.pickupName, pickupAddress: booking.pickupAddress, pickupLat: booking.pickupLat, pickupLng: booking.pickupLng, destinationName: booking.destinationName, destinationAddress: booking.destinationAddress, destinationLat: booking.destinationLat, destinationLng: booking.destinationLng, distanceKm: booking.distanceKm, estimatedMinutes: booking.estimatedMinutes, estimatedFare: booking.estimatedFare, finalFare: booking.finalFare, arrivedAt: booking.arrivedAt, tripStartedAt: booking.tripStartedAt, completedAt: booking.completedAt, mode: booking.mode, scheduledAt: booking.scheduledAt, driver: booking.driver ? { name: booking.driver.name, phone: booking.driver.phone, vehicleNumber: booking.driver.vehicleNumber, currentLat: locationIsFresh ? booking.driver.currentLat : null, currentLng: locationIsFresh ? booking.driver.currentLng : null, locationUpdatedAt: booking.driver.locationUpdatedAt, locationIsFresh: Boolean(locationIsFresh), isOnline: booking.driver.isOnline } : null } })
  } catch (error) { next(error) }
})

router.get('/', requirePassenger, async (req, res, next) => {
  try {
    const bookings = await prisma.booking.findMany({ where: { passengerId: req.passengerAuth.sub }, orderBy: { createdAt: 'desc' }, take: 50, select: { id: true, reference: true, status: true, pickupName: true, destinationName: true, estimatedFare: true, finalFare: true, completedAt: true, createdAt: true } })
    res.json({ bookings })
  } catch (error) { next(error) }
})

export default router
