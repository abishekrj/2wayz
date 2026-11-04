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
async function getWallet(driverId) {
  return prisma.driverWallet.upsert({ where: { driverId }, create: { driverId }, update: {} })
}
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
    res.json({ wallet, settings: settings ? { commissionMode: settings.commissionMode, commissionValue: settings.commissionValue, minimumBalance: settings.minimumBalance, isActive: settings.isActive } : null, outstandingCommission: outstanding, totalCommissionDeducted: commissionTotal._sum.settledAmount || 0, transactions, recharges })
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
      const balanceAfter = type === 'WALLET_CREDIT' ? wallet.balance + amount : wallet.balance - amount
      if (balanceAfter < 0) throw Object.assign(new Error('The driver wallet does not have enough balance for this debit.'), { statusCode: 409 })
      const adjustment = await tx.bookingAdjustment.create({
        data: { bookingId: booking.id, driverId: booking.driverId, type, amount, reason, createdBy: req.admin.sub || req.admin.id || 'SUPER_ADMIN' }
      })
      await tx.driverWallet.update({ where: { id: wallet.id }, data: { balance: balanceAfter } })
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
    res.json({ recharges })
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
