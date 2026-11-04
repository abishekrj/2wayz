import { createCipheriv, createDecipheriv, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'
import { prisma } from './prisma.js'

function secretKey() {
  const secret = process.env.JWT_SECRET
  if (!secret || secret.length < 32) throw new Error('A valid JWT_SECRET is required for ride OTP protection.')
  return createHmac('sha256', secret).update('2WAYZ_RIDE_START_OTP_ENCRYPTION').digest()
}

export function hashRideStartOtp(otp) {
  return createHmac('sha256', process.env.JWT_SECRET).update('2WAYZ_RIDE_START:' + String(otp)).digest('hex')
}

export function verifyRideStartOtp(otp, expectedHash) {
  if (!/^\\d{4}$/.test(String(otp || '')) || typeof expectedHash !== 'string') return false
  const actual = Buffer.from(hashRideStartOtp(otp), 'hex')
  const expected = Buffer.from(expectedHash, 'hex')
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

export function createRideStartOtp() {
  const otp = String(randomInt(0, 10000)).padStart(4, '0')
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', secretKey(), iv)
  const encrypted = Buffer.concat([cipher.update(otp, 'utf8'), cipher.final()])
  return {
    hash: hashRideStartOtp(otp),
    encrypted: [iv.toString('hex'), cipher.getAuthTag().toString('hex'), encrypted.toString('hex')].join(':')
  }
}

export function decryptRideStartOtp(value) {
  if (!value) return null
  try {
    const [ivHex, tagHex, encryptedHex] = String(value).split(':')
    if (!ivHex || !tagHex || !encryptedHex) return null
    const decipher = createDecipheriv('aes-256-gcm', secretKey(), Buffer.from(ivHex, 'hex'))
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
    return Buffer.concat([decipher.update(Buffer.from(encryptedHex, 'hex')), decipher.final()]).toString('utf8')
  } catch {
    return null
  }
}

// Supports rides that were already at the pickup stage when OTP verification
// was deployed. Only the passenger-facing booking response receives the code.
export async function ensureRideStartOtp(bookingId) {
  let booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { status: true, rideStartOtpHash: true, rideStartOtpEncrypted: true }
  })
  if (!booking || booking.status !== 'DRIVER_ARRIVED') return null
  if (!booking.rideStartOtpHash || !booking.rideStartOtpEncrypted) {
    const otp = createRideStartOtp()
    await prisma.booking.updateMany({
      where: { id: bookingId, status: 'DRIVER_ARRIVED', rideStartOtpHash: null },
      data: { rideStartOtpHash: otp.hash, rideStartOtpEncrypted: otp.encrypted, rideStartOtpAttempts: 0 }
    })
    booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { status: true, rideStartOtpEncrypted: true }
    })
  }
  return booking?.status === 'DRIVER_ARRIVED' ? decryptRideStartOtp(booking.rideStartOtpEncrypted) : null
}
