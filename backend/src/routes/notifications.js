import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma.js'
import { requireAdmin } from '../middleware/requireAdmin.js'

const router = Router()

function roleAuth(req, res, next) {
  const requestedRole = String(req.query.role || '').toUpperCase()
  const candidates = requestedRole === 'DRIVER'
    ? [['twoWayzDriver', 'DRIVER']]
    : requestedRole === 'PASSENGER'
      ? [['twoWayzPassenger', 'PASSENGER']]
      : [['twoWayzPassenger', 'PASSENGER'], ['twoWayzDriver', 'DRIVER']]
  for (const [cookie, role] of candidates) {
    const token = req.cookies?.[cookie]
    if (!token) continue
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET)
      if (payload.role === role) {
        req.notificationAuth = { role, id: payload.sub }
        return next()
      }
    } catch {}
  }
  return res.status(401).json({ message: 'Please sign in to view notifications.' })
}

router.get('/me', roleAuth, async (req, res, next) => {
  try {
    const where = { recipientRole: req.notificationAuth.role, recipientId: req.notificationAuth.id }
    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, take: 50 }),
      prisma.notification.count({ where: { ...where, readAt: null } })
    ])
    res.json({ notifications, unreadCount })
  } catch (error) { next(error) }
})

router.patch('/me/:id/read', roleAuth, async (req, res, next) => {
  try {
    const result = await prisma.notification.updateMany({
      where: { id: req.params.id, recipientRole: req.notificationAuth.role, recipientId: req.notificationAuth.id, readAt: null },
      data: { readAt: new Date() }
    })
    if (!result.count) return res.status(404).json({ message: 'Notification not found or already read.' })
    res.json({ message: 'Notification marked as read.' })
  } catch (error) { next(error) }
})

router.post('/me/read-all', roleAuth, async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { recipientRole: req.notificationAuth.role, recipientId: req.notificationAuth.id, readAt: null },
      data: { readAt: new Date() }
    })
    res.json({ message: 'All notifications marked as read.' })
  } catch (error) { next(error) }
})

router.get('/admin', requireAdmin, async (req, res, next) => {
  try {
    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({ where: { recipientRole: 'ADMIN', recipientId: null }, orderBy: { createdAt: 'desc' }, take: 100 }),
      prisma.notification.count({ where: { recipientRole: 'ADMIN', recipientId: null, readAt: null } })
    ])
    res.json({ notifications, unreadCount })
  } catch (error) { next(error) }
})

router.patch('/admin/:id/read', requireAdmin, async (req, res, next) => {
  try {
    const result = await prisma.notification.updateMany({
      where: { id: req.params.id, recipientRole: 'ADMIN', recipientId: null, readAt: null },
      data: { readAt: new Date() }
    })
    if (!result.count) return res.status(404).json({ message: 'Notification not found or already read.' })
    res.json({ message: 'Notification marked as read.' })
  } catch (error) { next(error) }
})

router.post('/admin/read-all', requireAdmin, async (_req, res, next) => {
  try {
    await prisma.notification.updateMany({ where: { recipientRole: 'ADMIN', recipientId: null, readAt: null }, data: { readAt: new Date() } })
    res.json({ message: 'All notifications marked as read.' })
  } catch (error) { next(error) }
})

export default router
