import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { requireAdmin } from '../middleware/requireAdmin.js'

const router = Router()

export const DEFAULT_FARE_SETTINGS = Object.freeze({
  id: 'default',
  baseFare: 30,
  includedDistanceKm: 1,
  perKmRate: 18,
  minimumFare: 50,
  roundingIncrement: 5,
  isActive: true
})

export async function getFareSettings() {
  const settings = await prisma.fareSettings.upsert({
    where: { id: 'default' },
    create: { id: 'default', ...DEFAULT_FARE_SETTINGS },
    update: {}
  })
  return settings
}

export function getEffectiveFareSettings(settings) {
  if (!settings?.isActive) return { ...DEFAULT_FARE_SETTINGS }
  return {
    baseFare: settings.baseFare,
    includedDistanceKm: settings.includedDistanceKm,
    perKmRate: settings.perKmRate,
    minimumFare: settings.minimumFare,
    roundingIncrement: settings.roundingIncrement,
    isActive: true
  }
}

router.get('/public', async (_req, res, next) => {
  try {
    const settings = await getFareSettings()
    res.set('Cache-Control', 'no-store')
    res.json({ settings: getEffectiveFareSettings(settings), customTariffActive: settings.isActive })
  } catch (error) { next(error) }
})

router.get('/admin', requireAdmin, async (_req, res, next) => {
  try {
    const settings = await getFareSettings()
    res.json({ settings })
  } catch (error) { next(error) }
})

router.put('/admin', requireAdmin, async (req, res, next) => {
  try {
    const body = req.body || {}
    const baseFare = Number(body.baseFare)
    const includedDistanceKm = Number(body.includedDistanceKm)
    const perKmRate = Number(body.perKmRate)
    const minimumFare = Number(body.minimumFare)
    const roundingIncrement = Number(body.roundingIncrement)
    const isActive = body.isActive

    if (!Number.isInteger(baseFare) || baseFare < 0 || baseFare > 5000) return res.status(400).json({ message: 'Base fare must be a whole amount between ₹0 and ₹5,000.' })
    if (!Number.isFinite(includedDistanceKm) || includedDistanceKm < 0 || includedDistanceKm > 50) return res.status(400).json({ message: 'Included distance must be between 0 and 50 km.' })
    if (!Number.isFinite(perKmRate) || perKmRate < 0 || perKmRate > 500) return res.status(400).json({ message: 'Per-kilometre rate must be between ₹0 and ₹500.' })
    if (!Number.isInteger(minimumFare) || minimumFare < 0 || minimumFare > 10000) return res.status(400).json({ message: 'Minimum fare must be a whole amount between ₹0 and ₹10,000.' })
    if (!Number.isInteger(roundingIncrement) || roundingIncrement < 1 || roundingIncrement > 1000) return res.status(400).json({ message: 'Rounding increment must be a whole number between 1 and 1,000.' })
    if (typeof isActive !== 'boolean') return res.status(400).json({ message: 'Choose whether the custom tariff is active.' })

    const settings = await prisma.fareSettings.upsert({
      where: { id: 'default' },
      create: { id: 'default', baseFare, includedDistanceKm, perKmRate, minimumFare, roundingIncrement, isActive },
      update: { baseFare, includedDistanceKm, perKmRate, minimumFare, roundingIncrement, isActive }
    })
    res.json({ settings, message: isActive ? 'Fare settings saved and activated.' : 'Custom fare settings saved. The default tariff is currently in use.' })
  } catch (error) { next(error) }
})

export default router
