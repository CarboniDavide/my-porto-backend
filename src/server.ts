import type { Request, Response, NextFunction } from 'express'
import express from 'express'
import cors, { type CorsOptions } from 'cors'
import { accessLogger } from './middleware/accessLogger.js'
import { chatRouter } from './routes/chat.js'
import { contactRouter } from './routes/contact.js'
import { healthRouter } from './routes/health.js'
import { recruitChatRouter } from './routes/recruitChat.js'
import { recruitFileUploadRouter } from './routes/recruitFileUpload.js'
import { visitRouter } from './routes/visit.js'

const app = express()

function parseOrigin(value: string): string | null {
  const raw = value.trim()
  if (!raw) return null
  if (raw === '*') return '*'

  try {
    const withScheme = raw.includes('://') ? raw : `https://${raw}`
    const parsed = new URL(withScheme)
    return `${parsed.protocol}//${parsed.host}`.toLowerCase()
  } catch {
    return null
  }
}

const configuredOrigins = Array.from(
  new Set(
    (process.env.FRONTEND_ORIGIN ?? '')
      .split(',')
      .map((value: string) => parseOrigin(value))
      .filter((value): value is string => Boolean(value)),
  ),
)

const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (configuredOrigins.length === 0 || configuredOrigins.includes('*')) {
      callback(null, true)
      return
    }

    if (!origin) {
      callback(null, true)
      return
    }

    const normalizedOrigin = parseOrigin(origin)
    callback(normalizedOrigin && configuredOrigins.includes(normalizedOrigin) ? null : new Error('Not allowed by CORS'), normalizedOrigin !== null && configuredOrigins.includes(normalizedOrigin))
  },
  methods: ['POST', 'GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}

app.disable('x-powered-by')

app.use(cors(corsOptions))
app.options('*', cors(corsOptions))
app.use(express.json({ limit: '256kb' }))
app.use(accessLogger)

// Return a clean 403 for CORS rejections instead of an Express generic 500.
app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (err instanceof Error && err.message === 'Not allowed by CORS') {
    res.status(403).json({ error: 'CORS origin forbidden' })
    return
  }
  next(err)
})

app.use('/health', healthRouter)
app.use('/api/visit', visitRouter)

// API routes
app.use('/api/chat', chatRouter)
app.use('/api/recruit-chat', recruitChatRouter)
app.use('/api/recruit-chat/upload', recruitFileUploadRouter)
app.use('/api/contact', contactRouter)

// 404 fallback
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' })
})

const PORT = Number(process.env.PORT ?? 3000)
app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`)
})
