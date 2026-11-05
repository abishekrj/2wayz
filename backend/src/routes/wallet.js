import { Router } from 'express'
import jwt from 'jsonwebtoken'
import multer from 'multer'
import path from 'node:path'
import fs from 'node:fs'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { prisma } from '../lib/prisma.js'
import { requireAdmin } from '../middleware/requireAdmin.js'

const router = Router()
const currentDir = path.dirname(fileURLToPath(import.meta.url))
const uploadDir = path.resolve(currentDir, '../../uploads/wallet')
fs.mkdirSync(uploadDir, { recursive: true })
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => cb(null, randomUUID() + path.extname(file.originalname).toLowerCase())
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype))
})
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

function privateProofUrl(recharge) {
  return recharge.proofUrl ? `/api/wallet/recharges/${encodeURIComponent(recharge.id)}/proof` : null
}

async function sendRechargeProof(req, res, next) {
  try {
    const recharge = await prisma.walletRecharge.findUnique({ where: { id: req.params.id }, select: { id: true, driverId: true, proofUrl: true } })
    if (!recharge?.proofUrl) return res.status(404).json({ message: 'Payment proof not found.' })

    const adminToken = req.cookies?.twoWayzAdmin
    let isAdmin = false
    if (adminToken) {
      try {
        const payload = jwt.verify(adminToken, process.env.JWT_SECRET)
        isAdmin = payload.role === 'SUPER_ADMIN'
      } catch {}
    }

    if (!isAdmin) {
      const driverToken = req.cookies?.twoWayzDriver
      if (!driverToken) return res.status(401).json({ message: 'Please sign in to view this payment proof.' })
      let payload
      try { payload = jwt.verify(driverToken, process.env.JWT_SECRET) }
      catch { return res.status(401).json({ message: 'Your driver session has expired.' }) }
      if (payload.role !== 'DRIVER') return res.status(403).json({ message: 'Access denied.' })
      if (payload.sub !== recharge.driverId) return res.status(403).json({ message: 'You cannot view another driver’s payment proof.' })
    }

    const filename = path.basename(recharge.proofUrl)
    if (!/^[0-9a-f-]{36}\\.(?:jpe?g|png|webp)$/i.test(filename)) return res.status(404).json({ message: 'Payment proof not found.' })
    const filePath = path.resolve(uploadDir, filename)
    if (!filePath.startsWith(uploadDir + path.sep)) return res.sendStatus(404)
    res.set({ 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' })
    return res.sendFile(filePath, error => { if (error && !res.headersSent) next(error) })
  } catch (error) { next(error) }
}

router.get('/recharges/:id/proof', sendRechargeProof)

async function getWallet(driverId) {
  return prisma.driverWallet.upsert({ where: { driverId }, create: { driverId }, update: {} })
}

router.get('/daily-earnings', requireDriver, async (req, res, next) => {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
    const part = type => parts.find(item => item.type === type)?.value || ''
    const date = part('year') + '-' + part('month') + '-' + part('day')
    const [year, month, day] = date.split('-').map(Number)
    const start = new Date(Date.UTC(year, month - 1, day) - 330 * 60 * 1000)
    const range = { gte: start, lt: new Date(start.getTime() + 24 * 60 * 60 * 1000) }
    const bookings = await prisma.booking.findMany({
      where: { driverId: req.driverAuth.sub, status: 'COMPLETED', completedAt: range },
      select: { id: true, reference: true, pickupName: true, destinationName: true, finalFare: true, estimatedFare: true, completedAt: true },
      orderBy: { completedAt: 'desc' }
    })
    const commissions = bookings.length ? await prisma.walletTransaction.findMany({
      where: { type: 'COMMISSION', bookingId: { in: bookings.map(item => item.id) } },
      select: { bookingId: true, amount: true, settledAmount: true }
    }) : []
    const commissionByBooking = new Map(commissions.map(item => [item.bookingId, item]))
    const rides = bookings.map(booking => {
      const fare = Number(booking.finalFare ?? booking.estimatedFare ?? 0)
      const commission = commissionByBooking.get(booking.id)
      const commissionAmount = Number(commission?.amount || 0)
      const settled = Number(commission?.settledAmount || 0)
      return {
        reference: booking.reference, pickupName: booking.pickupName, destinationName: booking.destinationName,
        fare, commission: commissionAmount, commissionSettled: settled,
        commissionDue: Math.max(0, commissionAmount - settled), netEarnings: fare - commissionAmount,
        completedAt: booking.completedAt
      }
    })
    const total = key => rides.reduce((sum, ride) => sum + Number(ride[key] || 0), 0)
    res.json({
      date, summary: {
        completedRides: rides.length, totalFare: total('fare'), commission: total('commission'),
        commissionSettled: total('commissionSettled'), commissionDue: total('commissionDue'),
        netEarnings: total('netEarnings')
      }, rides
    })
  } catch (error) { next(error) }
})

router.get('/me', requireDriver, async (req, res, next) => {
  try {
    const [wallet, settings, transactions, recharges, due, commissionTotal] = await Promise.all([
      getWallet(req.driverAuth.sub),
      prisma.walletSettings.findUnique({ where: { id: 'default' } }),
      prisma.walletTransaction.findMany({ where: { wallet: { is: { driverId: req.driverAuth.sub } } }, orderBy: { createdAt: 'desc' }, take: 30 }),
      prisma.walletRecharge.findMany({ where: { driverId: req.driverAuth.sub }, orderBy: { createdAt: 'desc' }, take: 15 }),
      prisma.walletTransaction.aggregate({ where: { wallet: { is: { driverId: req.driverAuth.sub } }, type: 'COMMISSION', status: 'DUE' }, _sum: { amount: true, settledAmount: true } }),
      prisma.walletTransaction.aggregate({ where: { wallet: { is: { driverId: req.driverAuth.sub } }, type: 'COMMISSION' }, _sum: { settledAmount: true } })
    ])
    const outstanding = Math.max(0, (due._sum.amount || 0) - (due._sum.settledAmount || 0))
    res.json({ wallet, settings: settings ? { commissionMode: settings.commissionMode, commissionValue: settings.commissionValue, minimumBalance: settings.minimumBalance, isActive: settings.isActive } : null, outstandingCommission: outstanding, totalCommissionDeducted: commissionTotal._sum.settledAmount || 0, transactions, recharges: recharges.map(item => ({ ...item, proofUrl: privateProofUrl(item) })) })
  } catch (error) { next(error) }
})
router.post('/recharges', requireDriver, upload.single('proof'), async (req, res, next) => {
  try {
    const amount = Number(req.body?.amount)
    const paymentReference = String(req.body?.paymentReference || '').trim()
    if (!Number.isInteger(amount) || amount < 50 || amount > 50000) return res.status(400).json({ message: 'Recharge amount must be between ₹50 and ₹50,000.' })
    if (paymentReference.length < 4 || paymentReference.length > 100) return res.status(400).json({ message: 'Enter a valid UPI/payment reference number.' })
    const pending = await prisma.walletRecharge.count({ where: { driverId: req.driverAuth.sub, status: 'PENDING' } })
    if (pending >= 5) return res.status(429).json({ message: 'You already have several pending recharge requests. Please wait for review.' })
    const recharge = await prisma.walletRecharge.create({ data: { driverId: req.driverAuth.sub, amount, paymentReference, proofUrl: req.file ? '/uploads/wallet/' + req.file.filename : null } })
    res.status(201).json({ recharge, message: 'Recharge request submitted for Super Admin review.' })
  } catch (error) { next(error) }
})
router.get('/admin/settings', requireAdmin, async (_req, res, next) => {
  try { res.json({ settings: await prisma.walletSettings.findUnique({ where: { id: 'default' } }) }) }
  catch (error) { next(error) }
})
router.put('/admin/settings', requireAdmin, async (req, res, next) => {
  try {
    const commissionMode = String(req.body?.commissionMode || '').toUpperCase()
    const commissionValue = Number(req.body?.commissionValue)
    const minimumBalance = Number(req.body?.minimumBalance)
    if (!['PERCENTAGE', 'FIXED'].includes(commissionMode)) return res.status(400).json({ message: 'Choose percentage or fixed commission.' })
    if (!Number.isFinite(commissionValue) || commissionValue < 0 || (commissionMode === 'PERCENTAGE' && commissionValue > 100) || (commissionMode === 'FIXED' && (!Number.isInteger(commissionValue) || commissionValue > 10000))) return res.status(400).json({ message: 'Enter a valid commission value.' })
    if (!Number.isInteger(minimumBalance) || minimumBalance < 0 || minimumBalance > 50000) return res.status(400).json({ message: 'Enter a valid minimum wallet balance.' })
    const settings = await prisma.walletSettings.upsert({ where: { id: 'default' }, create: { id: 'default', commissionMode, commissionValue, minimumBalance, isActive: true }, update: { commissionMode, commissionValue, minimumBalance, isActive: true } })
    res.json({ settings, message: 'Wallet settings saved and activated.' })
  } catch (error) { next(error) }
})
router.get('/admin/drivers', requireAdmin, async (req, res, next) => {
  try {
    const search = String(req.query.search || '').trim()
    const drivers = await prisma.driver.findMany({
      where: search ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { phone: { contains: search } }, { vehicleNumber: { contains: search, mode: 'insensitive' } }] } : {},
      orderBy: { name: 'asc' }, select: { id: true, name: true, phone: true, vehicleNumber: true, status: true, wallet: { select: { balance: true } } }
    })
    const wallets = await Promise.all(drivers.map(async driver => {
      const due = await prisma.walletTransaction.aggregate({ where: { wallet: { is: { driverId: driver.id } }, type: 'COMMISSION', status: 'DUE' }, _sum: { amount: true, settledAmount: true } })
      return { ...driver, balance: driver.wallet?.balance || 0, outstandingCommission: Math.max(0, (due._sum.amount || 0) - (due._sum.settledAmount || 0)) }
    }))
    res.json({ drivers: wallets })
  } catch (error) { next(error) }
})
router.post('/admin/adjustments', requireAdmin, async (req, res, next) => {
  try {
    const bookingId = String(req.body?.bookingId || '').trim()
    const type = String(req.body?.type || '').toUpperCase()
    const amount = Number(req.body?.amount)
    const reason = String(req.body?.reason || '').trim().slice(0, 500)
    if (!bookingId) return res.status(400).json({ message: 'Choose a booking.' })
    if (!['WALLET_CREDIT', 'WALLET_DEBIT'].includes(type)) return res.status(400).json({ message: 'Choose wallet credit or wallet debit.' })
    if (!Number.isInteger(amount) || amount < 1 || amount > 50000) return res.status(400).json({ message: 'Adjustment amount must be between ₹1 and ₹50,000.' })
    if (reason.length < 5) return res.status(400).json({ message: 'Enter a reason of at least 5 characters for the audit record.' })
    const result = await prisma.$transaction(async tx => {
      const booking = await tx.booking.findUnique({ where: { id: bookingId }, select: { id: true, reference: true, status: true, driverId: true } })
      if (!booking || !['CANCELLED', 'CANCELED'].includes(booking.status)) {
        throw Object.assign(new Error('Financial adjustments can only be recorded against a cancelled booking.'), { statusCode: 409 })
      }
      if (!booking.driverId) throw Object.assign(new Error('This booking has no assigned driver, so a driver wallet adjustment cannot be applied.'), { statusCode: 409 })
      const wallet = await tx.driverWallet.upsert({ where: { driverId: booking.driverId }, create: { driverId: booking.driverId }, update: {} })
      if (type === 'WALLET_DEBIT') {
        const debited = await tx.driverWallet.updateMany({
          where: { id: wallet.id, balance: { gte: amount } },
          data: { balance: { decrement: amount } }
        })
        if (debited.count !== 1) throw Object.assign(new Error('The driver wallet does not have enough balance for this debit.'), { statusCode: 409 })
      } else {
        await tx.driverWallet.update({ where: { id: wallet.id }, data: { balance: { increment: amount } } })
      }
      const updatedWallet = await tx.driverWallet.findUnique({ where: { id: wallet.id }, select: { balance: true } })
      const balanceAfter = updatedWallet.balance
      const adjustment = await tx.bookingAdjustment.create({
        data: { bookingId: booking.id, driverId: booking.driverId, type, amount, reason, createdBy: req.admin.sub || req.admin.id || 'SUPER_ADMIN' }
      })
      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: type === 'WALLET_CREDIT' ? 'ADJUSTMENT_CREDIT' : 'ADJUSTMENT_DEBIT',
          amount,
          settledAmount: 0,
          status: 'POSTED',
          description: (type === 'WALLET_CREDIT' ? 'Admin wallet credit' : 'Admin wallet debit') + ' for cancelled booking ' + booking.reference + ': ' + reason,
          balanceAfter,
          adjustmentId: adjustment.id
        }
      })
      return { adjustment, transaction, balanceAfter, bookingReference: booking.reference }
    })
    res.status(201).json({ ...result, message: type === 'WALLET_CREDIT' ? 'Wallet credit recorded and applied.' : 'Wallet debit recorded and applied.' })
  } catch (error) { if (error.statusCode) return res.status(error.statusCode).json({ message: error.message }); next(error) }
})

