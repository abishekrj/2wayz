import { Router } from 'express'
import { createHash, randomBytes } from 'node:crypto'
import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma.js'
import { requireAdmin } from '../middleware/requireAdmin.js'
import { notify, notifyBooking } from '../lib/notifications.js'
import { ensureRideStartOtp } from '../lib/rideStartOtp.js'

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

async function calculateVerifiedRoute(origin, destination) {
  const apiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY
  if (!apiKey) {
    throw Object.assign(new Error('Ride booking is temporarily unavailable. The server route service is not configured.'), { statusCode: 503 })
  }

  let response
  try {
    response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration'
      },
      body: JSON.stringify({
        origin: { location: { latLng: { latitude: Number(origin.lat), longitude: Number(origin.lng) } } },
        destination: { location: { latLng: { latitude: Number(destination.lat), longitude: Number(destination.lng) } } },
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_UNAWARE',
        computeAlternativeRoutes: true
      }),
      signal: AbortSignal.timeout(10000)
    })
  } catch (error) {
    console.error('Google Routes verification request failed:', error.message)
    throw Object.assign(new Error('Could not verify the driving route. Please try again.'), { statusCode: 502 })
  }

  if (!response.ok) {
    const details = await response.text().catch(() => '')
    console.error('Google Routes verification returned an error:', response.status, details.slice(0, 500))
    throw Object.assign(new Error('Could not verify the driving route. Please try again.'), { statusCode: 502 })
  }

  const data = await response.json()
  const routes = (data.routes || [])
    .filter(route => Number.isFinite(route.distanceMeters) && route.distanceMeters > 0)
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
  const shortest = routes[0]
  if (!shortest) {
    throw Object.assign(new Error('Google Maps could not find a driving route for these locations.'), { statusCode: 422 })
  }

  const durationSeconds = Number.parseFloat(String(shortest.duration || '').replace(/s$/, ''))
  return {
    distanceKm: shortest.distanceMeters / 1000,
    durationMinutes: Number.isFinite(durationSeconds) && durationSeconds > 0
      ? Math.max(1, Math.round(durationSeconds / 60))
      : null
  }
}


// Reverse-geocode GPS coordinates on the server so the browser key does not need
// Geocoding API permission. Keep Geocoding API enabled on the server key.
router.get('/reverse-geocode', async (req, res) => {
  const lat = Number(req.query.lat)
  const lng = Number(req.query.lng)
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
    return res.status(400).json({ message: 'Valid GPS coordinates are required.' })
  }
  const apiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY
  if (!apiKey) return res.status(503).json({ message: 'Current-location lookup is not configured on the server.' })
  try {
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json')
    url.searchParams.set('latlng', `${lat},${lng}`)
    url.searchParams.set('key', apiKey)
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!response.ok) throw new Error(`Geocoding HTTP ${response.status}`)
    const data = await response.json()
    if (data.status !== 'OK' || !data.results?.length) {
      console.error('Reverse geocoding failed:', data.status, data.error_message || '')
      return res.status(502).json({ message: 'Could not identify your current address. You can edit the pickup location manually.' })
    }
    const result = data.results[0]
    const name = result.address_components?.find(component =>
      component.types.includes('premise') || component.types.includes('point_of_interest') ||
      component.types.includes('establishment') || component.types.includes('sublocality')
    )?.long_name || result.formatted_address
    res.json({ place: {
      placeId: result.place_id,
      name,
      address: result.formatted_address || name,
      location: { lat, lng }
    } })
  } catch (error) {
    console.error('Server reverse geocoding request failed:', error.message)
    res.status(502).json({ message: 'Could not identify your current address. You can edit the pickup location manually.' })
  }
})

