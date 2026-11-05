import { Router } from 'express'
import jwt from 'jsonwebtoken'
import multer from 'multer'
import path from 'node:path'
import fs from 'node:fs'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { prisma } from '../lib/prisma.js'
import { requireAdmin } from '../middleware/requireAdmin.js'
import { notify } from '../lib/notifications.js'
import { validateImageUpload } from '../lib/validateImageUpload.js'

const router = Router()
const currentDir = path.dirname(fileURLToPath(import.meta.url))
const uploadDir = path.resolve(currentDir, '../../uploads/subscriptions')
fs.mkdirSync(uploadDir, { recursive: true })
const upload = multer({ storage: multer.diskStorage({ destination: (_req, _file, cb) => cb(null, uploadDir), filename: (_req, file, cb) => cb(null, randomUUID() + path.extname(file.originalname).toLowerCase()) }), limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (_req, file, cb) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) return cb(new Error('Upload a JPG, PNG or WEBP image.'))
    cb(null, true)
  } })
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
function handleUpload(req, res, next) { upload.single('proof')(req, res, error => { if (error) return res.status(400).json({ message: error.message || 'Payment proof upload failed.' }); validateImageUpload(req, res, next) }) }
function privatePaymentProofUrl(payment) {
  return payment?.proofUrl ? `/api/subscriptions/payments/${payment.id}/proof` : null
}

async function sendPaymentProof(req, res, next, adminAccess = false) {
  try {
    const payment = await prisma.driverSubscriptionPayment.findUnique({
      where: { id: req.params.id },
      select: { id: true, driverId: true, proofUrl: true }
    })
    if (!payment?.proofUrl) return res.sendStatus(404)
    if (!adminAccess && payment.driverId !== req.driverAuth.sub) return res.sendStatus(404)
    const filename = path.basename(payment.proofUrl)
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:jpe?g|png|webp)$/i.test(filename)) return res.sendStatus(404)
    res.set({ 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' })
    res.sendFile(filename, { root: uploadDir }, error => {
      if (!error || res.headersSent) return
      if (error.code === 'ENOENT') return res.sendStatus(404)
      next(error)
    })
  } catch (error) { next(error) }
}


