import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { requireAdmin } from '../middleware/requireAdmin.js'

const router = Router()

router.get('/admin', requireAdmin, async (req, res, next) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1)
    const pageSize = 30
    const search = String(req.query.search || '').trim().slice(0, 100)
    const stars = Number(req.query.stars)
    const visible = ['true', 'false'].includes(String(req.query.visible)) ? String(req.query.visible) === 'true' : undefined
    const where = {
      ...(Number.isInteger(stars) && stars >= 1 && stars <= 5 ? { stars } : {}),
      ...(visible === undefined ? {} : { isVisible: visible }),
      ...(search ? { OR: [
        { comment: { contains: search, mode: 'insensitive' } },
        { booking: { reference: { contains: search, mode: 'insensitive' } } },
        { passenger: { name: { contains: search, mode: 'insensitive' } } },
        { passenger: { phone: { contains: search } } },
        { driver: { name: { contains: search, mode: 'insensitive' } } },
        { driver: { phone: { contains: search } } }
      ] } : {})
    }
    const [total, ratings, hiddenCount] = await Promise.all([
      prisma.rating.count({ where }),
      prisma.rating.findMany({
        where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize,
        select: { id: true, stars: true, tags: true, comment: true, isVisible: true, moderationNote: true, hiddenAt: true, createdAt: true,
          passenger: { select: { name: true, phone: true } },
          driver: { select: { name: true, phone: true, vehicleNumber: true } },
          booking: { select: { reference: true, completedAt: true } }
        }
      }),
      prisma.rating.count({ where: { isVisible: false } })
    ])
    res.json({ ratings, hiddenCount, pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) } })
  } catch (error) { next(error) }
})

router.patch('/admin/:id/visibility', requireAdmin, async (req, res, next) => {
  try {
    const isVisible = req.body?.isVisible
    const moderationNote = String(req.body?.moderationNote || '').trim().slice(0, 500)
    if (typeof isVisible !== 'boolean') return res.status(400).json({ message: 'Choose whether this review should be visible.' })
    if (!isVisible && moderationNote.length < 5) return res.status(400).json({ message: 'Add a moderation reason of at least 5 characters.' })
    const existing = await prisma.rating.findUnique({ where: { id: req.params.id }, select: { id: true } })
    if (!existing) return res.status(404).json({ message: 'Review not found.' })
    const rating = await prisma.rating.update({
      where: { id: existing.id },
      data: { isVisible, moderationNote: isVisible ? null : moderationNote, hiddenAt: isVisible ? null : new Date() },
      select: { id: true, isVisible: true, moderationNote: true, hiddenAt: true }
    })
    res.json({ rating, message: isVisible ? 'Review is visible again.' : 'Review hidden from public display.' })
  } catch (error) { next(error) }
})

export default router