router.post('/', requirePassenger, async (req, res, next) => {
  try {
    const { pickup, destination } = req.body || {}
    if (!validPoint(pickup) || !validPoint(destination)) return res.status(400).json({ message: 'Choose pickup and destination locations with map coordinates.' })
    const existingActiveRide = await prisma.booking.findFirst({
      where: { passengerId: req.passengerAuth.sub, status: { in: ['REQUESTED', 'DRIVER_ASSIGNED', 'DRIVER_ARRIVED', 'IN_PROGRESS'] } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, reference: true, status: true, pickupName: true, destinationName: true }
    })
    if (existingActiveRide) return res.status(409).json({ message: `You already have an active ride (${existingActiveRide.reference}). Complete or cancel it before booking another ride.`, activeBooking: existingActiveRide })

    const straightLineKm = distanceKm(pickup.location.lat, pickup.location.lng, destination.location.lat, destination.location.lng)
    if (straightLineKm < 0.05) return res.status(400).json({ message: 'Pickup and destination must be different locations.' })

    // Never trust distance or duration sent by the browser. Recalculate the shortest
    // available driving route with the server-only Google Routes API key.
    const verifiedRoute = await calculateVerifiedRoute(pickup.location, destination.location)
    const distanceKmValue = verifiedRoute.distanceKm
    if (distanceKmValue < straightLineKm * 0.8 || distanceKmValue > 100) {
      return res.status(422).json({ message: 'The verified route distance is outside the supported range. Please check the pickup and destination.' })
    }
    const mode = req.body?.mode === 'schedule' ? 'schedule' : 'instant'
    let scheduledAt = null
    if (mode === 'schedule') {
      scheduledAt = new Date(req.body?.scheduledAt)
      if (!Number.isFinite(scheduledAt.getTime()) || scheduledAt.getTime() < Date.now() + 10 * 60 * 1000 || scheduledAt.getTime() > Date.now() + 30 * 24 * 60 * 60 * 1000) return res.status(400).json({ message: 'Choose a scheduled time at least 10 minutes and no more than 30 days from now.' })
    }
    const estimatedMinutes = Math.min(600, Math.max(1, verifiedRoute.durationMinutes || Math.round(distanceKmValue * 4)))
    const fare = fareFor(distanceKmValue)
    const reference = '2W-' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 90 + 10)
    const booking = await prisma.$transaction(async tx => {
      // Serialize booking creation per passenger so two simultaneous requests cannot create duplicate active rides.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${req.passengerAuth.sub}, 0))::text`
      const activeRide = await tx.booking.findFirst({
        where: { passengerId: req.passengerAuth.sub, status: { in: ['REQUESTED', 'DRIVER_ASSIGNED', 'DRIVER_ARRIVED', 'IN_PROGRESS'] } },
        orderBy: { createdAt: 'desc' },
        select: { id: true, reference: true, status: true, pickupName: true, destinationName: true }
      })
      if (activeRide) throw Object.assign(new Error(`You already have an active ride (${activeRide.reference}). Complete or cancel it before booking another ride.`), { statusCode: 409 })
      return tx.booking.create({ data: {
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
    })
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


router.get('/admin/:bookingId/eligible-drivers', requireAdmin, async (req, res, next) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.bookingId },
      select: { id: true, status: true, driverId: true, mode: true, pickupLat: true, pickupLng: true }
    })
    if (!booking) return res.status(404).json({ message: 'Booking not found.' })
    if (booking.status !== 'REQUESTED' || booking.driverId) return res.status(409).json({ message: 'Only unassigned booking requests can be manually assigned.' })
    if (booking.mode !== 'instant') return res.status(409).json({ message: 'Manual assignment is currently available for instant rides only.' })

    const settings = await prisma.walletSettings.findUnique({ where: { id: 'default' } })
    const drivers = await prisma.driver.findMany({
      where: { status: 'APPROVED' },
      orderBy: [{ isOnline: 'desc' }, { name: 'asc' }],
      select: {
        id: true, name: true, phone: true, vehicleNumber: true, serviceArea: true,
        isOnline: true, currentLat: true, currentLng: true, locationUpdatedAt: true,
        wallet: { select: { id: true, balance: true } }
      }
    })
    const now = Date.now()
    const evaluated = await Promise.all(drivers.map(async driver => {
      const distance = driver.currentLat == null || driver.currentLng == null
        ? null : distanceKm(booking.pickupLat, booking.pickupLng, driver.currentLat, driver.currentLng)
      const ageSeconds = driver.locationUpdatedAt ? Math.max(0, Math.floor((now - driver.locationUpdatedAt.getTime()) / 1000)) : null
      const due = driver.wallet?.id ? await prisma.walletTransaction.aggregate({
        where: { walletId: driver.wallet.id, type: 'COMMISSION', status: 'DUE' },
        _sum: { amount: true, settledAmount: true }
      }) : { _sum: { amount: 0, settledAmount: 0 } }
      const outstanding = Math.max(0, (due._sum.amount || 0) - (due._sum.settledAmount || 0))
      const activeRide = await prisma.booking.findFirst({
        where: { driverId: driver.id, status: { in: ['DRIVER_ASSIGNED', 'DRIVER_ARRIVED', 'IN_PROGRESS'] } },
        select: { id: true, reference: true }
      })
      const reasons = []
      if (!driver.isOnline) reasons.push('Driver is offline')
      if (ageSeconds == null || ageSeconds > 180) reasons.push('GPS location is not recent (last 3 minutes required)')
      if (distance == null || distance > 8) reasons.push('Outside the 8 km pickup radius')
      if (activeRide) reasons.push('Already has an active ride')
      if (!settings?.isActive) reasons.push('Wallet commission settings are not active')
      if ((driver.wallet?.balance || 0) < (settings?.minimumBalance || 0)) reasons.push('Wallet balance is below the minimum')
      if (outstanding > 0) reasons.push('Outstanding commission must be cleared')
      return {
        id: driver.id, name: driver.name, phone: driver.phone, vehicleNumber: driver.vehicleNumber,
        serviceArea: driver.serviceArea, isOnline: driver.isOnline, distanceKm: distance == null ? null : Number(distance.toFixed(2)),
        locationAgeSeconds: ageSeconds, walletBalance: driver.wallet?.balance || 0,
        outstandingCommission: outstanding, eligible: reasons.length === 0, reasons
      }
    }))
    res.json({
      eligibleDrivers: evaluated.filter(driver => driver.eligible).sort((a, b) => a.distanceKm - b.distanceKm),
      unavailableDrivers: evaluated.filter(driver => !driver.eligible),
      rules: { radiusKm: 8, gpsMaxAgeSeconds: 180, minimumBalance: settings?.minimumBalance || 0, walletSettingsActive: Boolean(settings?.isActive) }
    })
  } catch (error) { next(error) }
})