router.get('/admin/recharges', requireAdmin, async (req, res, next) => {
  try {
    const status = ['PENDING', 'APPROVED', 'REJECTED'].includes(String(req.query.status || '').toUpperCase()) ? String(req.query.status).toUpperCase() : undefined
    const recharges = await prisma.walletRecharge.findMany({ where: status ? { status } : {}, include: { driver: { select: { id: true, name: true, phone: true, vehicleNumber: true } } }, orderBy: { createdAt: 'desc' }, take: 200 })
    res.json({ recharges: recharges.map(item => ({ ...item, proofUrl: privateProofUrl(item) })) })
  } catch (error) { next(error) }
})
router.patch('/admin/recharges/:id', requireAdmin, async (req, res, next) => {
  try {
    const decision = String(req.body?.status || '').toUpperCase()
    if (!['APPROVED', 'REJECTED'].includes(decision)) return res.status(400).json({ message: 'Choose approve or reject.' })
    const result = await prisma.$transaction(async tx => {
      const recharge = await tx.walletRecharge.findUnique({ where: { id: req.params.id } })
      if (!recharge || recharge.status !== 'PENDING') throw Object.assign(new Error('This recharge request has already been reviewed or does not exist.'), { statusCode: 409 })
      const changed = await tx.walletRecharge.updateMany({ where: { id: recharge.id, status: 'PENDING' }, data: { status: decision, reviewedAt: new Date(), reviewedBy: req.admin.sub || req.admin.id || 'SUPER_ADMIN' } })
      if (changed.count !== 1) throw Object.assign(new Error('This recharge request was reviewed elsewhere.'), { statusCode: 409 })
      if (decision === 'REJECTED') return { recharge: { ...recharge, status: decision }, credited: 0 }
      const wallet = await tx.driverWallet.upsert({ where: { driverId: recharge.driverId }, create: { driverId: recharge.driverId }, update: {} })
      const dueRows = await tx.walletTransaction.findMany({ where: { walletId: wallet.id, type: 'COMMISSION', status: 'DUE' }, orderBy: { createdAt: 'asc' } })
      let remaining = recharge.amount
      let settled = 0
      for (const row of dueRows) {
        const due = Math.max(0, row.amount - row.settledAmount)
        const apply = Math.min(remaining, due)
        if (apply > 0) {
          const newSettled = row.settledAmount + apply
          await tx.walletTransaction.update({ where: { id: row.id }, data: { settledAmount: newSettled, status: newSettled >= row.amount ? 'POSTED' : 'DUE' } })
          remaining -= apply
          settled += apply
        }
        if (remaining === 0) break
      }
      const balanceAfter = wallet.balance + remaining
      await tx.driverWallet.update({ where: { id: wallet.id }, data: { balance: balanceAfter } })
      await tx.walletTransaction.create({ data: { walletId: wallet.id, type: 'RECHARGE', amount: recharge.amount, settledAmount: settled, description: 'Manual recharge approved', rechargeId: recharge.id, balanceAfter } })
      return { recharge: { ...recharge, status: decision }, credited: remaining, settled }
    })
    res.json({ ...result, message: decision === 'APPROVED' ? 'Recharge approved. Outstanding commission was settled first and the remaining amount was credited.' : 'Recharge request rejected.' })
  } catch (error) { if (error.statusCode) return res.status(error.statusCode).json({ message: error.message }); next(error) }
})
export default router
