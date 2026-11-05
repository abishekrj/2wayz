import { prisma } from './prisma.js'
import { notify } from './notifications.js'

const expiryFields = [
  ['drivingLicenceExpiryDate', 'Driving licence'],
  ['vehicleInsuranceExpiryDate', 'Vehicle insurance'],
  ['fcExpiryDate', 'Fitness Certificate (FC)']
]

export function istTodayString(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date)
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

export function expiredDriverDocuments(driver, today = istTodayString()) {
  return expiryFields
    .filter(([field]) => driver[field] && driver[field].toISOString().slice(0, 10) <= today)
    .map(([, label]) => label)
}

export async function suspendDriverIfDocumentsExpired(driver) {
  const expired = expiredDriverDocuments(driver)
  if (!expired.length || !['APPROVED', 'PENDING'].includes(driver.status)) return expired

  const changed = await prisma.driver.updateMany({
    where: { id: driver.id, status: driver.status, complianceNoticeSentAt: null },
    data: { status: 'SUSPENDED', isOnline: false, complianceNoticeSentAt: new Date() }
  })
  if (!changed.count) return expired

  if (driver.isOnline) {
    await prisma.driverActivity.create({
      data: { driverId: driver.id, eventType: 'OFFLINE', description: 'Driver was automatically taken offline because a required document expired.' }
    })
  }
  const message = `Your 2WAYZ driver account has been suspended because the following document(s) expired: ${expired.join(', ')}. Please contact 2WAYZ support or the Super Admin and submit updated valid documents before returning online.`
  await Promise.all([
    notify({ role: 'DRIVER', recipientId: driver.id, type: 'DOCUMENT_EXPIRED', title: 'Driver account suspended', message }),
    notify({ role: 'ADMIN', type: 'DRIVER_DOCUMENT_EXPIRED', title: 'Driver documents expired', message: `${driver.name} (${driver.phone}) was automatically suspended. Expired: ${expired.join(', ')}.` })
  ])
  return expired
}

export async function suspendDriversWithExpiredDocuments() {
  const drivers = await prisma.driver.findMany({
    where: { status: { in: ['APPROVED', 'PENDING'] }, complianceNoticeSentAt: null },
    select: { id: true, name: true, phone: true, status: true, isOnline: true, drivingLicenceExpiryDate: true, vehicleInsuranceExpiryDate: true, fcExpiryDate: true }
  })
  for (const driver of drivers) await suspendDriverIfDocumentsExpired(driver)
}
