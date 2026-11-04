import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { rateLimit } from 'express-rate-limit'
import { prisma } from '../lib/prisma.js'
import { requireAdmin } from '../middleware/requireAdmin.js'

const router = Router()
const authCookie = () => ({ httpOnly: true, secure: process.env.COOKIE_SECURE === 'true', sameSite: 'strict', path: '/', maxAge: 8 * 60 * 60 * 1000 })
const registerLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 5, standardHeaders: 'draft-7', legacyHeaders: false })
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: 'draft-7', legacyHeaders: false })

function requireDriver(req, res, next) {
  const token = req.cookies?.twoWayzDriver
  if (!token) return res.status(401).json({ message: 'Please sign in as a driver.' })
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    if (payload.role !== 'DRIVER') return res.status(401).json({ message: 'Invalid driver session.' })
    req.driverAuth = payload
    next()
  } catch { return res.status(401).json({ message: 'Your driver session has expired. Please sign in again.' }) }
}


async function walletEligibility(driverId) {
  const settings = await prisma.walletSettings.findUnique({ where: { id: 'default' } })
  if (!settings?.isActive) return { eligible: false, message: 'The Super Admin has not activated wallet settings yet.' }
  const wallet = await prisma.driverWallet.upsert({ where: { driverId }, create: { driverId }, update: {} })
  const due = await prisma.walletTransaction.aggregate({ where: { walletId: wallet.id, type: 'COMMISSION', status: 'DUE' }, _sum: { amount: true, settledAmount: true } })
  const outstanding = Math.max(0, (due._sum.amount || 0) - (due._sum.settledAmount || 0))
  if (outstanding > 0) return { eligible: false, message: 'Please recharge your wallet to clear outstanding commission before receiving new rides.' }
  if (wallet.balance < settings.minimumBalance) return { eligible: false, message: `Your wallet must have at least ₹${settings.minimumBalance} to receive rides.` }
  return { eligible: true, wallet, settings }
}

function distanceKm(aLat, aLng, bLat, bLng) {
  const radians = value => value * Math.PI / 180
  const dLat = radians(bLat - aLat), dLng = radians(bLng - aLng)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(aLat)) * Math.cos(radians(bLat)) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const publicDriver = driver => ({ id: driver.id, name: driver.name, phone: driver.phone, vehicleNumber: driver.vehicleNumber, serviceArea: driver.serviceArea, status: driver.status, isOnline: driver.isOnline, currentLat: driver.currentLat, currentLng: driver.currentLng, locationUpdatedAt: driver.locationUpdatedAt })

router.post('/register', registerLimiter, async (req, res, next) => {
  try {
    const name = String(req.body?.name || '').trim()
    const phone = String(req.body?.phone || '').replace(/\D/g, '')
    const password = String(req.body?.password || '')
    const vehicleNumber = String(req.body?.vehicleNumber || '').trim().toUpperCase()
    const licenceNumber = String(req.body?.licenceNumber || '').trim().toUpperCase()
    const serviceArea = String(req.body?.serviceArea || 'Tiruvannamalai').trim().slice(0, 100)
    if (name.length < 2 || name.length > 100) return res.status(400).json({ message: 'Enter a name between 2 and 100 characters.' })
    if (!/^\d{10}$/.test(phone)) return res.status(400).json({ message: 'Enter a valid 10-digit mobile number.' })
    if (password.length < 8 || password.length > 128) return res.status(400).json({ message: 'Password must contain at least 8 characters.' })
    if (vehicleNumber.length < 5 || vehicleNumber.length > 20) return res.status(400).json({ message: 'Enter a valid vehicle registration number.' })
    if (licenceNumber.length < 5 || licenceNumber.length > 40) return res.status(400).json({ message: 'Enter a valid driving licence number.' })
    const passwordHash = await bcrypt.hash(password, 12)
    const driver = await prisma.driver.create({ data: { name, phone, passwordHash, vehicleNumber, licenceNumber, serviceArea }, select: { id: true, name: true, phone: true, vehicleNumber: true, serviceArea: true, status: true } })
    res.status(201).json({ driver, message: 'Registration received. A 2WAYZ administrator must verify your details before you can go online.' })
  } catch (error) {
    if (error.code === 'P2002') return res.status(409).json({ message: 'This mobile number or vehicle number is already registered.' })
    next(error)
  }
})

