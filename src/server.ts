import type { Request, Response, NextFunction } from 'express'
import express from 'express'
import cors, { type CorsOptions } from 'cors'
import { chatHandler } from './chatHandler.js'
import { recruitChatHandler } from './recruitChatHandler.js'

import { contactHandler } from './contactHandler.js'
import { uploadRecruitFileHandler } from './recruitFileUploadHandler.js'
import { accessLogger } from './middleware/accessLogger.js'
import { logsRouter } from './routes/logs.js'

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

app.post('/api/visit', (_req: Request, res: Response) => {
  res.status(202).json({ ok: true })
})

// Return a clean 403 for CORS rejections instead of an Express generic 500.
app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (err instanceof Error && err.message === 'Not allowed by CORS') {
    res.status(403).json({ error: 'CORS origin forbidden' })
    return
  }
  next(err)
})

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' })
})

// API routes
app.use('/api/logs', logsRouter)
app.post('/api/chat', (req: Request, res: Response) => { void chatHandler(req, res) })
app.post('/api/recruit-chat', (req: Request, res: Response) => { void recruitChatHandler(req, res) })

app.post('/api/recruit-chat/upload', uploadRecruitFileHandler)
app.post('/api/contact', (req: Request, res: Response) => { void contactHandler(req, res) })

// 404 fallback
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' })
})

const PORT = Number(process.env.PORT ?? 3000)
app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`)
})