router.post('/admin/:bookingId/assign', requireAdmin, async (req, res, next) => {
  try {
    const driverId = String(req.body?.driverId || '').trim()
    if (!driverId) return res.status(400).json({ message: 'Choose a driver to assign.' })
    const assigned = await prisma.$transaction(async tx => {
      // Serialize admin assignment and driver offer acceptance for this driver.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${driverId}, 0))::text`
      const booking = await tx.booking.findUnique({
        where: { id: req.params.bookingId },
        select: { id: true, reference: true, status: true, driverId: true, mode: true, passengerId: true, pickupLat: true, pickupLng: true }
      })
      if (!booking) throw Object.assign(new Error('Booking not found.'), { statusCode: 404 })
      if (booking.status !== 'REQUESTED' || booking.driverId) throw Object.assign(new Error('This booking has already been assigned or is no longer waiting for a driver. Refresh Booking Management.'), { statusCode: 409 })
      if (booking.mode !== 'instant') throw Object.assign(new Error('Manual assignment is currently available for instant rides only.'), { statusCode: 409 })

      const driver = await tx.driver.findUnique({
        where: { id: driverId },
        select: { id: true, name: true, status: true, isOnline: true, currentLat: true, currentLng: true, locationUpdatedAt: true, wallet: { select: { id: true, balance: true } } }
      })
      if (!driver || driver.status !== 'APPROVED') throw Object.assign(new Error('This driver is not approved.'), { statusCode: 409 })
      if (!driver.isOnline) throw Object.assign(new Error('This driver is offline. Ask them to go online before assigning.'), { statusCode: 409 })
      if (driver.currentLat == null || driver.currentLng == null || !driver.locationUpdatedAt || Date.now() - driver.locationUpdatedAt.getTime() > 180000) {
        throw Object.assign(new Error('The driver GPS location is missing or older than 3 minutes. Ask the driver to refresh their location.'), { statusCode: 409 })
      }
      const pickupDistance = distanceKm(booking.pickupLat, booking.pickupLng, driver.currentLat, driver.currentLng)
      if (pickupDistance > 8) throw Object.assign(new Error('The driver is outside the 8 km pickup radius.'), { statusCode: 409 })

      const activeRide = await tx.booking.findFirst({
        where: { driverId, status: { in: ['DRIVER_ASSIGNED', 'DRIVER_ARRIVED', 'IN_PROGRESS'] } },
        select: { reference: true }
      })
      if (activeRide) throw Object.assign(new Error(`This driver already has an active ride (${activeRide.reference}).`), { statusCode: 409 })

      const settings = await tx.walletSettings.findUnique({ where: { id: 'default' } })
      if (!settings?.isActive) throw Object.assign(new Error('Wallet commission settings are not active. Manual assignment is blocked.'), { statusCode: 409 })
      const wallet = driver.wallet || await tx.driverWallet.upsert({ where: { driverId }, create: { driverId }, update: {} })
      if (wallet.balance < settings.minimumBalance) throw Object.assign(new Error(`Driver wallet balance must be at least ₹${settings.minimumBalance}.`), { statusCode: 409 })
      const due = await tx.walletTransaction.aggregate({ where: { walletId: wallet.id, type: 'COMMISSION', status: 'DUE' }, _sum: { amount: true, settledAmount: true } })
      const outstanding = Math.max(0, (due._sum.amount || 0) - (due._sum.settledAmount || 0))
      if (outstanding > 0) throw Object.assign(new Error('This driver has outstanding commission and cannot receive a new ride.'), { statusCode: 409 })

      const now = new Date()
      const changed = await tx.booking.updateMany({
        where: { id: booking.id, status: 'REQUESTED', driverId: null },
        data: { driverId, status: 'DRIVER_ASSIGNED', acceptedAt: now, assignedByAdminId: req.admin.sub, manuallyAssignedAt: now }
      })
      if (changed.count !== 1) throw Object.assign(new Error('Another driver or administrator has already assigned this booking. Refresh and try again.'), { statusCode: 409 })

      await tx.driverOffer.upsert({
        where: { bookingId_driverId: { bookingId: booking.id, driverId } },
        create: { bookingId: booking.id, driverId, status: 'ACCEPTED' },
        update: { status: 'ACCEPTED' }
      })
      await tx.driverOffer.updateMany({
        where: { bookingId: booking.id, driverId: { not: driverId }, status: 'OFFERED' },
        data: { status: 'UNAVAILABLE' }
      })
      await tx.driverActivity.create({
        data: { driverId, eventType: 'RIDE_ACCEPTED', description: `Super Admin manually assigned ride ${booking.reference}.`, bookingId: booking.id }
      })
      return { id: booking.id, reference: booking.reference, passengerId: booking.passengerId, driverId, driverName: driver.name, status: 'DRIVER_ASSIGNED', manuallyAssignedAt: now }
    })

    await notifyBooking({
      booking: assigned, type: 'DRIVER_ASSIGNED', title: 'Driver assigned',
      message: `A 2WAYZ administrator assigned a driver to ride ${assigned.reference}.`, includeDriver: false
    })
    await notifyBooking({
      booking: assigned, type: 'RIDE_ASSIGNED', title: 'New ride assigned',
      message: `The Super Admin assigned ride ${assigned.reference} to you. Open your Driver Portal to view the trip.`,
      includePassenger: false, includeAdmin: false
    })
    res.json({ booking: assigned, message: `Ride ${assigned.reference} assigned to ${assigned.driverName} successfully.` })
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message })
    next(error)
  }
})

