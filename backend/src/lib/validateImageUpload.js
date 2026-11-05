import { open, unlink } from 'node:fs/promises'
import path from 'node:path'

const allowedTypes = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/gif': ['.gif']
}

function detectImageType(header) {
  if (header.length >= 6 && ['GIF87a', 'GIF89a'].includes(header.toString('ascii', 0, 6))) return 'image/gif'
  if (header.length >= 3 && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) return 'image/jpeg'
  if (header.length >= 8 && header.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png'
  if (header.length >= 12 && header.toString('ascii', 0, 4) === 'RIFF' && header.toString('ascii', 8, 12) === 'WEBP') return 'image/webp'
  return null
}

export async function validateImageUpload(req, res, next) {
  if (!req.file) return next()

  let handle
  try {
    handle = await open(req.file.path, 'r')
    const header = Buffer.alloc(12)
    const { bytesRead } = await handle.read(header, 0, header.length, 0)
    const detectedType = detectImageType(header.subarray(0, bytesRead))
    const extension = path.extname(req.file.originalname || '').toLowerCase()
    const validExtensions = detectedType ? allowedTypes[detectedType] : []
    const isValid = Boolean(
      detectedType &&
      detectedType === req.file.mimetype &&
      validExtensions.includes(extension)
    )

    await handle.close()
    handle = null

    if (!isValid) {
      await unlink(req.file.path).catch(() => {})
      req.file = undefined
      return res.status(400).json({ message: 'The uploaded file is not a valid JPG, PNG or WEBP image. Please choose an image file.' })
    }

    return next()
  } catch (error) {
    if (handle) await handle.close().catch(() => {})
    await unlink(req.file.path).catch(() => {})
    req.file = undefined
    return res.status(400).json({ message: 'The uploaded image could not be verified. Please try another image.' })
  }
}
