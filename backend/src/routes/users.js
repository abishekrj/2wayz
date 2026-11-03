import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { rateLimit } from 'express-rate-limit'
import { prisma } from '../lib/prisma.js'
import { requireAdmin } from '../middleware/requireAdmin.js'

const router = Router()
const registrationLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false, message: { message: 'Too many registration attempts. Please try again later.' } })
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: 'draft-7', legacyHeaders: false, message: { message: 'Too many login attempts. Please try again later.' } })
const passengerCookieOptions = () => ({ httpOnly: true, secure: process.env.COOKIE_SECURE === 'true', sameSite: 'strict', path: '/', maxAge: 8 * 60 * 60 * 1000 })

router.post('/register', registrationLimiter, async (req, res, next) => {
  try {
    const name = String(req.body?.name || '').trim()
    const phone = String(req.body?.phone || '').replace(/\\D/g, '')
    const password = String(req.body?.password || '')
    if (name.length < 2 || name.length > 100) return res.status(400).json({ message: 'Enter a name between 2 and 100 characters.' })
    if (!/^\\d{10}$/.test(phone)) return res.status(400).json({ message: 'Enter a valid 10-digit mobile number.' })
    if (password.length < 8 || password.length > 128) return res.status(400).json({ message: 'Password must contain at least 8 characters.' })
    const passwordHash = await bcrypt.hash(password, 12)
    const user = await prisma.passengerUser.create({ data: { name, phone, passwordHash }, select: { id: true, name: true, phone: true, createdAt: true } })
    return res.status(201).json({ user, message: 'Your 2WAYZ account has been created.' })
  } catch (error) {
    if (error.code === 'P2002') return res.status(409).json({ message: 'This mobile number is already registered.' })
    next(error)
  }
})

router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const phone = String(req.body?.phone || '').replace(/\\D/g, '')
    const password = String(req.body?.password || '')
    if (!/^\\d{10}$/.test(phone) || !password) return res.status(400).json({ message: 'Enter your 10-digit mobile number and password.' })
    const user = await prisma.passengerUser.findUnique({ where: { phone } })
    if (!user || !user.isActive || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ message: 'Invalid mobile number or password.' })
    }
    const token = jwt.sign({ sub: user.id, role: 'PASSENGER' }, process.env.JWT_SECRET, { expiresIn: '8h' })
    res.cookie('twoWayzPassenger', token, passengerCookieOptions())
    return res.json({ user: { id: user.id, name: user.name, phone: user.phone } })
  } catch (error) { next(error) }
})

router.get('/me', async (req, res, next) => {
  try {
    const token = req.cookies?.twoWayzPassenger
    if (!token) return res.status(401).json({ message: 'Please log in.' })
    let payload
    try { payload = jwt.verify(token, process.env.JWT_SECRET) } catch { return res.status(401).json({ message: 'Your session has expired. Please log in again.' }) }
    if (payload.role !== 'PASSENGER') return res.status(401).json({ message: 'Invalid passenger session.' })
    const user = await prisma.passengerUser.findUnique({ where: { id: payload.sub }, select: { id: true, name: true, phone: true, isActive: true } })
    if (!user || !user.isActive) return res.status(401).json({ message: 'Passenger account is unavailable.' })
    return res.json({ user: { id: user.id, name: user.name, phone: user.phone } })
  } catch (error) { next(error) }
})

router.post('/logout', (req, res) => {
  res.clearCookie('twoWayzPassenger', { httpOnly: true, secure: process.env.COOKIE_SECURE === 'true', sameSite: 'strict', path: '/' })
  res.json({ message: 'Signed out.' })
})

router.get('/admin', requireAdmin, async (req, res, next) => {
  try {
    const search = String(req.query.search || '').trim().slice(0, 100)
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1)
    const pageSize = 20
    const where = search ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { phone: { contains: search } }] } : {}
    const [users, total] = await Promise.all([
      prisma.passengerUser.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize, select: { id: true, name: true, phone: true, isActive: true, createdAt: true } }),
      prisma.passengerUser.count({ where })
    ])
    res.json({ users, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } })
  } catch (error) { next(error) }
})

export default router