router.get('/admin/list', requireAdmin, async (req, res, next) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1)
    const pageSize = 50
    const search = String(req.query.search || '').trim().slice(0, 100)
    const allowedStatuses = new Set(['REQUESTED', 'DRIVER_ASSIGNED', 'DRIVER_ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'])
    const status = allowedStatuses.has(String(req.query.status || '').toUpperCase()) ? String(req.query.status).toUpperCase() : ''
    const where = {
      ...(status ? { status } : {}),
      ...(search ? { OR: [
        { reference: { contains: search, mode: 'insensitive' } },
        { pickupName: { contains: search, mode: 'insensitive' } },
        { destinationName: { contains: search, mode: 'insensitive' } },
        { passenger: { name: { contains: search, mode: 'insensitive' } } },
        { passenger: { phone: { contains: search } } },
        { driver: { is: { name: { contains: search, mode: 'insensitive' } } } },
        { driver: { is: { phone: { contains: search } } } }
      ] } : {})
    }
    const [total, bookings] = await Promise.all([
      prisma.booking.count({ where }),
      prisma.booking.findMany({
        where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize,
        select: {
          id: true, reference: true, status: true, pickupName: true, pickupAddress: true,
          destinationName: true, destinationAddress: true, distanceKm: true, estimatedMinutes: true,
          estimatedFare: true, finalFare: true, mode: true, requestedAt: true, acceptedAt: true,
          arrivedAt: true, tripStartedAt: true, completedAt: true, cancelledAt: true, manuallyAssignedAt: true, assignedByAdminId: true,
          passenger: { select: { name: true, phone: true } },
          driver: { select: { name: true, phone: true, vehicleNumber: true } },
          _count: { select: { offers: true } }
        }
      })
    ])
    res.json({ bookings, pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) } })
  } catch (error) { next(error) }
})

