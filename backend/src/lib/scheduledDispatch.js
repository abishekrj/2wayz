import { prisma } from './prisma.js'
import { notify, notifyBooking } from './notifications.js'

function envNumber(name, fallback, minimum, maximum) {
  const value = Number(process.env[name])
  return Number.isFinite(value) ? Math.min(maximum, Math.max(minimum, value)) : fallback
}

const DISPATCH_LEAD_MINUTES = envNumber('SCHEDULED_DISPATCH_LEAD_MINUTES', 15, 1, 120)
const RETRY_SECONDS = envNumber('SCHEDULED_DISPATCH_RETRY_SECONDS', 60, 15, 300)
const OFFER_LIFETIME_SECONDS = envNumber('SCHEDULED_DISPATCH_OFFER_SECONDS', 60, 15, 300)
const DRIVER_LOCATION_MAX_AGE_SECONDS = 180
const MAX_DRIVERS_PER_ROUND = envNumber('SCHEDULED_DISPATCH_MAX_DRIVERS', 10, 1, 30)
const MAX_PICKUP_DISTANCE_KM = envNumber('SCHEDULED_DISPATCH_RADIUS_KM', 8, 1, 25)

function distanceKm(aLat, aLng, bLat, bLng) {
  const radians = value => value * Math.PI / 180
  const dLat = radians(bLat - aLat)
  const dLng = radians(bLng - aLng)
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(aLat)) * Math.cos(radians(bLat)) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

async function driverEligibility(driver, settings) {
  if (!driver.wallet || driver.wallet.balance < settings.minimumBalance) return false
  const due = await prisma.walletTransaction.aggregate({
    where: { walletId: driver.wallet.id, type: 'COMMISSION', status: 'DUE' },
    _sum: { amount: true, settledAmount: true }
  })
  return Math.max(0, (due._sum.amount || 0) - (due._sum.settledAmount || 0)) === 0
}

async function markMissed(booking) {
  const changed = await prisma.booking.updateMany({
    where: { id: booking.id, status: 'REQUESTED', driverId: null, dispatchStatus: { not: 'MISSED' } },
    data: { dispatchStatus: 'MISSED' }
  })
  if (!changed.count) return
  await prisma.driverOffer.updateMany({
    where: { bookingId: booking.id, status: 'OFFERED' },
    data: { status: 'UNAVAILABLE' }
  })
  await notifyBooking({
    booking,
    type: 'SCHEDULED_RIDE_UNASSIGNED',
    title: 'Scheduled ride needs attention',
    message: `No driver accepted scheduled ride ${booking.reference} before pickup time. Please contact 2WAYZ support.`,
    includeDriver: false
  })
}

