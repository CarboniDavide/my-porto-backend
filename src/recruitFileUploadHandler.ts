import type { NextFunction, Request, Response } from 'express'
import multer from 'multer'
import pdfParse from 'pdf-parse'
import { RECRUIT_SYSTEM_PROMPT } from './chat/recruitPrompt.js'
import { enforceRateLimit, getClientIp } from './chat/rateLimit.js'
import { isRecaptchaConfigured, verifyRecaptchaToken } from './security/recaptcha.js'
import validator from 'validator'

// Multer setup for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max
  fileFilter: (_req, file, cb) => {
    if (
      file.mimetype === 'text/plain' ||
      file.mimetype === 'application/pdf' ||
      file.originalname.endsWith('.txt') ||
      file.originalname.endsWith('.pdf')
    ) {
      cb(null, true)
    } else {
      cb(new Error('Invalid file type'))
    }
  },
})

// Handler for /api/recruit-chat/upload
export const uploadRecruitFileHandler = [
  (req: Request, res: Response, next: NextFunction) => {
    if (!process.env.GROQ_API_KEY) {
      res.status(500).json({ error: 'Missing GROQ_API_KEY' })
      return
    }

    if (!isRecaptchaConfigured()) {
      res.status(500).json({ error: 'Missing RECAPTCHA_SECRET_KEY' })
      return
    }

    if (enforceRateLimit(res, getClientIp(req))) return
    next()
  },
  upload.single('file'),
  async (req: Request, res: Response) => {
    const recaptchaToken = req.body?.recaptchaToken
    if (
      typeof recaptchaToken !== 'string'
      || !(await verifyRecaptchaToken({ token: recaptchaToken, expectedAction: 'chat_message' }))
    ) {
      res.status(403).json({ error: 'reCAPTCHA verification failed' })
      return
    }

    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' })
      return
    }
    // Security: check file type and size again
    const { mimetype, buffer, originalname } = req.file
    if (
      !(
        mimetype === 'text/plain' ||
        mimetype === 'application/pdf' ||
        originalname.endsWith('.txt') ||
        originalname.endsWith('.pdf')
      )
    ) {
      res.status(400).json({ error: 'Invalid file type' })
      return
    }
    if (buffer.length > 2 * 1024 * 1024) {
      res.status(400).json({ error: 'File too large' })
      return
    }
    // Extract text
    let text = ''
    try {
      if (mimetype === 'text/plain' || originalname.endsWith('.txt')) {
        text = buffer.toString('utf-8')
      } else if (mimetype === 'application/pdf' || originalname.endsWith('.pdf')) {
        const pdfData = await pdfParse(buffer)
        text = pdfData.text
      }
    } catch {
      res.status(400).json({ error: 'Failed to extract text from file' })
      return
    }
    // Advanced sanitization
    text = sanitizePlainText(text)
    // Advanced plain text sanitization: removes control chars, trims, limits length, strips dangerous unicode
    function sanitizePlainText(input: string): string {
      let out = input
        // Remove null bytes and control chars except \n, \r, \t
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        // Remove non-printable unicode (except basic Latin, Latin-1 Supplement, and common whitespace)
        .replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g, '')
        // Remove excessive whitespace
        .replace(/\s{3,}/g, ' ')
        .trim()
      // Optionally escape HTML entities (defense-in-depth)
      out = validator.escape(out)
      // Limit length (e.g. 8000 chars)
      if (out.length > 8000) out = out.slice(0, 8000)
      return out
    }
    if (!text) {
      res.status(400).json({ error: 'File is empty or unreadable' })
      return
    }
    // Pass extracted text to Groq
    try {
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: process.env.GROQ_MODEL,
          messages: [
            { role: 'system', content: RECRUIT_SYSTEM_PROMPT },
            { role: 'user', content: text },
          ],
          temperature: 0.6,
        }),
      })
      if (!groqRes.ok) {
        res.status(groqRes.status).json({ error: await groqRes.text() })
        return
      }
      const data = await groqRes.json()
      res.json({
        reply: data.choices?.[0]?.message?.content?.trim() ?? '',
        usage: data.usage ?? null,
        model: process.env.GROQ_MODEL,
        extractedText: text,
      })
    } catch (err) {
      res.status(500).json({ error: 'Failed to analyze file with Groq', details: (err as Error).message })
    }
  },
]