router.get('/active', requirePassenger, async (req, res, next) => {
  try {
    const booking = await prisma.booking.findFirst({
      where: { passengerId: req.passengerAuth.sub, status: { in: ['REQUESTED', 'DRIVER_ASSIGNED', 'DRIVER_ARRIVED', 'IN_PROGRESS'] } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, reference: true, status: true, pickupName: true, pickupAddress: true, destinationName: true, destinationAddress: true, estimatedFare: true, distanceKm: true, estimatedMinutes: true, createdAt: true }
    })
    res.json({ booking })
  } catch (error) { next(error) }
})


router.post('/:id/share', requirePassenger, async (req, res, next) => {
  try {
    const booking = await prisma.booking.findFirst({
      where: { id: req.params.id, passengerId: req.passengerAuth.sub },
      select: { id: true, status: true }
    })
    if (!booking) return res.status(404).json({ message: 'Booking not found.' })
    if (!['DRIVER_ASSIGNED', 'DRIVER_ARRIVED', 'IN_PROGRESS'].includes(booking.status)) {
      return res.status(409).json({ message: 'You can share your trip after a driver accepts your booking.' })
    }

    // The raw random token is returned once to the passenger. Only its SHA-256
    // hash is stored, so a database read cannot reveal a working share URL.
    const token = randomBytes(32).toString('base64url')
    const tokenHash = createHash('sha256').update(token).digest('hex')
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
    await prisma.tripShareLink.upsert({
      where: { bookingId: booking.id },
      create: { bookingId: booking.id, tokenHash, expiresAt },
      update: { tokenHash, expiresAt, revokedAt: null }
    })
    res.status(201).json({ token, expiresAt })
  } catch (error) { next(error) }
})

