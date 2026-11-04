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
      imageUrl: typeof (place.imageUrl || place.image) === 'string' ? (place.imageUrl || place.image).trim().slice(0, 1000) : '',
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


const DEFAULT_FAQS = [
  { id: 'faq-1', question: 'How do I book an auto with 2WAYZ?', answer: 'Enter your pickup location and destination, review the route and indicative fare, then continue to request an auto. You can track your booking from the travel page.', isPublished: true, sortOrder: 0 },
  { id: 'faq-2', question: 'How is my fare calculated?', answer: 'The fare estimate is based on the road route and the current indicative tariff shown before you book. The final fare is confirmed for your completed trip.', isPublished: true, sortOrder: 1 },
  { id: 'faq-3', question: 'How do I pay for my ride?', answer: 'At present, passengers pay the driver directly for the completed trip. 2WAYZ does not collect the passenger fare online.', isPublished: true, sortOrder: 2 },
  { id: 'faq-4', question: 'Can I cancel a booking?', answer: 'You can cancel an eligible ride from the travel tracking page or My Bookings before the trip starts. A ride that is already in progress cannot be cancelled by the passenger.', isPublished: true, sortOrder: 3 },
  { id: 'faq-5', question: 'Can I book another auto while I have an active ride?', answer: 'Only one active booking is allowed at a time. Complete or cancel your current ride before requesting another auto.', isPublished: true, sortOrder: 4 },
  { id: 'faq-6', question: 'Where is 2WAYZ currently available?', answer: '2WAYZ is focused on local auto journeys in and around Tiruvannamalai.', isPublished: true, sortOrder: 5 }
]

function normalizeFaqs(value) {
  if (!Array.isArray(value)) return null
  const seen = new Set()
  const faqs = []
  for (let index = 0; index < value.length; index += 1) {
    const raw = value[index]
    if (!raw || typeof raw.question !== 'string' || typeof raw.answer !== 'string') continue
    const question = raw.question.trim().slice(0, 240)
    const answer = raw.answer.trim().slice(0, 2000)
    if (!question || !answer || seen.has(question.toLowerCase())) continue
    seen.add(question.toLowerCase())
    faqs.push({
      id: typeof raw.id === 'string' && raw.id.trim() ? raw.id.slice(0, 80) : 'faq-' + (index + 1),
      question,
      answer,
      isPublished: raw.isPublished !== false,
      sortOrder: Number.isInteger(raw.sortOrder) ? raw.sortOrder : index
    })
  }
  return faqs.sort((a, b) => a.sortOrder - b.sortOrder)
}

async function readFaqConfig() {
  const section = await prisma.homePageSection.findUnique({ where: { slug: 'faqs' } })
  const content = section?.content && typeof section.content === 'object' ? section.content : {}
  return {
    heading: typeof content.heading === 'string' && content.heading.trim() ? content.heading : 'Frequently Asked Questions',
    description: typeof content.description === 'string' ? content.description : 'Quick answers to common questions about booking and travelling with 2WAYZ.',
    faqs: normalizeFaqs(content.faqs) || DEFAULT_FAQS
  }
}

router.get('/faqs/public', async (req, res, next) => {
  try {
    const config = await readFaqConfig()
    res.json({ ...config, faqs: config.faqs.filter(faq => faq.isPublished) })
  } catch (error) { next(error) }
})

router.get('/faqs/admin', requireAdmin, async (req, res, next) => {
  try { res.json(await readFaqConfig()) }
  catch (error) { next(error) }
})

router.put('/faqs/admin', requireAdmin, async (req, res, next) => {
  try {
    const heading = typeof req.body?.heading === 'string' ? req.body.heading.trim().slice(0, 140) : ''
    const description = typeof req.body?.description === 'string' ? req.body.description.trim().slice(0, 300) : ''
    const faqs = normalizeFaqs(req.body?.faqs)
    if (!heading || !faqs) return res.status(400).json({ message: 'A section heading and valid FAQ list are required.' })
    const section = await prisma.homePageSection.upsert({
      where: { slug: 'faqs' },
      create: { slug: 'faqs', title: 'FAQs', content: { heading, description, faqs }, isPublished: true, sortOrder: 10 },
      update: { title: 'FAQs', content: { heading, description, faqs } }
    })
    res.json({ heading, description, faqs, message: 'FAQ configuration saved.', sectionId: section.id })
  } catch (error) { next(error) }
})

export default router