async function dispatchOne(booking, now) {
  // A conditional update claims this dispatch round so overlapping worker ticks
  // or multiple API instances cannot send the same round twice.
  const claimed = await prisma.booking.updateMany({
    where: {
      id: booking.id,
      status: 'REQUESTED',
      driverId: null,
      dispatchStatus: booking.dispatchStatus,
      dispatchLastAttemptAt: booking.dispatchLastAttemptAt
    },
    data: {
      dispatchStatus: 'SEARCHING',
      dispatchLastAttemptAt: now,
      dispatchAttemptCount: { increment: 1 }
    }
  })
  if (claimed.count !== 1) return

  const expiryCutoff = new Date(now.getTime() - OFFER_LIFETIME_SECONDS * 1000)
  await prisma.driverOffer.updateMany({
    where: { bookingId: booking.id, status: 'OFFERED', createdAt: { lte: expiryCutoff } },
    data: { status: 'EXPIRED' }
  })

  const settings = await prisma.walletSettings.findUnique({ where: { id: 'default' } })
  if (!settings?.isActive) {
    await prisma.booking.updateMany({
      where: { id: booking.id, status: 'REQUESTED', driverId: null },
      data: { dispatchStatus: 'NO_DRIVERS' }
    })
    if (!booking.dispatchAlertedAt) {
      await prisma.booking.updateMany({ where: { id: booking.id, dispatchAlertedAt: null }, data: { dispatchAlertedAt: now } })
      await notify({ role: 'ADMIN', type: 'SCHEDULED_DISPATCH_BLOCKED', title: 'Scheduled dispatch is paused', message: `Ride ${booking.reference} is awaiting dispatch because wallet settings are not active.`, bookingId: booking.id })
    }
    return
  }

  const cutoff = new Date(now.getTime() - DRIVER_LOCATION_MAX_AGE_SECONDS * 1000)
  const drivers = await prisma.driver.findMany({
    where: {
      status: 'APPROVED',
      isOnline: true,
      locationUpdatedAt: { gte: cutoff },
      currentLat: { not: null },
      currentLng: { not: null },
      wallet: { is: { balance: { gte: settings.minimumBalance } } },
      bookings: { none: { status: { in: ['DRIVER_ASSIGNED', 'DRIVER_ARRIVED', 'IN_PROGRESS'] } } }
    },
    select: { id: true, currentLat: true, currentLng: true, wallet: { select: { id: true, balance: true } } }
  })

  const eligible = []
  for (const driver of drivers) {
    if (await driverEligibility(driver, settings)) {
      const km = distanceKm(booking.pickupLat, booking.pickupLng, driver.currentLat, driver.currentLng)
      if (km <= MAX_PICKUP_DISTANCE_KM) eligible.push({ id: driver.id, km })
    }
  }
  eligible.sort((a, b) => a.km - b.km)

  const existingForBooking = eligible.length ? await prisma.driverOffer.findMany({
    where: { bookingId: booking.id, driverId: { in: eligible.map(driver => driver.id) } },
    select: { id: true, driverId: true, status: true }
  }) : []
  const existingByDriver = new Map(existingForBooking.map(offer => [offer.driverId, offer]))
  // Do not repeatedly send to drivers who declined; expired unanswered offers can be renewed.
  const selected = eligible
    .filter(driver => {
      const previous = existingByDriver.get(driver.id)
      return !previous || previous.status === 'EXPIRED'
    })
    .slice(0, MAX_DRIVERS_PER_ROUND)

  if (!selected.length) {
    await prisma.booking.updateMany({
      where: { id: booking.id, status: 'REQUESTED', driverId: null },
      data: { dispatchStatus: 'NO_DRIVERS' }
    })
    if (!booking.dispatchAlertedAt) {
      await prisma.booking.updateMany({
        where: { id: booking.id, dispatchAlertedAt: null },
        data: { dispatchAlertedAt: now }
      })
      await notify({
        role: 'ADMIN',
        type: 'SCHEDULED_DISPATCH_NO_DRIVERS',
        title: 'No drivers available for scheduled ride',
        message: `No eligible online driver is currently available for scheduled ride ${booking.reference}. The system will retry automatically.`,
        bookingId: booking.id
      })
    }
    return
  }

  const toReopen = selected
    .map(driver => existingByDriver.get(driver.id))
    .filter(offer => offer?.status === 'EXPIRED')
    .map(offer => offer.id)
  if (toReopen.length) {
    await prisma.driverOffer.updateMany({
      where: { id: { in: toReopen }, status: 'EXPIRED' },
      data: { status: 'OFFERED', createdAt: now, updatedAt: now }
    })
  }
  const newOffers = selected.filter(driver => !existingByDriver.has(driver.id))
  if (newOffers.length) {
    await prisma.driverOffer.createMany({
      data: newOffers.map(driver => ({ bookingId: booking.id, driverId: driver.id, status: 'OFFERED', createdAt: now, updatedAt: now })),
      skipDuplicates: true
    })
  }
  const offeredState = await prisma.booking.updateMany({
    where: { id: booking.id, status: 'REQUESTED', driverId: null },
    data: { dispatchStatus: 'OFFERED' }
  })
  if (offeredState.count !== 1) {
    await prisma.driverOffer.updateMany({
      where: { bookingId: booking.id, status: 'OFFERED' },
      data: { status: 'UNAVAILABLE' }
    })
    return
  }
  await Promise.all(selected.map(driver => notify({
    role: 'DRIVER',
    recipientId: driver.id,
    type: 'SCHEDULED_RIDE_OFFER',
    title: 'Scheduled ride offer',
    message: `Scheduled ride ${booking.reference} is available. Pickup: ${booking.scheduledAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}. Open your driver portal to accept or decline.`,
    bookingId: booking.id
  })))
}

let running = false
export async function processScheduledDispatch() {
  if (running) return
  running = true
  try {
    const now = new Date()
    const dueBookings = await prisma.booking.findMany({
      where: {
        mode: 'schedule',
        status: 'REQUESTED',
        driverId: null,
        scheduledAt: { lte: new Date(now.getTime() + DISPATCH_LEAD_MINUTES * 60 * 1000) },
        OR: [
          { dispatchStatus: { in: ['SCHEDULED', 'NO_DRIVERS'] }, OR: [{ dispatchLastAttemptAt: null }, { dispatchLastAttemptAt: { lte: new Date(now.getTime() - RETRY_SECONDS * 1000) } }] },
          { dispatchStatus: 'OFFERED', dispatchLastAttemptAt: { lte: new Date(now.getTime() - RETRY_SECONDS * 1000) } },
          { dispatchStatus: 'SEARCHING', dispatchLastAttemptAt: { lte: new Date(now.getTime() - 120 * 1000) } }
        ]
      },
      orderBy: { scheduledAt: 'asc' },
      take: 50
    })

    for (const booking of dueBookings) {
      if (booking.scheduledAt <= now) await markMissed(booking)
      else await dispatchOne(booking, now)
    }

    const overdue = await prisma.booking.findMany({
      where: { mode: 'schedule', status: 'REQUESTED', driverId: null, scheduledAt: { lte: now }, dispatchStatus: { not: 'MISSED' } },
      take: 50
    })
    for (const booking of overdue) await markMissed(booking)
  } catch (error) {
    console.error('[scheduled-dispatch] Worker tick failed:', error)
  } finally {
    running = false
  }
}

export function startScheduledDispatchWorker() {
  console.log(`[scheduled-dispatch] Worker started: dispatch ${DISPATCH_LEAD_MINUTES} minutes before pickup; retry every ${RETRY_SECONDS} seconds; offer expiry ${OFFER_LIFETIME_SECONDS} seconds; radius ${MAX_PICKUP_DISTANCE_KM} km.`)
  processScheduledDispatch()
  const timer = setInterval(processScheduledDispatch, 15000)
  timer.unref?.()
  return timer
}
