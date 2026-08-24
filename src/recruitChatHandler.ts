import type { Request, Response } from 'express'
import { RECRUIT_SYSTEM_PROMPT } from './chat/recruitPrompt.js'
import { enforceRateLimit, getClientIp } from './chat/rateLimit.js'
import { sanitizeMessages, type ChatRequest, type GroqResponse } from './chat/types.js'
import { isRecaptchaConfigured, verifyRecaptchaToken } from './security/recaptcha.js'

export async function recruitChatHandler(req: Request, res: Response): Promise<void> {
  if (!process.env.GROQ_API_KEY) {
    res.status(500).json({ error: 'Missing GROQ_API_KEY' })
    return
  }

  if (!isRecaptchaConfigured()) {
    res.status(500).json({ error: 'Missing RECAPTCHA_SECRET_KEY' })
    return
  }

  if (enforceRateLimit(res, getClientIp(req))) return

  let payload: ChatRequest
  try {
    payload = req.body as ChatRequest
  } catch {
    res.status(400).json({ error: 'Invalid JSON payload' })
    return
  }

  if (
    !payload.recaptchaToken
    || !(await verifyRecaptchaToken({ token: payload.recaptchaToken, expectedAction: 'chat_message' }))
  ) {
    res.status(403).json({ error: 'reCAPTCHA verification failed' })
    return
  }

  const messages = sanitizeMessages(payload)
  if (!messages.length) {
    res.status(400).json({ error: 'At least one chat message is required' })
    return
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL,
      messages: [{ role: 'system' as const, content: RECRUIT_SYSTEM_PROMPT }, ...messages],
      temperature: 0.6,
    }),
  })

  if (!response.ok) {
    res.status(response.status).json({ error: await response.text() })
    return
  }

  const data = (await response.json()) as GroqResponse
  res.json({
    reply: data.choices?.[0]?.message?.content?.trim() ?? '',
    usage: data.usage ?? null,
    model: process.env.GROQ_MODEL,
  })
}