router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const phone = String(req.body?.phone || '').replace(/\D/g, '')
    const password = String(req.body?.password || '')
    if (!/^\d{10}$/.test(phone) || !password) return res.status(400).json({ message: 'Enter your 10-digit mobile number and password.' })
    const driver = await prisma.driver.findUnique({ where: { phone } })
    if (!driver || !(await bcrypt.compare(password, driver.passwordHash))) return res.status(401).json({ message: 'Invalid mobile number or password.' })
    const token = jwt.sign({ sub: driver.id, role: 'DRIVER' }, process.env.JWT_SECRET, { expiresIn: '8h' })
    res.cookie('twoWayzDriver', token, authCookie())
    res.json({ driver: publicDriver(driver) })
  } catch (error) { next(error) }
})

router.post('/logout', (req, res) => {
  res.clearCookie('twoWayzDriver', { httpOnly: true, secure: process.env.COOKIE_SECURE === 'true', sameSite: 'strict', path: '/' })
  res.json({ message: 'Signed out.' })
})

router.get('/me', requireDriver, async (req, res, next) => {
  try {
    const driver = await prisma.driver.findUnique({ where: { id: req.driverAuth.sub } })
    if (!driver) return res.status(401).json({ message: 'Driver account not found.' })
    res.json({ driver: publicDriver(driver) })
  } catch (error) { next(error) }
})

router.post('/availability', requireDriver, async (req, res, next) => {
  try {
    const online = req.body?.online
    if (typeof online !== 'boolean') return res.status(400).json({ message: 'Choose online or offline.' })
    const driver = await prisma.driver.findUnique({ where: { id: req.driverAuth.sub } })
    if (!driver) return res.status(404).json({ message: 'Driver account not found.' })
    if (driver.status !== 'APPROVED') return res.status(403).json({ message: 'Your driver account must be approved before going online.' })
    if (online) {
      const walletStatus = await walletEligibility(driver.id)
      if (!walletStatus.eligible) return res.status(403).json({ message: walletStatus.message })
    }
    if (online && (driver.currentLat == null || driver.currentLng == null || !driver.locationUpdatedAt || Date.now() - driver.locationUpdatedAt.getTime() > 180000)) {
      return res.status(400).json({ message: 'Share your current location first, then try going online.' })
    }
    const updated = await prisma.driver.update({ where: { id: driver.id }, data: { isOnline: online } })
    if (online && updated.currentLat != null && updated.currentLng != null) {
      // A driver who just came online can still receive recent pending requests.
      const recentBookings = await prisma.booking.findMany({
        where: { status: 'REQUESTED', driverId: null, mode: 'instant', requestedAt: { gte: new Date(Date.now() - 2 * 60 * 1000) } },
        select: { id: true, pickupLat: true, pickupLng: true }
      })
      const nearby = recentBookings.filter(booking => distanceKm(updated.currentLat, updated.currentLng, booking.pickupLat, booking.pickupLng) <= 8)
      if (nearby.length) await prisma.driverOffer.createMany({
        data: nearby.map(booking => ({ bookingId: booking.id, driverId: updated.id })),
        skipDuplicates: true
      })
    }
    res.json({ driver: publicDriver(updated) })
  } catch (error) { next(error) }
})

