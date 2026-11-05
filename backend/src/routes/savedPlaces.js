import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma.js'

const router = Router()
const categories = new Set(['HOME', 'WORK', 'FAVOURITE'])

function requirePassenger(req, res, next) {
  const token = req.cookies?.twoWayzPassenger
  if (!token) return res.status(401).json({ message: 'Please log in to manage saved places.' })
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    if (payload.role !== 'PASSENGER') return res.status(401).json({ message: 'Invalid passenger session.' })
    req.passengerAuth = payload
    next()
  } catch { return res.status(401).json({ message: 'Your session has expired. Please log in again.' }) }
}

function validatePlace(body) {
  const category = String(body?.category || '').toUpperCase()
  const label = String(body?.label || '').trim()
  const name = String(body?.name || '').trim()
  const address = String(body?.address || '').trim()
  const latitude = Number(body?.latitude ?? body?.location?.lat)
  const longitude = Number(body?.longitude ?? body?.location?.lng)
  if (!categories.has(category)) return { error: 'Choose Home, Work or Favourite.' }
  if (!label || label.length > 40) return { error: 'Enter a place label (up to 40 characters).' }
  if (!name || name.length > 180 || !address || address.length > 500) return { error: 'Select a valid place from Google suggestions.' }
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) return { error: 'The selected place does not have valid map coordinates.' }
  return { data: { category, label, name, address, latitude, longitude, placeId: body?.placeId ? String(body.placeId).slice(0, 200) : null } }
}

router.use(requirePassenger)

router.get('/', async (req, res, next) => {
  try {
    const places = await prisma.passengerSavedPlace.findMany({
      where: { passengerId: req.passengerAuth.sub }, orderBy: [{ category: 'asc' }, { createdAt: 'asc' }]
    })
    res.json({ places })
  } catch (error) { next(error) }
})

router.post('/', async (req, res, next) => {
  try {
    const validated = validatePlace(req.body)
    if (validated.error) return res.status(400).json({ message: validated.error })
    const data = validated.data
    if (data.category !== 'FAVOURITE') {
      const existing = await prisma.passengerSavedPlace.findFirst({ where: { passengerId: req.passengerAuth.sub, category: data.category } })
      const place = existing
        ? await prisma.passengerSavedPlace.update({ where: { id: existing.id }, data })
        : await prisma.passengerSavedPlace.create({ data: { ...data, passengerId: req.passengerAuth.sub } })
      return res.status(existing ? 200 : 201).json({ place, message: existing ? 'Saved place updated.' : 'Saved place added.' })
    }
    const count = await prisma.passengerSavedPlace.count({ where: { passengerId: req.passengerAuth.sub } })
    if (count >= 20) return res.status(409).json({ message: 'You can save up to 20 places.' })
    const duplicate = await prisma.passengerSavedPlace.findFirst({ where: { passengerId: req.passengerAuth.sub, label: data.label } })
    if (duplicate) return res.status(409).json({ message: 'A saved place with this label already exists.' })
    const place = await prisma.passengerSavedPlace.create({ data: { ...data, passengerId: req.passengerAuth.sub } })
    res.status(201).json({ place, message: 'Favourite place added.' })
  } catch (error) { next(error) }
})

router.put('/:id', async (req, res, next) => {
  try {
    const validated = validatePlace(req.body)
    if (validated.error) return res.status(400).json({ message: validated.error })
    const existing = await prisma.passengerSavedPlace.findFirst({ where: { id: req.params.id, passengerId: req.passengerAuth.sub } })
    if (!existing) return res.status(404).json({ message: 'Saved place not found.' })
    const duplicate = await prisma.passengerSavedPlace.findFirst({ where: { passengerId: req.passengerAuth.sub, label: validated.data.label, NOT: { id: existing.id } } })
    if (duplicate) return res.status(409).json({ message: 'A saved place with this label already exists.' })
    if (validated.data.category !== 'FAVOURITE') {
      const categoryDuplicate = await prisma.passengerSavedPlace.findFirst({ where: { passengerId: req.passengerAuth.sub, category: validated.data.category, NOT: { id: existing.id } } })
      if (categoryDuplicate) return res.status(409).json({ message: 'You already have a saved ' + validated.data.category.toLowerCase() + ' place. Edit that entry instead.' })
    }
    const place = await prisma.passengerSavedPlace.update({ where: { id: existing.id }, data: validated.data })
    res.json({ place, message: 'Saved place updated.' })
  } catch (error) { next(error) }
})

router.delete('/:id', async (req, res, next) => {
  try {
    const result = await prisma.passengerSavedPlace.deleteMany({ where: { id: req.params.id, passengerId: req.passengerAuth.sub } })
    if (!result.count) return res.status(404).json({ message: 'Saved place not found.' })
    res.json({ message: 'Saved place deleted.' })
  } catch (error) { next(error) }
})

export default router