import { Router } from 'express'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import multer from 'multer'
import { prisma } from '../lib/prisma.js'
import { requireAdmin } from '../middleware/requireAdmin.js'

const router = Router()
const currentDir = path.dirname(fileURLToPath(import.meta.url))
const uploadDir = path.resolve(currentDir, '../../uploads')
const storage = multer.diskStorage({
  destination: async (req, file, callback) => {
    try { await mkdir(uploadDir, { recursive: true }); callback(null, uploadDir) }
    catch (error) { callback(error) }
  },
  filename: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase()
    callback(null, `homepage-${Date.now()}-${Math.round(Math.random()*1e9)}${extension}`)
  }
})
const imageUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    if (!['image/jpeg','image/png','image/webp','image/gif'].includes(file.mimetype)) return callback(new Error('Upload a JPG, PNG, WEBP or GIF image.'))
    callback(null, true)
  }
})

const defaultSocialLinks = { facebook: '', instagram: '', youtube: '', whatsapp: '', linkedin: '', x: '' }

router.get('/social-links/public', async (req, res, next) => {
  try {
    const section = await prisma.homePageSection.findUnique({ where: { slug: 'social-links' } })
    res.json({ links: section?.isPublished ? { ...defaultSocialLinks, ...(section.content?.links || {}) } : defaultSocialLinks })
  } catch (error) { next(error) }
})

router.get('/social-links/admin', requireAdmin, async (req, res, next) => {
  try {
    const section = await prisma.homePageSection.findUnique({ where: { slug: 'social-links' } })
    res.json({ links: { ...defaultSocialLinks, ...(section?.content?.links || {}) } })
  } catch (error) { next(error) }
})

router.put('/social-links/admin', requireAdmin, async (req, res, next) => {
  try {
    const incoming = req.body?.links
    if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) return res.status(400).json({ message: 'Social media URLs are required.' })
    const links = {}
    for (const key of Object.keys(defaultSocialLinks)) {
      const value = incoming[key] == null ? '' : String(incoming[key]).trim()
      if (value && (!/^https:\/\//i.test(value) || value.length > 500)) return res.status(400).json({ message: `Enter a valid HTTPS URL for ${key}.` })
      links[key] = value
    }
    const section = await prisma.homePageSection.upsert({
      where: { slug: 'social-links' },
      update: { title: 'Social Links', content: { links }, isPublished: true },
      create: { slug: 'social-links', title: 'Social Links', content: { links }, isPublished: true, sortOrder: 99 }
    })
    res.json({ links: section.content.links, message: 'Social links saved successfully.' })
  } catch (error) { next(error) }
})

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

router.post('/admin/upload', requireAdmin, (req, res, next) => {
  imageUpload.single('image')(req, res, error => {
    if (error) return res.status(400).json({ message: error.message || 'Image upload failed.' })
    if (!req.file) return res.status(400).json({ message: 'Choose an image to upload.' })
    res.status(201).json({ url: `/uploads/${req.file.filename}` })
  })
})

router.put('/admin/:slug', requireAdmin, async (req, res, next) => {
  try {
    const { title, content, isPublished, sortOrder } = req.body || {}
    if (!title || typeof title !== 'string' || !content || typeof content !== 'object' || Array.isArray(content)) {
      return res.status(400).json({ message: 'A section title and valid content object are required.' })
    }
    const section = await prisma.homePageSection.update({
      where: { slug: req.params.slug },
      data: { title: title.trim(), content, ...(typeof isPublished === 'boolean' ? { isPublished } : {}), ...(Number.isInteger(sortOrder) ? { sortOrder } : {}) }
    })
    res.json({ section, message: 'Section saved successfully.' })
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Homepage section not found.' })
    next(error)
  }
})

export default router