router.post('/location', requireDriver, async (req, res, next) => {
  try {
    const lat = Number(req.body?.lat)
    const lng = Number(req.body?.lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return res.status(400).json({ message: 'Valid GPS coordinates are required.' })
    const driver = await prisma.driver.findUnique({ where: { id: req.driverAuth.sub } })
    if (!driver) return res.status(404).json({ message: 'Driver account not found.' })
    if (driver.status !== 'APPROVED') return res.status(403).json({ message: 'Your account is awaiting approval.' })
    const updated = await prisma.driver.update({ where: { id: driver.id }, data: { currentLat: lat, currentLng: lng, locationUpdatedAt: new Date() } })
    res.json({ locationUpdatedAt: updated.locationUpdatedAt, isOnline: updated.isOnline })
  } catch (error) { next(error) }
})

router.get('/offers', requireDriver, async (req, res, next) => {
  try {
    const driver = await prisma.driver.findUnique({ where: { id: req.driverAuth.sub } })
    if (!driver || driver.status !== 'APPROVED') return res.status(403).json({ message: 'Your driver account is not approved yet.' })
    const walletStatus = await walletEligibility(driver.id)
    if (!walletStatus.eligible) return res.json({ offers: [], walletBlocked: true, message: walletStatus.message })
    const offers = await prisma.driverOffer.findMany({
      where: { driverId: driver.id, status: 'OFFERED', booking: { status: 'REQUESTED' } },
      include: { booking: true },
      orderBy: { createdAt: 'desc' },
      take: 20
    })
    res.json({ offers: offers.map(offer => ({ id: offer.id, createdAt: offer.createdAt, booking: { id: offer.booking.id, reference: offer.booking.reference, pickupName: offer.booking.pickupName, pickupAddress: offer.booking.pickupAddress, pickupLat: offer.booking.pickupLat, pickupLng: offer.booking.pickupLng, destinationName: offer.booking.destinationName, destinationAddress: offer.booking.destinationAddress, distanceKm: offer.booking.distanceKm, estimatedMinutes: offer.booking.estimatedMinutes, estimatedFare: offer.booking.estimatedFare, mode: offer.booking.mode, scheduledAt: offer.booking.scheduledAt } })) })
  } catch (error) { next(error) }
})

router.post('/offers/:offerId/accept', requireDriver, async (req, res, next) => {
  try {
    const driverId = req.driverAuth.sub
    const walletStatus = await walletEligibility(driverId)
    if (!walletStatus.eligible) return res.status(403).json({ message: walletStatus.message })
    const offer = await prisma.driverOffer.findFirst({ where: { id: req.params.offerId, driverId, status: 'OFFERED' }, include: { booking: true } })
    if (!offer || offer.booking.status !== 'REQUESTED') return res.status(409).json({ message: 'This ride is no longer available.' })
    const now = new Date()
    const result = await prisma.booking.updateMany({ where: { id: offer.bookingId, status: 'REQUESTED', driverId: null }, data: { driverId, status: 'DRIVER_ASSIGNED', acceptedAt: now } })
    if (result.count !== 1) {
      await prisma.driverOffer.updateMany({ where: { id: offer.id, status: 'OFFERED' }, data: { status: 'UNAVAILABLE' } })
      return res.status(409).json({ message: 'Another driver has already accepted this ride.' })
    }
    await prisma.$transaction([
      prisma.driverOffer.updateMany({ where: { bookingId: offer.bookingId, driverId, status: 'OFFERED' }, data: { status: 'ACCEPTED' } }),
      prisma.driverOffer.updateMany({ where: { bookingId: offer.bookingId, driverId: { not: driverId }, status: 'OFFERED' }, data: { status: 'UNAVAILABLE' } })
    ])
    res.json({ message: 'Ride accepted. You are assigned to this booking.', bookingReference: offer.booking.reference })
  } catch (error) { next(error) }
})

router.post('/offers/:offerId/decline', requireDriver, async (req, res, next) => {
  try {
    const result = await prisma.driverOffer.updateMany({ where: { id: req.params.offerId, driverId: req.driverAuth.sub, status: 'OFFERED' }, data: { status: 'DECLINED' } })
    if (!result.count) return res.status(404).json({ message: 'Ride offer not found.' })
    res.json({ message: 'Ride declined.' })
  } catch (error) { next(error) }
})

router.get('/active', requireDriver, async (req, res, next) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: { driverId: req.driverAuth.sub, status: { in: ['DRIVER_ASSIGNED', 'DRIVER_ARRIVED', 'IN_PROGRESS'] } },
      orderBy: { acceptedAt: 'asc' },
      select: { id: true, reference: true, status: true, pickupName: true, pickupAddress: true, destinationName: true, destinationAddress: true, distanceKm: true, estimatedMinutes: true, estimatedFare: true, finalFare: true, acceptedAt: true, arrivedAt: true, tripStartedAt: true }
    })
    res.json({ bookings })
  } catch (error) { next(error) }
})

