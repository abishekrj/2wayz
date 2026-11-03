import jwt from 'jsonwebtoken'

export function requireAdmin(req, res, next) {
  const token = req.cookies?.twoWayzAdmin
  if (!token) return res.status(401).json({ message: 'Please sign in to continue.' })
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    if (payload.role !== 'SUPER_ADMIN') return res.status(403).json({ message: 'Administrator access required.' })
    req.admin = payload
    next()
  } catch {
    return res.status(401).json({ message: 'Your session has expired. Please sign in again.' })
  }
}