router.get('/plans', requireDriver, async (_req, res, next) => { try { res.json({ plans: await prisma.driverSubscriptionPlan.findMany({ where: { isActive: true }, orderBy: [{ durationDays: 'asc' }, { price: 'asc' }] }) }) } catch (error) { next(error) } })
router.get('/me', requireDriver, async (req, res, next) => {
  try {
    const now = new Date()
    const [subscription, payments, plans] = await Promise.all([
      prisma.driverSubscription.findFirst({ where: { driverId: req.driverAuth.sub, status: 'ACTIVE', startsAt: { lte: now }, expiresAt: { gt: now } }, orderBy: { expiresAt: 'desc' } }),
      prisma.driverSubscriptionPayment.findMany({ where: { driverId: req.driverAuth.sub }, orderBy: { createdAt: 'desc' }, take: 10, select: { id: true, planName: true, amount: true, paymentMethod: true, paymentReference: true, status: true, reviewNote: true, createdAt: true, reviewedAt: true, proofUrl: true } }),
      prisma.driverSubscriptionPlan.findMany({ where: { isActive: true }, orderBy: [{ durationDays: 'asc' }, { price: 'asc' }] })
    ])
    res.json({ subscription, payments: payments.map(payment => ({ ...payment, proofUrl: privatePaymentProofUrl(payment) })), plans, isSubscribed: Boolean(subscription) })
  } catch (error) { next(error) }
})
router.post('/payments', requireDriver, handleUpload, async (req, res, next) => {
  try {
    const planId = String(req.body?.planId || '').trim()
    const paymentMethod = String(req.body?.paymentMethod || '').toUpperCase()
    const paymentReference = String(req.body?.paymentReference || '').trim().slice(0, 120)
    if (!['UPI', 'CASH'].includes(paymentMethod)) return res.status(400).json({ message: 'Choose UPI or cash payment.' })
    if (paymentMethod === 'UPI' && paymentReference.length < 4) return res.status(400).json({ message: 'Enter the UPI transaction reference.' })
    const plan = await prisma.driverSubscriptionPlan.findFirst({ where: { id: planId, isActive: true } })
    if (!plan) return res.status(404).json({ message: 'This subscription plan is no longer available.' })
    const payment = await prisma.$transaction(async tx => {
      // Serialize submissions per driver so concurrent requests cannot create duplicate pending payments.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${req.driverAuth.sub}, 1))::text`
      const pendingCount = await tx.driverSubscriptionPayment.count({ where: { driverId: req.driverAuth.sub, status: 'PENDING' } })
      if (pendingCount) return null
      return tx.driverSubscriptionPayment.create({ data: { driverId: req.driverAuth.sub, planId: plan.id, planName: plan.name, durationDays: plan.durationDays, amount: plan.price, paymentMethod, paymentReference: paymentReference || null, proofUrl: req.file ? '/uploads/subscriptions/' + req.file.filename : null } })
    })
    if (!payment) return res.status(409).json({ message: 'You already have a subscription payment awaiting Super Admin review.' })
    await notify({ role: 'ADMIN', type: 'SUBSCRIPTION_PAYMENT', title: 'Driver subscription payment received', message: 'A driver submitted a ' + paymentMethod.toLowerCase() + ' subscription payment request for ' + plan.name + ' (₹' + plan.price + ').' })
    res.status(201).json({ payment: { ...payment, proofUrl: privatePaymentProofUrl(payment) }, message: 'Subscription payment request submitted. Your plan will activate after Super Admin confirmation.' })
  } catch (error) { next(error) }
})
router.get('/admin/plans', requireAdmin, async (_req, res, next) => { try { res.json({ plans: await prisma.driverSubscriptionPlan.findMany({ orderBy: [{ isActive: 'desc' }, { durationDays: 'asc' }] }) }) } catch (error) { next(error) } })
router.post('/admin/plans', requireAdmin, async (req, res, next) => {
  try {
    const name = String(req.body?.name || '').trim().slice(0, 80), description = String(req.body?.description || '').trim().slice(0, 300)
    const durationDays = Number(req.body?.durationDays), price = Number(req.body?.price)
    if (name.length < 2 || !Number.isInteger(durationDays) || durationDays < 1 || durationDays > 730 || !Number.isInteger(price) || price < 0 || price > 100000) return res.status(400).json({ message: 'Enter a valid plan name, duration (1–730 days) and price.' })
    const plan = await prisma.driverSubscriptionPlan.create({ data: { name, description: description || null, durationDays, price, isActive: req.body?.isActive !== false } })
    res.status(201).json({ plan, message: 'Subscription plan created.' })
  } catch (error) { next(error) }
})
router.patch('/admin/plans/:id', requireAdmin, async (req, res, next) => {
  try {
    const existing = await prisma.driverSubscriptionPlan.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ message: 'Subscription plan not found.' })
    const name = String(req.body?.name ?? existing.name).trim().slice(0, 80), description = String(req.body?.description ?? existing.description ?? '').trim().slice(0, 300)
    const durationDays = Number(req.body?.durationDays ?? existing.durationDays), price = Number(req.body?.price ?? existing.price)
    if (name.length < 2 || !Number.isInteger(durationDays) || durationDays < 1 || durationDays > 730 || !Number.isInteger(price) || price < 0 || price > 100000) return res.status(400).json({ message: 'Enter a valid plan name, duration and price.' })
    const plan = await prisma.driverSubscriptionPlan.update({ where: { id: existing.id }, data: { name, description: description || null, durationDays, price, isActive: typeof req.body?.isActive === 'boolean' ? req.body.isActive : existing.isActive } })
    res.json({ plan, message: 'Subscription plan updated.' })
  } catch (error) { next(error) }
})
router.get('/admin/subscriptions', requireAdmin, async (req, res, next) => {
  try {
    const status = String(req.query.status || 'ACTIVE').toUpperCase()
    const now = new Date()
    let where = {}
    if (status === 'ACTIVE') where = { status: 'ACTIVE', startsAt: { lte: now }, expiresAt: { gt: now } }
    else if (status === 'EXPIRED') where = { OR: [{ status: 'EXPIRED' }, { expiresAt: { lte: now } }] }
    else if (status !== 'ALL') return res.status(400).json({ message: 'Choose ACTIVE, EXPIRED or ALL subscriptions.' })
    const records = await prisma.driverSubscription.findMany({
      where,
      include: {
        driver: { select: { id: true, name: true, phone: true, vehicleNumber: true, status: true } },
        payment: { select: { id: true, paymentMethod: true, paymentReference: true, reviewedAt: true, createdAt: true } }
      },
      orderBy: [{ expiresAt: 'desc' }, { createdAt: 'desc' }],
      take: 500
    })
    res.json({ subscriptions: records })
  } catch (error) { next(error) }
})

