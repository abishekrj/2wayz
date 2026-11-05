import { Router } from 'express'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import multer from 'multer'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { rateLimit } from 'express-rate-limit'
import { prisma } from '../lib/prisma.js'
import { requireAdmin } from '../middleware/requireAdmin.js'
import { notify, notifyBooking } from '../lib/notifications.js'
import { createRideStartOtp, verifyRideStartOtp } from '../lib/rideStartOtp.js'
import { expiredDriverDocuments, istTodayString, suspendDriverIfDocumentsExpired } from '../lib/driverCompliance.js'
import { validateImageUpload } from '../lib/validateImageUpload.js'
import { reconcileApprovedDriverSubscriptions } from '../lib/driverSubscriptions.js'
import { reconcileApprovedDriverSubscriptions } from '../lib/driverSubscriptions.js'

const router = Router()
const authCookie = () => ({ httpOnly: true, secure: process.env.COOKIE_SECURE === 'true', sameSite: 'strict', path: '/', maxAge: 8 * 60 * 60 * 1000 })
const registerLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 5, standardHeaders: 'draft-7', legacyHeaders: false })
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: 'draft-7', legacyHeaders: false })

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const driverUploadDir = path.resolve(currentDir, '../../uploads')
const profilePhotoUpload = multer({
  storage: multer.diskStorage({
    destination: async (_req, _file, callback) => {
      try { await mkdir(driverUploadDir, { recursive: true }); callback(null, driverUploadDir) }
      catch (error) { callback(error) }
    },
    filename: (_req, file, callback) => callback(null, `driver-profile-${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname).toLowerCase()}`)
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) return callback(new Error('Upload a JPG, PNG or WEBP profile photo.'))
    callback(null, true)
  }
})

function parseFutureDate(value, label) {
  const date = String(value || '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw Object.assign(new Error('Enter a valid ' + label + '.'), { statusCode: 400 })
  const parsed = new Date(`${date}T00:00:00.000Z`)
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) throw Object.assign(new Error(`Enter a valid ${label}.`), { statusCode: 400 })
  if (date <= istTodayString()) throw Object.assign(new Error(`${label} must be a future date. Expired documents cannot be registered.`), { statusCode: 400 })
  return parsed
}

function handleProfileUpload(req, res, next) {
  profilePhotoUpload.single('profilePhoto')(req, res, error => {
    if (error) return res.status(400).json({ message: error.message || 'Profile photo upload failed.' })
    validateImageUpload(req, res, next)
  })
}

async function requireDriver(req, res, next) {
  const token = req.cookies?.twoWayzDriver
  if (!token) return res.status(401).json({ message: 'Please sign in as a driver.' })
  let payload
  try { payload = jwt.verify(token, process.env.JWT_SECRET) }
  catch { return res.status(401).json({ message: 'Your driver session has expired. Please sign in again.' }) }
  if (payload.role !== 'DRIVER') return res.status(401).json({ message: 'Invalid driver session.' })
  try {
    const driver = await prisma.driver.findUnique({ where: { id: payload.sub }, select: { id: true } })
    if (!driver) return res.status(401).json({ message: 'Your driver account is no longer available.' })
    req.driverAuth = payload
    next()
  } catch (error) { next(error) }
}



async function ensureApprovedDriverSubscriptions(driverId) {
  await prisma.$transaction(tx => reconcileApprovedDriverSubscriptions(tx, driverId))
}

