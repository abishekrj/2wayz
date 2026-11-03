import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { rateLimit } from 'express-rate-limit'
import { prisma } from '../lib/prisma.js'
import { requireAdmin } from '../middleware/requireAdmin.js'

const router = Router()
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: 'draft-7', legacyHeaders: false, message: { message: 'Too many login attempts. Please try again later.' } })
const cookieOptions = () => ({ httpOnly: true, secure: process.env.COOKIE_SECURE === 'true', sameSite: 'strict', path: '/', maxAge: 8 * 60 * 60 * 1000 })

router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase()
    const password = String(req.body?.password || '')
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required.' })
    const admin = await prisma.adminUser.findUnique({ where: { email } })
    if (!admin || !admin.isActive || !(await bcrypt.compare(password, admin.passwordHash))) {
      return res.status(401).json({ message: 'Invalid email or password.' })
    }
    const token = jwt.sign({ sub: admin.id, role: admin.role, email: admin.email }, process.env.JWT_SECRET, { expiresIn: '8h' })
    res.cookie('twoWayzAdmin', token, cookieOptions())
    return res.json({ admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role } })
  } catch (error) { next(error) }
})

router.post('/logout', (req, res) => {
  res.clearCookie('twoWayzAdmin', { httpOnly: true, secure: process.env.COOKIE_SECURE === 'true', sameSite: 'strict', path: '/' })
  res.json({ message: 'Signed out.' })
})

router.get('/me', requireAdmin, async (req, res, next) => {
  try {
    const admin = await prisma.adminUser.findUnique({ where: { id: req.admin.sub }, select: { id: true, name: true, email: true, role: true } })
    if (!admin) return res.status(401).json({ message: 'Administrator account not found.' })
    res.json({ admin })
  } catch (error) { next(error) }
})

export default router