router.get('/admin/payments', requireAdmin, async (req, res, next) => {
  try {
    const status = String(req.query.status || '').toUpperCase()
    const where = ['PENDING', 'APPROVED', 'REJECTED'].includes(status) ? { status } : {}
    const payments = await prisma.driverSubscriptionPayment.findMany({
      where,
      include: { driver: { select: { id: true, name: true, phone: true, vehicleNumber: true } }, plan: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200
    })
    res.json({ payments: payments.map(payment => ({ ...payment, proofUrl: privatePaymentProofUrl(payment) })) })
  } catch (error) { next(error) }
})

router.get('/payments/:id/proof', requireDriver, (req, res, next) => sendPaymentProof(req, res, next))
router.get('/admin/payments/:id/proof', requireAdmin, (req, res, next) => sendPaymentProof(req, res, next, true))
router.patch('/admin/payments/:id', requireAdmin, async (req, res, next) => {
  try {
    const decision = String(req.body?.status || '').toUpperCase(), reviewNote = String(req.body?.reviewNote || '').trim().slice(0, 500)
    if (!['APPROVED', 'REJECTED'].includes(decision)) return res.status(400).json({ message: 'Choose approve or reject.' })
    if (decision === 'REJECTED' && reviewNote.length < 5) return res.status(400).json({ message: 'Enter a reason for rejecting this payment.' })
    const result = await prisma.$transaction(async tx => {
      const payment = await tx.driverSubscriptionPayment.findUnique({ where: { id: req.params.id } })
      if (!payment) throw Object.assign(new Error('Payment request not found.'), { statusCode: 404 })
      if (payment.status !== 'PENDING') throw Object.assign(new Error('This payment request has already been reviewed.'), { statusCode: 409 })
      const reviewedAt = new Date()
      const reviewUpdate = await tx.driverSubscriptionPayment.updateMany({
        where: { id: payment.id, status: 'PENDING' },
        data: { status: decision, reviewNote: reviewNote || null, reviewedAt, reviewedBy: req.admin.sub }
      })
      if (reviewUpdate.count !== 1) throw Object.assign(new Error('This payment request has already been reviewed.'), { statusCode: 409 })
      if (decision === 'APPROVED') {
        const current = await tx.driverSubscription.findFirst({ where: { driverId: payment.driverId, status: 'ACTIVE', expiresAt: { gt: reviewedAt } }, orderBy: { expiresAt: 'desc' } })
        const startsAt = current?.expiresAt && current.expiresAt > reviewedAt ? current.expiresAt : reviewedAt
        const expiresAt = new Date(startsAt.getTime() + payment.durationDays * 86400000)
        await tx.driverSubscription.create({ data: { driverId: payment.driverId, paymentId: payment.id, planName: payment.planName, amount: payment.amount, startsAt, expiresAt } })
      }
      return payment
    })
    await notify({ role: 'DRIVER', recipientId: result.driverId, type: decision === 'APPROVED' ? 'SUBSCRIPTION_APPROVED' : 'SUBSCRIPTION_REJECTED', title: decision === 'APPROVED' ? 'Subscription activated' : 'Subscription payment needs attention', message: decision === 'APPROVED' ? 'Your 2WAYZ subscription has been approved and activated.' : 'Your subscription payment was rejected. ' + reviewNote })
    res.json({ message: decision === 'APPROVED' ? 'Payment approved and subscription activated.' : 'Payment rejected. The driver has been notified.' })
  } catch (error) { if (error.statusCode) return res.status(error.statusCode).json({ message: error.message }); next(error) }
})

export default router