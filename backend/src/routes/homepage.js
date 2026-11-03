import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { requireAdmin } from '../middleware/requireAdmin.js'

const router = Router()

router.get('/public', async (req, res, next) => {
  try {
    const sections = await prisma.homePageSection.findMany({ where: { isPublished: true }, orderBy: { sortOrder: 'asc' }, select: { slug: true, title: true, content: true, sortOrder: true } })
    res.json({ sections })
  } catch (error) { next(error) }
})

router.get('/admin', requireAdmin, async (req, res, next) => {
  try {
    const sections = await prisma.homePageSection.findMany({ orderBy: { sortOrder: 'asc' } })
    res.json({ sections })
  } catch (error) { next(error) }
})

router.put('/admin/:slug', requireAdmin, async (req, res, next) => {
  try {
    const { title, content, isPublished, sortOrder } = req.body || {}
    if (!title || typeof title !== 'string' || !content || typeof content !== 'object' || Array.isArray(content)) {
      return res.status(400).json({ message: 'A section title and valid JSON object content are required.' })
    }
    const section = await prisma.homePageSection.update({
      where: { slug: req.params.slug },
      data: {
        title: title.trim(),
        content,
        ...(typeof isPublished === 'boolean' ? { isPublished } : {}),
        ...(Number.isInteger(sortOrder) ? { sortOrder } : {})
      }
    })
    res.json({ section, message: 'Section saved successfully.' })
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Homepage section not found.' })
    next(error)
  }
})

export default router