router.delete('/:id/share', requirePassenger, async (req, res, next) => {
  try {
    const booking = await prisma.booking.findFirst({
      where: { id: req.params.id, passengerId: req.passengerAuth.sub },
      select: { id: true }
    })
    if (!booking) return res.status(404).json({ message: 'Booking not found.' })
    await prisma.tripShareLink.updateMany({
      where: { bookingId: booking.id, revokedAt: null },
      data: { revokedAt: new Date() }
    })
    res.json({ message: 'Trip sharing has been stopped.' })
  } catch (error) { next(error) }
})

router.get('/shared/:token', async (req, res, next) => {
  try {
    const token = String(req.params.token || '')
    if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) return res.status(404).json({ message: 'This trip sharing link is invalid or has expired.' })
    const tokenHash = createHash('sha256').update(token).digest('hex')
    const share = await prisma.tripShareLink.findFirst({
      where: { tokenHash, revokedAt: null, expiresAt: { gt: new Date() } },
      include: {
        booking: {
          include: {
            driver: { select: { name: true, vehicleNumber: true, currentLat: true, currentLng: true, locationUpdatedAt: true, isOnline: true } }
          }
        }
      }
    })
    if (!share) return res.status(410).json({ message: 'This trip sharing link has expired or has been stopped.' })
    const booking = share.booking
    if (!['DRIVER_ASSIGNED', 'DRIVER_ARRIVED', 'IN_PROGRESS'].includes(booking.status)) {
      await prisma.tripShareLink.updateMany({ where: { id: share.id, revokedAt: null }, data: { revokedAt: new Date() } })
      return res.status(410).json({ message: 'This ride has ended. Live trip sharing is no longer available.' })
    }
    const driver = booking.driver
    const locationIsFresh = Boolean(driver?.isOnline && driver.locationUpdatedAt && Date.now() - driver.locationUpdatedAt.getTime() <= 60000)
    res.set('Cache-Control', 'no-store')
    res.json({
      trip: {
        reference: booking.reference,
        status: booking.status,
        pickupName: booking.pickupName,
        pickupAddress: booking.pickupAddress,
        pickupLat: booking.pickupLat,
        pickupLng: booking.pickupLng,
        destinationName: booking.destinationName,
        destinationAddress: booking.destinationAddress,
        destinationLat: booking.destinationLat,
        destinationLng: booking.destinationLng,
        requestedAt: booking.requestedAt,
        tripStartedAt: booking.tripStartedAt,
        driver: driver ? {
          name: driver.name,
          vehicleNumber: driver.vehicleNumber,
          currentLat: locationIsFresh ? driver.currentLat : null,
          currentLng: locationIsFresh ? driver.currentLng : null,
          locationUpdatedAt: driver.locationUpdatedAt,
          locationIsFresh
        } : null,
        shareExpiresAt: share.expiresAt
      }
    })
  } catch (error) { next(error) }
})

router.get('/:id', requirePassenger, async (req, res, next) => {
  try {
    const booking = await prisma.booking.findFirst({ where: { id: req.params.id, passengerId: req.passengerAuth.sub }, include: { driver: { select: { id: true, name: true, phone: true, vehicleNumber: true, currentLat: true, currentLng: true, locationUpdatedAt: true, isOnline: true } } } })
    if (!booking) return res.status(404).json({ message: 'Booking not found.' })
    const rideStartOtp = booking.status === 'DRIVER_ARRIVED' && !booking.rideStartOtpVerifiedAt ? await ensureRideStartOtp(booking.id) : null
    const locationIsFresh = booking.driver?.isOnline && booking.driver.locationUpdatedAt && Date.now() - booking.driver.locationUpdatedAt.getTime() <= 60000
    res.json({ booking: { id: booking.id, reference: booking.reference, status: booking.status, pickupName: booking.pickupName, pickupAddress: booking.pickupAddress, pickupLat: booking.pickupLat, pickupLng: booking.pickupLng, destinationName: booking.destinationName, destinationAddress: booking.destinationAddress, destinationLat: booking.destinationLat, destinationLng: booking.destinationLng, distanceKm: booking.distanceKm, estimatedMinutes: booking.estimatedMinutes, estimatedFare: booking.estimatedFare, finalFare: booking.finalFare, cancelledAt: booking.cancelledAt, cancelledBy: booking.cancelledBy, cancellationReason: booking.cancellationReason, rideStartOtp, arrivedAt: booking.arrivedAt, tripStartedAt: booking.tripStartedAt, completedAt: booking.completedAt, mode: booking.mode, scheduledAt: booking.scheduledAt, driver: booking.driver ? { name: booking.driver.name, phone: booking.driver.phone, vehicleNumber: booking.driver.vehicleNumber, currentLat: locationIsFresh ? booking.driver.currentLat : null, currentLng: locationIsFresh ? booking.driver.currentLng : null, locationUpdatedAt: booking.driver.locationUpdatedAt, locationIsFresh: Boolean(locationIsFresh), isOnline: booking.driver.isOnline } : null } })
  } catch (error) { next(error) }
})