router.patch('/bookings/:bookingId/status', requireDriver, async (req, res, next) => {
  try {
    const nextStatus = String(req.body?.status || '').toUpperCase()
    const transitions = {
      DRIVER_ARRIVED: { from: 'DRIVER_ASSIGNED', timestamp: { arrivedAt: new Date() } },
      IN_PROGRESS: { from: 'DRIVER_ARRIVED', timestamp: { tripStartedAt: new Date() } },
      COMPLETED: { from: 'IN_PROGRESS', timestamp: { completedAt: new Date() } }
    }
    const transition = transitions[nextStatus]
    if (!transition) return res.status(400).json({ message: 'Invalid trip status update.' })
    const booking = await prisma.booking.findFirst({ where: { id: req.params.bookingId, driverId: req.driverAuth.sub, status: transition.from }, select: { id: true, estimatedFare: true } })
    if (!booking) return res.status(409).json({ message: 'This ride is no longer in the expected stage. Refresh your active rides.' })
    let finalFare
    if (nextStatus === 'COMPLETED') {
      finalFare = req.body?.finalFare == null || req.body?.finalFare === '' ? booking.estimatedFare : Number(req.body.finalFare)
      if (!Number.isInteger(finalFare) || finalFare < 0 || finalFare > 100000) return res.status(400).json({ message: 'Enter a valid final fare between ₹0 and ₹1,00,000.' })
    }
    const data = { status: nextStatus, ...transition.timestamp }
    if (nextStatus === 'COMPLETED') data.finalFare = finalFare
    if (nextStatus === 'COMPLETED') {
      const outcome = await prisma.$transaction(async tx => {
        const settings = await tx.walletSettings.findUnique({ where: { id: 'default' } })
        const changed = await tx.booking.updateMany({ where: { id: booking.id, driverId: req.driverAuth.sub, status: transition.from }, data })
        if (changed.count !== 1) throw Object.assign(new Error('This ride was updated elsewhere. Refresh your active rides.'), { statusCode: 409 })
        let commission = 0
        let balanceAfter = 0
        if (settings?.isActive) {
          commission = settings.commissionMode === 'PERCENTAGE'
            ? Math.round(finalFare * settings.commissionValue / 100)
            : Math.min(finalFare, Math.round(settings.commissionValue))
          if (commission > 0) {
            const wallet = await tx.driverWallet.upsert({ where: { driverId: req.driverAuth.sub }, create: { driverId: req.driverAuth.sub }, update: {} })
            const paid = Math.min(wallet.balance, commission)
            balanceAfter = wallet.balance - paid
            await tx.driverWallet.update({ where: { id: wallet.id }, data: { balance: balanceAfter } })
            await tx.walletTransaction.create({ data: {
              walletId: wallet.id, type: 'COMMISSION', amount: commission, settledAmount: paid,
              commissionMode: settings.commissionMode, commissionValue: settings.commissionValue,
              status: paid >= commission ? 'POSTED' : 'DUE',
              description: settings.commissionMode === 'PERCENTAGE' ? `Ride commission (${settings.commissionValue}% of ₹${finalFare})` : `Fixed ride commission (configured ₹${settings.commissionValue}; applied ₹${commission})`,
              bookingId: booking.id, balanceAfter
            } })
          } else {
            const wallet = await tx.driverWallet.upsert({ where: { driverId: req.driverAuth.sub }, create: { driverId: req.driverAuth.sub }, update: {} })
            balanceAfter = wallet.balance
          }
        }
        return { commission, balanceAfter }
      })
      return res.json({ message: 'Trip completed. Wallet commission processed.', status: nextStatus, finalFare, commissionDeducted: outcome.commission, walletBalance: outcome.balanceAfter })
    }
    const updated = await prisma.booking.updateMany({ where: { id: booking.id, driverId: req.driverAuth.sub, status: transition.from }, data })
    if (updated.count !== 1) return res.status(409).json({ message: 'This ride was updated elsewhere. Refresh your active rides.' })
    res.json({ message: nextStatus === 'DRIVER_ARRIVED' ? 'Passenger notified: you have arrived.' : 'Trip started.', status: nextStatus, finalFare: null })
  } catch (error) { if (error.statusCode) return res.status(error.statusCode).json({ message: error.message }); next(error) }
})

