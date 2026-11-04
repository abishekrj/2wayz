import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { requireAdmin } from '../middleware/requireAdmin.js'

const router = Router()
const cancelledStatuses = ['CANCELLED', 'CANCELED']

function parseDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return null
  const valid = new Date(value + 'T00:00:00.000Z')
  if (!Number.isFinite(valid.getTime()) || valid.toISOString().slice(0, 10) !== value) return null
  return new Date(value + 'T00:00:00+05:30')
}

function indiaDateText(date) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date)
  const part = type => parts.find(item => item.type === type)?.value || ''
  return part('year') + '-' + part('month') + '-' + part('day')
}

function sum(items, selector) {
  return items.reduce((total, item) => total + Number(selector(item) || 0), 0)
}

router.get('/', requireAdmin, async (req, res, next) => {
  try {
    const today = new Date()
    const todayText = indiaDateText(today)
    const monthStart = todayText.slice(0, 8) + '01'
    const fromText = String(req.query.from || monthStart)
    const toText = String(req.query.to || todayText)
    const from = parseDate(fromText)
    const to = parseDate(toText)
    if (!from || !to || from > to) return res.status(400).json({ message: 'Choose a valid date range. The start date must not be after the end date.' })
    const toExclusive = new Date(to.getTime() + 24 * 60 * 60 * 1000)
    if (toExclusive - from > 366 * 24 * 60 * 60 * 1000) return res.status(400).json({ message: 'Reports can cover up to 366 days at a time.' })
    const driverId = String(req.query.driverId || '').trim() || undefined
    const dateRange = { gte: from, lt: toExclusive }
    const bookingPeriodWhere = {
      OR: [
        { status: 'COMPLETED', completedAt: dateRange },
        { status: { in: cancelledStatuses }, updatedAt: dateRange }
      ]
    }

    const drivers = await prisma.driver.findMany({
      where: driverId ? { id: driverId } : {},
      orderBy: { name: 'asc' },
      select: {
        id: true, name: true, phone: true, vehicleNumber: true, serviceArea: true, status: true,
        bookings: {
          where: bookingPeriodWhere,
          select: { id: true, reference: true, status: true, finalFare: true, estimatedFare: true, completedAt: true, updatedAt: true }
        },
        offers: {
          where: { updatedAt: dateRange, status: { in: ['ACCEPTED', 'DECLINED'] } },
          select: { status: true }
        },
        wallet: {
          select: {
            transactions: {
              where: { type: 'COMMISSION', createdAt: dateRange },
              select: { amount: true, settledAmount: true, status: true }
            }
          }
        }
      }
    })
    if (driverId && !drivers.length) return res.status(404).json({ message: 'Driver not found.' })

    const rows = await Promise.all(drivers.map(async driver => {
      const completed = driver.bookings.filter(booking => booking.status === 'COMPLETED')
      const cancelled = driver.bookings.filter(booking => cancelledStatuses.includes(booking.status))
      const acceptedOffers = driver.offers.filter(offer => offer.status === 'ACCEPTED').length
      const declinedOffers = driver.offers.filter(offer => offer.status === 'DECLINED').length
      const commissionRows = driver.wallet?.transactions || []
      const dueAggregate = await prisma.walletTransaction.aggregate({
        where: { wallet: { is: { driverId: driver.id } }, type: 'COMMISSION', status: 'DUE' },
        _sum: { amount: true, settledAmount: true }
      })
      return {
        id: driver.id, name: driver.name, phone: driver.phone, vehicleNumber: driver.vehicleNumber,
        serviceArea: driver.serviceArea, status: driver.status,
        completedRides: completed.length,
        cancelledRides: cancelled.length,
        acceptedOffers,
        declinedOffers,
        finalFares: sum(completed, booking => booking.finalFare ?? booking.estimatedFare),
        commissionAmount: sum(commissionRows, item => item.amount),
        commissionDeducted: sum(commissionRows, item => item.settledAmount),
        outstandingCommission: Math.max(0, Number(dueAggregate._sum.amount || 0) - Number(dueAggregate._sum.settledAmount || 0)),
        completedRecords: completed.map(booking => ({
          reference: booking.reference,
          fare: booking.finalFare ?? booking.estimatedFare,
          date: booking.completedAt
        })),
        cancelledRecords: cancelled.map(booking => ({
          reference: booking.reference,
          date: booking.updatedAt
        }))
      }
    }))

    const requestWhere = { requestedAt: dateRange, ...(driverId ? { driverId } : {}) }
    const totalRequests = await prisma.booking.count({ where: requestWhere })
    const totalCompleted = sum(rows, row => row.completedRides)
    const totalCancelled = sum(rows, row => row.cancelledRides)
    const totalFares = sum(rows, row => row.finalFares)
    const totalCommission = sum(rows, row => row.commissionAmount)
    const totalDeducted = sum(rows, row => row.commissionDeducted)
    const totalOutstanding = sum(rows, row => row.outstandingCommission)
    const totalAcceptedOffers = sum(rows, row => row.acceptedOffers)
    const totalDeclinedOffers = sum(rows, row => row.declinedOffers)

    const daily = new Map()
    for (const row of rows) {
      for (const booking of row.completedRecords) {
        const day = indiaDateText(new Date(booking.date))
        const entry = daily.get(day) || { date: day, completedRides: 0, cancelledRides: 0, fares: 0 }
        entry.completedRides += 1
        entry.fares += Number(booking.fare || 0)
        daily.set(day, entry)
      }
      for (const booking of row.cancelledRecords) {
        const day = new Date(booking.date).toISOString().slice(0, 10)
        const entry = daily.get(day) || { date: day, completedRides: 0, cancelledRides: 0, fares: 0 }
        entry.cancelledRides += 1
        daily.set(day, entry)
      }
    }

    res.json({
      period: { from: fromText, to: toText },
      summary: {
        totalRequests, totalCompleted, totalCancelled, totalFares,
        totalCommission, totalDeducted, totalOutstanding,
        totalAcceptedOffers, totalDeclinedOffers,
        offerAcceptanceRate: totalAcceptedOffers + totalDeclinedOffers ? Math.round(totalAcceptedOffers * 100 / (totalAcceptedOffers + totalDeclinedOffers)) : 0,
        averageFare: totalCompleted ? Math.round(totalFares / totalCompleted) : 0
      },
      drivers: rows.map(({ completedRecords, cancelledRecords, ...row }) => row),
      daily: [...daily.values()].sort((a, b) => a.date.localeCompare(b.date))
    })
  } catch (error) { next(error) }
})

export default router
