import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { requireAdmin } from '../middleware/requireAdmin.js'

const router = Router()

router.get('/public', async (req, res, next) => {
  try {
    const pages = await prisma.cmsPage.findMany({ where: { isPublished: true }, orderBy: { sortOrder: 'asc' }, select: { slug: true, title: true, navLabel: true, footerLabel: true, content: true, sortOrder: true } })
    res.json({ pages })
  } catch (error) { next(error) }
})

router.get('/admin', requireAdmin, async (req, res, next) => {
  try { res.json({ pages: await prisma.cmsPage.findMany({ orderBy: { sortOrder: 'asc' } }) }) }
  catch (error) { next(error) }
})

router.put('/admin/:slug', requireAdmin, async (req, res, next) => {
  try {
    const { title, navLabel, footerLabel, content, isPublished, sortOrder } = req.body || {}
    if (![title, navLabel, footerLabel].every(value => typeof value === 'string' && value.trim()) || !content || typeof content !== 'object' || Array.isArray(content)) {
      return res.status(400).json({ message: 'Page title, menu labels and valid page content are required.' })
    }
    const page = await prisma.cmsPage.update({
      where: { slug: req.params.slug },
      data: { title: title.trim(), navLabel: navLabel.trim(), footerLabel: footerLabel.trim(), content, ...(typeof isPublished === 'boolean' ? { isPublished } : {}), ...(Number.isInteger(sortOrder) ? { sortOrder } : {}) }
    })
    res.json({ page, message: 'CMS page saved successfully.' })
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'CMS page not found.' })
    next(error)
  }
})

export default router
