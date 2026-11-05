import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma.js'
import { requireAdmin } from '../middleware/requireAdmin.js'

const router = Router()

async function roleAuth(req, res, next) {
  const requestedRole = String(req.query.role || '').toUpperCase()
  const candidates = requestedRole === 'DRIVER'
    ? [['twoWayzDriver', 'DRIVER']]
    : requestedRole === 'PASSENGER'
      ? [['twoWayzPassenger', 'PASSENGER']]
      : [['twoWayzPassenger', 'PASSENGER'], ['twoWayzDriver', 'DRIVER']]
  let matched = null
  for (const [cookie, role] of candidates) {
    const token = req.cookies?.[cookie]
    if (!token) continue
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET)
      if (payload.role === role) { matched = { role, id: payload.sub }; break }
    } catch {}
  }
  if (!matched) return res.status(401).json({ message: 'Please sign in to view notifications.' })
  try {
    const account = matched.role === 'PASSENGER'
      ? await prisma.passengerUser.findUnique({ where: { id: matched.id }, select: { id: true, isActive: true } })
      : await prisma.driver.findUnique({ where: { id: matched.id }, select: { id: true } })
    if (!account || (matched.role === 'PASSENGER' && !account.isActive)) return res.status(401).json({ message: 'This account is no longer available.' })
    req.notificationAuth = matched
    next()
  } catch (error) { next(error) }
}

router.get('/me', roleAuth, async (req, res, next) => {
  try {
    const where = { recipientRole: req.notificationAuth.role, recipientId: req.notificationAuth.id }
    // Remove previously read notifications so the driver's inbox only retains unread items.
    await prisma.notification.deleteMany({ where: { ...where, readAt: { not: null } } })
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

router.delete('/me/:id', roleAuth, async (req, res, next) => {
  try {
    const result = await prisma.notification.deleteMany({
      where: {
        id: req.params.id,
        recipientRole: req.notificationAuth.role,
        recipientId: req.notificationAuth.id,
        readAt: { not: null }
      }
    })
    if (!result.count) return res.status(404).json({ message: 'Read notification not found.' })
    res.json({ message: 'Read notification deleted.' })
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
