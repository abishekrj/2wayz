import 'dotenv/config'
import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { rateLimit } from 'express-rate-limit'
import authRoutes from './routes/auth.js'
import homepageRoutes from './routes/homepage.js'
import cmsPageRoutes from './routes/cmsPages.js'
import userRoutes from './routes/users.js'

if (!process.env.DATABASE_URL || !process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('DATABASE_URL and a JWT_SECRET of at least 32 characters are required.')
}

const app = express()
const currentDir = path.dirname(fileURLToPath(import.meta.url))
app.use('/uploads', express.static(path.resolve(currentDir, '../uploads'), { maxAge: '7d', dotfiles: 'deny' }))
const port = Number(process.env.PORT || 5001)
const allowedOrigins = new Set([
  ...('http://127.0.0.1:5173,http://localhost:5173').split(','),
  ...(process.env.CLIENT_ORIGIN || '').split(',')
].map(value => value.trim()).filter(Boolean))

app.use(helmet())
app.use(cors({ origin(origin, callback) { if (!origin || allowedOrigins.has(origin)) return callback(null, true); console.warn('Blocked CORS origin:', origin); return callback(new Error('Origin not allowed by CORS.')) }, credentials: true }))
app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())
app.use('/api', rateLimit({ windowMs: 60 * 1000, limit: 120, standardHeaders: 'draft-7', legacyHeaders: false }))
app.get('/api/health', (req, res) => res.json({ status: 'ok', service: '2WAYZ API' }))
app.use('/api/admin/auth', authRoutes)
app.use('/api/homepage', homepageRoutes)
app.use('/api/cms-pages', cmsPageRoutes)
app.use('/api/users', userRoutes)
app.use((error, req, res, next) => {
  console.error(error)
  res.status(500).json({ message: 'An unexpected server error occurred.' })
})
app.listen(port, () => console.log(`2WAYZ API listening on port ${port}`))