async function walletEligibility(driverId) {
  // Enforce eligibility from verified payment records, including legacy approvals.
  await ensureApprovedDriverSubscriptions(driverId)
  const now = new Date()
  const activeSubscription = await prisma.driverSubscription.findFirst({ where: { driverId, startsAt: { lte: now }, expiresAt: { gt: now } }, select: { id: true } })
  if (!activeSubscription) {
    const current = await prisma.driver.findUnique({ where: { id: driverId }, select: { isOnline: true } })
    if (current?.isOnline) {
      await prisma.driver.update({ where: { id: driverId }, data: { isOnline: false } })
      await prisma.driverActivity.create({ data: { driverId, eventType: 'OFFLINE', description: 'Automatically set offline because the 2WAYZ subscription is expired or inactive.' } })
    }
    return { eligible: false, message: 'Your 2WAYZ subscription is expired or inactive. Submit your payment and wait for Super Admin approval.' }
  }
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

const publicDriver = driver => ({ id: driver.id, name: driver.name, phone: driver.phone, vehicleNumber: driver.vehicleNumber, serviceArea: driver.serviceArea, status: driver.status, isOnline: driver.isOnline, currentLat: driver.currentLat, currentLng: driver.currentLng, locationUpdatedAt: driver.locationUpdatedAt, profilePhotoUrl: driver.profilePhotoUrl })

router.post('/register', registerLimiter, handleProfileUpload, async (req, res, next) => {
  try {
    const name = String(req.body?.name || '').trim()
    const phone = String(req.body?.phone || '').replace(/\D/g, '')
    const password = String(req.body?.password || '')
    const vehicleNumber = String(req.body?.vehicleNumber || '').trim().toUpperCase()
    const licenceNumber = String(req.body?.licenceNumber || '').trim().toUpperCase()
    const age = Number(req.body?.age)
    const drivingLicenceExpiryDate = parseFutureDate(req.body?.drivingLicenceExpiryDate, 'driving licence expiry date')
    const vehicleInsuranceExpiryDate = parseFutureDate(req.body?.vehicleInsuranceExpiryDate, 'vehicle insurance expiry date')
    const fcExpiryDate = parseFutureDate(req.body?.fcExpiryDate, 'FC expiry date')
    const serviceArea = String(req.body?.serviceArea || 'Tiruvannamalai').trim().slice(0, 100)
    if (name.length < 2 || name.length > 100) return res.status(400).json({ message: 'Enter a name between 2 and 100 characters.' })
    if (password.length < 8 || password.length > 128) return res.status(400).json({ message: 'Password must contain at least 8 characters.' })
    if (vehicleNumber.length < 5 || vehicleNumber.length > 20) return res.status(400).json({ message: 'Enter a valid vehicle registration number.' })
    if (licenceNumber.length < 5 || licenceNumber.length > 40) return res.status(400).json({ message: 'Enter a valid driving licence number.' })
    if (!Number.isInteger(age) || age < 18 || age > 100) return res.status(400).json({ message: 'Driver must be at least 18 years old.' })
    if (!req.file) return res.status(400).json({ message: 'Upload a profile photo to continue.' })
    const passwordHash = await bcrypt.hash(password, 12)
    const driver = await prisma.driver.create({ data: { name, phone, passwordHash, vehicleNumber, licenceNumber, age, drivingLicenceExpiryDate, vehicleInsuranceExpiryDate, fcExpiryDate, profilePhotoUrl: `/uploads/${req.file.filename}`, serviceArea }, select: { id: true, name: true, phone: true, vehicleNumber: true, serviceArea: true, status: true, age: true, drivingLicenceExpiryDate: true, vehicleInsuranceExpiryDate: true, fcExpiryDate: true, profilePhotoUrl: true } })
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
    let driver = await prisma.driver.findUnique({ where: { id: req.driverAuth.sub } })
    if (!driver) return res.status(401).json({ message: 'Driver account not found.' })
    await suspendDriverIfDocumentsExpired(driver)
    driver = await prisma.driver.findUnique({ where: { id: req.driverAuth.sub } })
    res.json({ driver: publicDriver(driver) })
  } catch (error) { next(error) }
})

router.post('/availability', requireDriver, async (req, res, next) => {
  try {
    const online = req.body?.online
    if (typeof online !== 'boolean') return res.status(400).json({ message: 'Choose online or offline.' })
    const driver = await prisma.driver.findUnique({ where: { id: req.driverAuth.sub } })
    if (!driver) return res.status(404).json({ message: 'Driver account not found.' })
    const expiredDocuments = await suspendDriverIfDocumentsExpired(driver)
    if (expiredDocuments.length) return res.status(403).json({ message: `Your account is suspended because these documents have expired: ${expiredDocuments.join(', ')}. Contact 2WAYZ after renewal.` })
    if (driver.status !== 'APPROVED') return res.status(403).json({ message: 'Your driver account must be approved before going online.' })
    if (online) {
      const walletStatus = await walletEligibility(driver.id)
      if (!walletStatus.eligible) return res.status(403).json({ message: walletStatus.message })
    }
    if (online && (driver.currentLat == null || driver.currentLng == null || !driver.locationUpdatedAt || Date.now() - driver.locationUpdatedAt.getTime() > 180000)) {
      return res.status(400).json({ message: 'Share your current location first, then try going online.' })
    }
    const updated = await prisma.driver.update({ where: { id: driver.id }, data: { isOnline: online } })
    if (driver.isOnline !== online) await prisma.driverActivity.create({ data: { driverId: driver.id, eventType: online ? 'ONLINE' : 'OFFLINE', description: online ? 'Driver went online.' : 'Driver went offline.' } })
    if (online && updated.currentLat != null && updated.currentLng != null) {
      // A driver who just came online can still receive recent pending requests.
      const recentBookings = await prisma.booking.findMany({
        where: { status: 'REQUESTED', driverId: null, mode: 'instant', requestedAt: { gte: new Date(Date.now() - 2 * 60 * 1000) } },
        select: { id: true, pickupLat: true, pickupLng: true }
      })
      const nearby = recentBookings.filter(booking => distanceKm(updated.currentLat, updated.currentLng, booking.pickupLat, booking.pickupLng) <= 8)
      if (nearby.length) {
        await prisma.driverOffer.createMany({
          data: nearby.map(booking => ({ bookingId: booking.id, driverId: updated.id })),
          skipDuplicates: true
        })
        await Promise.all(nearby.map(booking => notify({ role: 'DRIVER', recipientId: updated.id, type: 'RIDE_OFFER', title: 'New ride offer', message: 'A nearby ride request is available. Open your driver portal to review it.', bookingId: booking.id })))
      }
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
    {
      const walletStatus = await walletEligibility(driver.id)
      if (!walletStatus.eligible) return res.json({ offers: [], walletBlocked: true, message: walletStatus.message })
    }
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
    const driver = await prisma.driver.findUnique({ where: { id: driverId } })
    if (!driver) return res.status(404).json({ message: 'Driver account not found.' })
    const expiredDocuments = await suspendDriverIfDocumentsExpired(driver)
    if (expiredDocuments.length || driver.status !== 'APPROVED') return res.status(403).json({ message: 'Your account is not eligible to accept rides. Check your driver approval and document expiry status.' })
    {
      const walletStatus = await walletEligibility(driverId)
      if (!walletStatus.eligible) return res.status(403).json({ message: walletStatus.message })
    }
    const accepted = await prisma.$transaction(async tx => {
      // Share a per-driver lock with Super Admin manual assignment.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${driverId}, 0))::text`
      const offer = await tx.driverOffer.findFirst({ where: { id: req.params.offerId, driverId, status: 'OFFERED' }, include: { booking: true } })
      if (!offer || offer.booking.status !== 'REQUESTED' || offer.booking.driverId) {
        throw Object.assign(new Error('This ride is no longer available.'), { statusCode: 409 })
      }
      if (offer.booking.mode === 'schedule' && offer.booking.scheduledAt && offer.booking.scheduledAt <= new Date()) {
        throw Object.assign(new Error('The scheduled pickup time has passed. This ride is no longer available.'), { statusCode: 409 })
      }
      const activeRide = await tx.booking.findFirst({
        where: { driverId, status: { in: ['DRIVER_ASSIGNED', 'DRIVER_ARRIVED', 'IN_PROGRESS'] } },
        select: { reference: true }
      })
      if (activeRide) throw Object.assign(new Error(`Finish your current ride (${activeRide.reference}) before accepting another request.`), { statusCode: 409 })
      const now = new Date()
      const result = await tx.booking.updateMany({
        where: { id: offer.bookingId, status: 'REQUESTED', driverId: null },
        data: { driverId, status: 'DRIVER_ASSIGNED', acceptedAt: now, ...(offer.booking.mode === 'schedule' ? { dispatchStatus: 'ASSIGNED' } : {}) }
      })
      if (result.count !== 1) throw Object.assign(new Error('Another driver has already accepted this ride.'), { statusCode: 409 })
      await tx.driverOffer.updateMany({ where: { bookingId: offer.bookingId, driverId, status: 'OFFERED' }, data: { status: 'ACCEPTED' } })
      await tx.driverOffer.updateMany({ where: { bookingId: offer.bookingId, driverId: { not: driverId }, status: 'OFFERED' }, data: { status: 'UNAVAILABLE' } })
      await tx.driverActivity.create({ data: { driverId, eventType: 'RIDE_ACCEPTED', description: `Accepted ride ${offer.booking.reference}.`, bookingId: offer.bookingId } })
      return { id: offer.booking.id, reference: offer.booking.reference, passengerId: offer.booking.passengerId, driverId }
    })
    await notifyBooking({ booking: accepted, type: 'DRIVER_ASSIGNED', title: 'Driver assigned', message: `A driver accepted ride ${accepted.reference}.`, includeDriver: false })
    await notifyBooking({ booking: accepted, type: 'RIDE_ASSIGNED', title: 'New ride assigned', message: `You accepted ride ${accepted.reference}.`, includePassenger: false, includeAdmin: false })
    res.json({ message: 'Ride accepted. You are assigned to this booking.', bookingReference: accepted.reference })
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message })
    next(error)
  }
})

