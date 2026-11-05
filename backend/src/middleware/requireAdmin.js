import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma.js'

export async function requireAdmin(req, res, next) {
  const token = req.cookies?.twoWayzAdmin
  if (!token) return res.status(401).json({ message: 'Please sign in to continue.' })
  let payload
  try { payload = jwt.verify(token, process.env.JWT_SECRET) }
  catch { return res.status(401).json({ message: 'Your session has expired. Please sign in again.' }) }
  if (payload.role !== 'SUPER_ADMIN') return res.status(403).json({ message: 'Administrator access required.' })
  try {
    const admin = await prisma.adminUser.findUnique({ where: { id: payload.sub }, select: { id: true, role: true, isActive: true } })
    if (!admin || !admin.isActive || admin.role !== 'SUPER_ADMIN') return res.status(401).json({ message: 'Your administrator account is inactive. Please contact the system owner.' })
    req.admin = payload
    next()
  } catch (error) { next(error) }
}
