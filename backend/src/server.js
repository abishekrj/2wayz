import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { rateLimit } from 'express-rate-limit'
import authRoutes from './routes/auth.js'
import homepageRoutes from './routes/homepage.js'

if (!process.env.DATABASE_URL || !process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('DATABASE_URL and a JWT_SECRET of at least 32 characters are required.')
}

const app = express()
const port = Number(process.env.PORT || 5001)
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://127.0.0.1:5173').split(',').map(value => value.trim())

app.use(helmet())
app.use(cors({ origin(origin, callback) { if (!origin || allowedOrigins.includes(origin)) return callback(null, true); callback(new Error('Origin not allowed by CORS.')) }, credentials: true }))
app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())
app.use('/api', rateLimit({ windowMs: 60 * 1000, limit: 120, standardHeaders: 'draft-7', legacyHeaders: false }))
app.get('/api/health', (req, res) => res.json({ status: 'ok', service: '2WAYZ API' }))
app.use('/api/admin/auth', authRoutes)
app.use('/api/homepage', homepageRoutes)
app.use((error, req, res, next) => {
  console.error(error)
  res.status(500).json({ message: 'An unexpected server error occurred.' })
})
app.listen(port, () => console.log(`2WAYZ API listening on port ${port}`))