router.post('/offers/:offerId/decline', requireDriver, async (req, res, next) => {
  try {
    const result = await prisma.driverOffer.updateMany({ where: { id: req.params.offerId, driverId: req.driverAuth.sub, status: 'OFFERED' }, data: { status: 'DECLINED' } })
    if (!result.count) return res.status(404).json({ message: 'Ride offer not found.' })
    const offer = await prisma.driverOffer.findUnique({ where: { id: req.params.offerId }, select: { bookingId: true, booking: { select: { reference: true } } } })
    await prisma.driverActivity.create({ data: { driverId: req.driverAuth.sub, eventType: 'RIDE_DECLINED', description: `Declined ride ${offer?.booking?.reference || ''}.`, bookingId: offer?.bookingId || null } })
    res.json({ message: 'Ride declined.' })
  } catch (error) { next(error) }
})

router.post('/bookings/:bookingId/cancel', requireDriver, async (req, res, next) => {
  try {
    const reason = String(req.body?.reason || '').toUpperCase()
    const allowedReasons = new Set(['PASSENGER_UNAVAILABLE', 'PASSENGER_REQUESTED', 'VEHICLE_ISSUE', 'SAFETY_CONCERN', 'WRONG_LOCATION', 'OTHER'])
    if (!allowedReasons.has(reason)) return res.status(400).json({ message: 'Choose a valid cancellation reason.' })
    const details = String(req.body?.details || '').trim().slice(0, 500)
    const outcome = await prisma.$transaction(async tx => {
      const booking = await tx.booking.findFirst({
        where: { id: req.params.bookingId, driverId: req.driverAuth.sub, status: { in: ['DRIVER_ASSIGNED', 'DRIVER_ARRIVED'] } },
        select: { id: true, status: true, reference: true, passengerId: true, driverId: true, mode: true }
      })
      if (!booking) throw Object.assign(new Error('Only an assigned ride that has not started can be cancelled by the driver.'), { statusCode: 409 })
      const now = new Date()
      const cancellationReason = reason + (details ? ': ' + details : '')
      const changed = await tx.booking.updateMany({
        where: { id: booking.id, driverId: req.driverAuth.sub, status: booking.status },
        data: { status: 'CANCELLED', cancelledAt: now, cancelledBy: 'DRIVER', cancellationReason, ...(booking.mode === 'schedule' ? { dispatchStatus: 'CANCELLED' } : {}) }
      })
      if (changed.count !== 1) throw Object.assign(new Error('This ride changed while cancelling. Refresh your active rides.'), { statusCode: 409 })
      await tx.driverActivity.create({ data: { driverId: req.driverAuth.sub, eventType: 'RIDE_CANCELLED', description: 'Driver cancelled ride ' + booking.reference + '. Reason: ' + reason, bookingId: booking.id } })
      await tx.driverOffer.updateMany({ where: { bookingId: booking.id, status: 'OFFERED' }, data: { status: 'UNAVAILABLE' } })
      return { id: booking.id, reference: booking.reference, passengerId: booking.passengerId, driverId: req.driverAuth.sub, status: 'CANCELLED', cancelledAt: now, cancelledBy: 'DRIVER', cancellationReason }
    })
    await notifyBooking({ booking: outcome, type: 'BOOKING_CANCELLED', title: 'Ride cancelled', message: `Driver cancelled ride ${outcome.reference}. Reason: ${outcome.cancellationReason}`, includeDriver: false })
    res.json({ booking: outcome, message: 'Ride cancelled and recorded for Super Admin review. No cancellation fee or wallet adjustment has been applied.' })
  } catch (error) { if (error.statusCode) return res.status(error.statusCode).json({ message: error.message }); next(error) }
})