router.get('/admin/live', requireAdmin, async (_req, res, next) => {
  try {
    const now = Date.now()
    const drivers = await prisma.driver.findMany({
      where: { status: 'APPROVED', isOnline: true },
      orderBy: { name: 'asc' },
      select: {
        id: true, name: true, phone: true, vehicleNumber: true, serviceArea: true,
        currentLat: true, currentLng: true, locationUpdatedAt: true,
        bookings: {
          where: { status: { in: ['DRIVER_ASSIGNED', 'DRIVER_ARRIVED', 'IN_PROGRESS'] } },
          orderBy: { acceptedAt: 'desc' },
          take: 1,
          select: { reference: true, status: true, pickupName: true, destinationName: true }
        }
      }
    })
    res.json({
      drivers: drivers.map(driver => ({
        ...driver,
        isOnTrip: driver.bookings.length > 0,
        activeBooking: driver.bookings[0] || null,
        locationIsFresh: Boolean(driver.locationUpdatedAt && now - driver.locationUpdatedAt.getTime() <= 60000)
      })),
      serverTime: new Date(now).toISOString()
    })
  } catch (error) { next(error) }
})

router.get('/admin', requireAdmin, async (req, res, next) => {
  try {
    const status = ['PENDING', 'APPROVED', 'REJECTED'].includes(String(req.query.status || '').toUpperCase()) ? String(req.query.status).toUpperCase() : undefined
    const drivers = await prisma.driver.findMany({ where: status ? { status } : {}, orderBy: { createdAt: 'desc' }, select: { id: true, name: true, phone: true, vehicleNumber: true, licenceNumber: true, serviceArea: true, status: true, isOnline: true, currentLat: true, currentLng: true, locationUpdatedAt: true, createdAt: true } })
    res.json({ drivers })
  } catch (error) { next(error) }
})

router.patch('/admin/:id/status', requireAdmin, async (req, res, next) => {
  try {
    const status = String(req.body?.status || '').toUpperCase()
    if (!['APPROVED', 'REJECTED', 'PENDING'].includes(status)) return res.status(400).json({ message: 'Invalid driver status.' })
    const driver = await prisma.driver.update({ where: { id: req.params.id }, data: { status, isOnline: false }, select: { id: true, name: true, phone: true, vehicleNumber: true, serviceArea: true, status: true, isOnline: true } })
    res.json({ driver, message: 'Driver status updated.' })
  } catch (error) { if (error.code === 'P2025') return res.status(404).json({ message: 'Driver not found.' }); next(error) }
})

export default router
