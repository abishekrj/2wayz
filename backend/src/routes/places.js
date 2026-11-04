import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { requireAdmin } from '../middleware/requireAdmin.js'

const router = Router()
const DEFAULT_PLACES = [
  'Arunachaleswarar Temple',
  'Sri Ramana Ashram',
  'Virupaksha Cave',
  'Skandashramam',
  'Yogi Ramsuratkumar Ashram',
  'Adi Annamalai Temple',
  'Seshadri Swamigal Ashram',
  'Pachaiamman Temple'
].map((name, index) => ({ id: 'default-' + (index + 1), name, subtitle: '', detail: '', imageUrl: '', isPublished: true, sortOrder: index }))

function normalizePlaces(value) {
  if (!Array.isArray(value)) return null
  const names = new Set()
  const places = []
  for (let index = 0; index < value.length; index += 1) {
    const raw = value[index]
    const place = typeof raw === 'string' ? { name: raw } : raw
    if (!place || typeof place.name !== 'string' || !place.name.trim()) continue
    const name = place.name.trim().slice(0, 120)
    const key = name.toLowerCase()
    if (names.has(key)) continue
    names.add(key)
    places.push({
      id: typeof place.id === 'string' && place.id.trim() ? place.id.slice(0, 80) : 'place-' + (index + 1),
      name,
      subtitle: typeof place.subtitle === 'string' ? place.subtitle.trim().slice(0, 120) : '',
      detail: typeof place.detail === 'string' ? place.detail.trim().slice(0, 500) : '',
      imageUrl: typeof place.imageUrl === 'string' ? place.imageUrl.trim().slice(0, 1000) : '',
      isPublished: place.isPublished !== false,
      sortOrder: Number.isInteger(place.sortOrder) ? place.sortOrder : index
    })
  }
  return places.sort((a, b) => a.sortOrder - b.sortOrder)
}

async function readConfig() {
  const section = await prisma.homePageSection.findUnique({ where: { slug: 'nearby-places' } })
  const content = section?.content && typeof section.content === 'object' ? section.content : {}
  const places = normalizePlaces(content.places) || DEFAULT_PLACES
  return { heading: typeof content.heading === 'string' && content.heading.trim() ? content.heading : 'Places to Visit in Tiruvannamalai', places }
}

router.get('/public', async (req, res, next) => {
  try {
    const config = await readConfig()
    res.json({ heading: config.heading, places: config.places.filter(place => place.isPublished) })
  } catch (error) { next(error) }
})

router.get('/admin', requireAdmin, async (req, res, next) => {
  try { res.json(await readConfig()) }
  catch (error) { next(error) }
})

router.put('/admin', requireAdmin, async (req, res, next) => {
  try {
    const heading = typeof req.body?.heading === 'string' ? req.body.heading.trim().slice(0, 140) : ''
    const places = normalizePlaces(req.body?.places)
    if (!heading || !places) return res.status(400).json({ message: 'A section heading and valid places list are required.' })
    const section = await prisma.homePageSection.upsert({
      where: { slug: 'nearby-places' },
      create: { slug: 'nearby-places', title: 'Places to Visit', content: { heading, places }, isPublished: true, sortOrder: 4 },
      update: { title: 'Places to Visit', content: { heading, places } }
    })
    res.json({ heading, places, message: 'Places to Explore configuration saved.', sectionId: section.id })
  } catch (error) { next(error) }
})

export default router