router.get('/ratings', requireDriver, async (req, res, next) => {
  try {
    const [aggregate, ratings] = await Promise.all([
      prisma.rating.aggregate({ where: { driverId: req.driverAuth.sub, isVisible: true }, _avg: { stars: true }, _count: { _all: true } }),
      prisma.rating.findMany({
        where: { driverId: req.driverAuth.sub, isVisible: true }, orderBy: { createdAt: 'desc' }, take: 20,
        select: { id: true, stars: true, tags: true, comment: true, createdAt: true, booking: { select: { reference: true } } }
      })
    ])
    res.json({ averageRating: Number((aggregate._avg.stars || 0).toFixed(1)), totalRatings: aggregate._count._all, ratings })
  } catch (error) { next(error) }
})

router.get('/active', requireDriver, async (req, res, next) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: { driverId: req.driverAuth.sub, status: { in: ['DRIVER_ASSIGNED', 'DRIVER_ARRIVED', 'IN_PROGRESS'] } },
      orderBy: { acceptedAt: 'asc' },
      select: { id: true, reference: true, status: true, pickupName: true, pickupAddress: true, destinationName: true, destinationAddress: true, distanceKm: true, estimatedMinutes: true, estimatedFare: true, finalFare: true, mode: true, scheduledAt: true, acceptedAt: true, arrivedAt: true, tripStartedAt: true }
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
    const booking = await prisma.booking.findFirst({ where: { id: req.params.bookingId, driverId: req.driverAuth.sub, status: transition.from }, select: { id: true, estimatedFare: true, reference: true, passengerId: true, driverId: true } })
    if (!booking) return res.status(409).json({ message: 'This ride is no longer in the expected stage. Refresh your active rides.' })
    let finalFare
    if (nextStatus === 'COMPLETED') {
      finalFare = req.body?.finalFare == null || req.body?.finalFare === '' ? booking.estimatedFare : Number(req.body.finalFare)
      if (!Number.isInteger(finalFare) || finalFare < 0 || finalFare > 100000) return res.status(400).json({ message: 'Enter a valid final fare between ₹0 and ₹1,00,000.' })
    }
    const data = { status: nextStatus, ...transition.timestamp }
    if (nextStatus === 'DRIVER_ARRIVED') {
      const otp = createRideStartOtp()
      data.rideStartOtpHash = otp.hash
      data.rideStartOtpEncrypted = otp.encrypted
      data.rideStartOtpAttempts = 0
      data.rideStartOtpVerifiedAt = null
    }
    if (nextStatus === 'COMPLETED') data.finalFare = finalFare
    if (nextStatus === 'IN_PROGRESS') {
      const submittedOtp = String(req.body?.otp || '').trim()
      const current = await prisma.booking.findUnique({ where: { id: booking.id }, select: { rideStartOtpHash: true, rideStartOtpAttempts: true, rideStartOtpVerifiedAt: true } })
      if (current?.rideStartOtpVerifiedAt) return res.status(409).json({ message: 'This ride has already been verified. Refresh your active rides.' })
      if (!current?.rideStartOtpHash) return res.status(409).json({ message: 'Ride OTP is not available yet. Ask the passenger to refresh their booking screen.' })
      if ((current.rideStartOtpAttempts || 0) >= 5) return res.status(429).json({ message: 'Too many incorrect OTP attempts. Please contact 2WAYZ support.' })
      if (!verifyRideStartOtp(submittedOtp, current.rideStartOtpHash)) {
        await prisma.booking.updateMany({ where: { id: booking.id, status: 'DRIVER_ARRIVED', rideStartOtpVerifiedAt: null }, data: { rideStartOtpAttempts: { increment: 1 } } })
        const attemptsLeft = Math.max(0, 4 - (current.rideStartOtpAttempts || 0))
        return res.status(400).json({ message: attemptsLeft > 0 ? `Incorrect OTP. ${attemptsLeft} attempt(s) remaining.` : 'Incorrect OTP. Ride start is locked after 5 failed attempts; contact 2WAYZ support.' })
      }
      data.rideStartOtpVerifiedAt = new Date()
    }
    if (nextStatus === 'COMPLETED') {
      const outcome = await prisma.$transaction(async tx => {
        const settings = await tx.walletSettings.findUnique({ where: { id: 'default' } })
        const changed = await tx.booking.updateMany({ where: { id: booking.id, driverId: req.driverAuth.sub, status: transition.from }, data })
        if (changed.count !== 1) throw Object.assign(new Error('This ride was updated elsewhere. Refresh your active rides.'), { statusCode: 409 })
        await tx.driverActivity.create({ data: { driverId: req.driverAuth.sub, eventType: 'TRIP_COMPLETED', description: `Completed ride with final fare ₹${finalFare}.`, bookingId: booking.id } })
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
      await notifyBooking({ booking, type: 'TRIP_COMPLETED', title: 'Trip completed', message: `Ride ${booking.reference} is completed. Final fare: ₹${finalFare}.`, includeDriver: false })
      await notifyBooking({ booking, type: 'TRIP_COMPLETED', title: 'Trip completed', message: `You completed ride ${booking.reference}.`, includePassenger: false, includeAdmin: false })
      return res.json({ message: 'Trip completed. Wallet commission processed.', status: nextStatus, finalFare, commissionDeducted: outcome.commission, walletBalance: outcome.balanceAfter })
    }
    const updated = await prisma.booking.updateMany({ where: { id: booking.id, driverId: req.driverAuth.sub, status: transition.from, ...(nextStatus === 'IN_PROGRESS' ? { rideStartOtpVerifiedAt: null } : {}) }, data })
    if (updated.count !== 1) return res.status(409).json({ message: 'This ride was updated elsewhere. Refresh your active rides.' })
    await prisma.driverActivity.create({ data: {
      driverId: req.driverAuth.sub,
      eventType: nextStatus === 'DRIVER_ARRIVED' ? 'DRIVER_ARRIVED' : 'TRIP_STARTED',
      description: nextStatus === 'DRIVER_ARRIVED' ? 'Driver arrived at the pickup location; ride-start OTP generated.' : 'Trip started after passenger OTP verification.',
      bookingId: booking.id
    } })
    await notifyBooking({ booking, type: nextStatus, title: nextStatus === 'DRIVER_ARRIVED' ? 'Driver has arrived' : 'Trip started', message: nextStatus === 'DRIVER_ARRIVED' ? `Your driver has arrived for ride ${booking.reference}.` : `Ride ${booking.reference} has started.`, includeDriver: false })
    await notifyBooking({ booking, type: nextStatus, title: nextStatus === 'DRIVER_ARRIVED' ? 'Marked as arrived' : 'Trip started', message: `Ride ${booking.reference} status updated to ${nextStatus.replaceAll('_', ' ').toLowerCase()}.`, includePassenger: false, includeAdmin: false })
    res.json({ message: nextStatus === 'DRIVER_ARRIVED' ? 'Passenger notified: you have arrived. Ask them for the ride-start OTP.' : 'OTP verified. Trip started.', status: nextStatus, finalFare: null })
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

router.get('/admin/operations', requireAdmin, async (_req, res, next) => {
  try {
    const drivers = await prisma.driver.findMany({
      where: { status: 'APPROVED' },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, phone: true, vehicleNumber: true, serviceArea: true, isOnline: true, locationUpdatedAt: true, createdAt: true }
    })
    const now = new Date()
    const startOfDay = new Date(now)
    startOfDay.setHours(0, 0, 0, 0)
    const results = await Promise.all(drivers.map(async driver => {
      const events = await prisma.driverActivity.findMany({
        where: { driverId: driver.id, eventType: { in: ['ONLINE', 'OFFLINE'] } },
        orderBy: { createdAt: 'asc' },
        select: { eventType: true, createdAt: true }
      })
      let todayMs = 0, totalMs = 0, activeSince = null
      for (const event of events) {
        if (event.eventType === 'ONLINE') {
          if (!activeSince) activeSince = event.createdAt
        } else if (activeSince) {
          totalMs += event.createdAt - activeSince
          const overlap = activeSince > startOfDay ? activeSince : startOfDay
          if (event.createdAt > overlap) todayMs += event.createdAt - overlap
          activeSince = null
        }
      }
        if (activeSince) {
        // Driver GPS is sent about every 12 seconds. Stop counting an abandoned
        // online session after 3 minutes without a location heartbeat.
        const heartbeatEnd = driver.locationUpdatedAt ? new Date(driver.locationUpdatedAt.getTime() + 180000) : activeSince
        const sessionEnd = driver.isOnline && heartbeatEnd < now ? heartbeatEnd : now
        const safeEnd = sessionEnd > activeSince ? sessionEnd : activeSince
        totalMs += safeEnd - activeSince
        const overlap = activeSince > startOfDay ? activeSince : startOfDay
        if (safeEnd > overlap) todayMs += safeEnd - overlap
      }
      const age = driver.locationUpdatedAt ? Math.max(0, Math.floor((now - driver.locationUpdatedAt) / 1000)) : null
      const locationHealth = age == null ? 'NO_LOCATION' : age <= 60 ? 'HEALTHY' : age <= 180 ? 'DELAYED' : 'STALE'
      return { ...driver, onlineTodayMs: todayMs, totalOnlineMs: totalMs, locationAgeSeconds: age, locationHealth }
    }))
    res.json({ drivers: results, serverTime: now.toISOString() })
  } catch (error) { next(error) }
})

router.get('/admin/:id/activity', requireAdmin, async (req, res, next) => {
  try {
    const driver = await prisma.driver.findUnique({ where: { id: req.params.id }, select: { id: true, name: true, phone: true, vehicleNumber: true } })
    if (!driver) return res.status(404).json({ message: 'Driver not found.' })
    const activities = await prisma.driverActivity.findMany({
      where: { driverId: driver.id }, orderBy: { createdAt: 'desc' }, take: 100,
      select: { id: true, eventType: true, description: true, bookingId: true, createdAt: true }
    })
    res.json({ driver, activities })
  } catch (error) { next(error) }
})

router.get('/admin', requireAdmin, async (req, res, next) => {
  try {
    const status = ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'].includes(String(req.query.status || '').toUpperCase()) ? String(req.query.status).toUpperCase() : undefined
    const drivers = await prisma.driver.findMany({ where: status ? { status } : {}, orderBy: { createdAt: 'desc' }, select: { id: true, name: true, phone: true, vehicleNumber: true, licenceNumber: true, drivingLicenceExpiryDate: true, vehicleInsuranceExpiryDate: true, fcExpiryDate: true, age: true, profilePhotoUrl: true, complianceNoticeSentAt: true, serviceArea: true, status: true, isOnline: true, currentLat: true, currentLng: true, locationUpdatedAt: true, createdAt: true } })
    res.json({ drivers })
  } catch (error) { next(error) }
})

router.patch('/admin/:id/profile', requireAdmin, handleProfileUpload, async (req, res, next) => {
  try {
    const name = String(req.body?.name || '').trim()
    const phone = String(req.body?.phone || '').replace(/\D/g, '')
    const vehicleNumber = String(req.body?.vehicleNumber || '').trim().toUpperCase()
    const licenceNumber = String(req.body?.licenceNumber || '').trim().toUpperCase()
    const serviceArea = String(req.body?.serviceArea || '').trim().slice(0, 100)
    const age = Number(req.body?.age)
    const password = String(req.body?.password || '')
    if (name.length < 2 || name.length > 100) return res.status(400).json({ message: 'Enter a name between 2 and 100 characters.' })
    if (!/^\d{10}$/.test(phone)) return res.status(400).json({ message: 'Enter a valid 10-digit mobile number.' })
    if (vehicleNumber.length < 5 || vehicleNumber.length > 20) return res.status(400).json({ message: 'Enter a valid vehicle registration number.' })
    if (licenceNumber.length < 5 || licenceNumber.length > 40) return res.status(400).json({ message: 'Enter a valid driving licence number.' })
    if (!Number.isInteger(age) || age < 18 || age > 100) return res.status(400).json({ message: 'Driver age must be between 18 and 100.' })
    if (!serviceArea) return res.status(400).json({ message: 'Enter the driver service area.' })
    if (password && (password.length < 8 || password.length > 128)) return res.status(400).json({ message: 'New password must contain at least 8 characters.' })
    const drivingLicenceExpiryDate = parseFutureDate(req.body?.drivingLicenceExpiryDate, 'driving licence expiry date')
    const vehicleInsuranceExpiryDate = parseFutureDate(req.body?.vehicleInsuranceExpiryDate, 'vehicle insurance expiry date')
    const fcExpiryDate = parseFutureDate(req.body?.fcExpiryDate, 'FC expiry date')
    const existing = await prisma.driver.findUnique({
      where: { id: req.params.id },
      select: { id: true, drivingLicenceExpiryDate: true, vehicleInsuranceExpiryDate: true, fcExpiryDate: true }
    })
    if (!existing) return res.status(404).json({ message: 'Driver not found.' })
    // Allow unrelated profile edits while a driver is suspended for an already-expired
    // document. An unchanged expired date remains unchanged; any renewed/changed date
    // must be a valid future date.
    const adminDocumentDate = (value, label, existingDate) => {
      const date = String(value || '')
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw Object.assign(new Error('Enter a valid ' + label + '.'), { statusCode: 400 })
      const parsed = new Date(`${date}T00:00:00.000Z`)
      if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) throw Object.assign(new Error(`Enter a valid ${label}.`), { statusCode: 400 })
      const existingDateString = existingDate ? new Date(existingDate).toISOString().slice(0, 10) : ''
      if (date <= istTodayString() && date !== existingDateString) throw Object.assign(new Error(`${label} must be a future date.`), { statusCode: 400 })
      return parsed
    }
    const updatedDrivingLicenceExpiryDate = adminDocumentDate(req.body?.drivingLicenceExpiryDate, 'driving licence expiry date', existing.drivingLicenceExpiryDate)
    const updatedVehicleInsuranceExpiryDate = adminDocumentDate(req.body?.vehicleInsuranceExpiryDate, 'vehicle insurance expiry date', existing.vehicleInsuranceExpiryDate)
    const updatedFcExpiryDate = adminDocumentDate(req.body?.fcExpiryDate, 'FC expiry date', existing.fcExpiryDate)
    const data = {
      name, phone, vehicleNumber, licenceNumber, serviceArea, age,
      drivingLicenceExpiryDate: updatedDrivingLicenceExpiryDate,
      vehicleInsuranceExpiryDate: updatedVehicleInsuranceExpiryDate,
      fcExpiryDate: updatedFcExpiryDate
    }
    if (req.file) data.profilePhotoUrl = `/uploads/${req.file.filename}`
    if (password) data.passwordHash = await bcrypt.hash(password, 12)
    const driver = await prisma.driver.update({
      where: { id: req.params.id },
      data,
      select: { id: true, name: true, phone: true, vehicleNumber: true, licenceNumber: true, serviceArea: true, age: true, drivingLicenceExpiryDate: true, vehicleInsuranceExpiryDate: true, fcExpiryDate: true, profilePhotoUrl: true, status: true }
    })
    res.json({ driver, message: 'Driver profile updated successfully. Review document validity before approving or restoring ride access.' })
  } catch (error) {
    if (error.code === 'P2002') return res.status(409).json({ message: 'This mobile number or vehicle number is already registered to another driver.' })
    if (error.code === 'P2025') return res.status(404).json({ message: 'Driver not found.' })
    next(error)
  }
})

router.patch('/admin/:id/documents', requireAdmin, async (req, res, next) => {
  try {
    const age = Number(req.body?.age)
    if (!Number.isInteger(age) || age < 18 || age > 100) return res.status(400).json({ message: 'Driver age must be between 18 and 100.' })
    const drivingLicenceExpiryDate = parseFutureDate(req.body?.drivingLicenceExpiryDate, 'driving licence expiry date')
    const vehicleInsuranceExpiryDate = parseFutureDate(req.body?.vehicleInsuranceExpiryDate, 'vehicle insurance expiry date')
    const fcExpiryDate = parseFutureDate(req.body?.fcExpiryDate, 'FC expiry date')
    const driver = await prisma.driver.update({
      where: { id: req.params.id },
      data: { age, drivingLicenceExpiryDate, vehicleInsuranceExpiryDate, fcExpiryDate, complianceNoticeSentAt: null },
      select: { id: true, age: true, drivingLicenceExpiryDate: true, vehicleInsuranceExpiryDate: true, fcExpiryDate: true, status: true }
    })
    res.json({ driver, message: 'Driver document dates updated. Review the documents and approve the driver to restore ride access.' })
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Driver not found.' })
    next(error)
  }
})

router.patch('/admin/:id/status', requireAdmin, async (req, res, next) => {
  try {
    const status = String(req.body?.status || '').toUpperCase()
    if (!['APPROVED', 'REJECTED', 'PENDING'].includes(status)) return res.status(400).json({ message: 'Invalid driver status.' })
    const existing = await prisma.driver.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ message: 'Driver not found.' })
    if (status === 'APPROVED') {
      if (!existing.age || !existing.drivingLicenceExpiryDate || !existing.vehicleInsuranceExpiryDate || !existing.fcExpiryDate) return res.status(400).json({ message: 'Complete the driver profile and all required document details before approval.' })
      const expired = expiredDriverDocuments(existing)
      if (expired.length) return res.status(400).json({ message: `Cannot approve this driver. Expired documents: ${expired.join(', ')}.` })
    }
    const driver = await prisma.driver.update({ where: { id: req.params.id }, data: { status, isOnline: false, ...(status === 'APPROVED' ? { complianceNoticeSentAt: null } : {}) }, select: { id: true, name: true, phone: true, vehicleNumber: true, serviceArea: true, status: true, isOnline: true } })
    if (existing.isOnline) await prisma.driverActivity.create({ data: { driverId: driver.id, eventType: 'OFFLINE', description: 'Driver was taken offline by Super Admin.' } })
    res.json({ driver, message: 'Driver status updated.' })
  } catch (error) { if (error.code === 'P2025') return res.status(404).json({ message: 'Driver not found.' }); next(error) }
})

export default router