router.post('/:id/rating', requirePassenger, async (req, res, next) => {
  try {
    const stars = Number(req.body?.stars)
    const allowedTags = new Set(['Friendly driver', 'Clean auto', 'Safe driving', 'On-time arrival', 'Good communication'])
    const tags = Array.isArray(req.body?.tags) ? [...new Set(req.body.tags.map(value => String(value).trim()).filter(value => allowedTags.has(value)))].slice(0, 5) : []
    const comment = String(req.body?.comment || '').trim().slice(0, 1000)
    if (!Number.isInteger(stars) || stars < 1 || stars > 5) return res.status(400).json({ message: 'Choose a rating from 1 to 5 stars.' })
    const booking = await prisma.booking.findFirst({ where: { id: req.params.id, passengerId: req.passengerAuth.sub }, select: { id: true, status: true, driverId: true } })
    if (!booking) return res.status(404).json({ message: 'Booking not found.' })
    if (booking.status !== 'COMPLETED' || !booking.driverId) return res.status(409).json({ message: 'You can rate a driver only after the ride is completed.' })
    const rating = await prisma.rating.create({ data: {
      bookingId: booking.id, passengerId: req.passengerAuth.sub, driverId: booking.driverId,
      stars, tags, comment: comment || null
    }, select: { id: true, stars: true, tags: true, comment: true, isVisible: true, createdAt: true } })
    res.status(201).json({ rating, message: 'Thank you for rating your 2WAYZ ride.' })
  } catch (error) {
    if (error.code === 'P2002') return res.status(409).json({ message: 'You have already submitted feedback for this ride.' })
    next(error)
  }
})

router.get('/', requirePassenger, async (req, res, next) => {
  try {
    // Hide cancelled rides from passenger history after 14 days. Keep the
    // underlying booking and audit/financial records for Super Admin reports.
    const cancellationCutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
    const bookings = await prisma.booking.findMany({
      where: {
        passengerId: req.passengerAuth.sub,
        OR: [
          { status: { notIn: ['CANCELLED', 'CANCELED'] } },
          { cancelledAt: { gte: cancellationCutoff } },
          { cancelledAt: null }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, reference: true, status: true, pickupName: true, destinationName: true, estimatedFare: true, finalFare: true, completedAt: true, cancelledAt: true, cancelledBy: true, cancellationReason: true, rideStartOtpVerifiedAt: true, createdAt: true, driver: { select: { name: true, vehicleNumber: true } }, rating: { select: { id: true, stars: true, tags: true, comment: true, isVisible: true, createdAt: true } } }
    })
    const passengerBookings = await Promise.all(bookings.map(async item => ({ ...item, rideStartOtp: item.status === 'DRIVER_ARRIVED' && !item.rideStartOtpVerifiedAt ? await ensureRideStartOtp(item.id) : null })))
    res.json({ bookings: passengerBookings })
  } catch (error) { next(error) }
})

export default router
