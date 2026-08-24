import type { Response } from 'express'

type RateLimitMap = Map<string, number[]>

function getEnvNumber(name: string, fallback: number) {
  const value = Number(process.env[name])
  return Number.isFinite(value) && value > 0 ? value : fallback
}

const RATE_LIMIT_WINDOW_MS = getEnvNumber('CHAT_RATE_LIMIT_WINDOW_MS', 60_000)
const RATE_LIMIT_MAX_REQUESTS = getEnvNumber('CHAT_RATE_LIMIT_MAX_REQUESTS', 8)
const RATE_LIMIT_MIN_INTERVAL_MS = getEnvNumber('CHAT_RATE_LIMIT_MIN_INTERVAL_MS', 3_000)

// In-memory store — resets on dyno restart, which is fine for rate limiting
const requestLogByIp: RateLimitMap = new Map()

/**
 * Returns true and sends a 429 response if the request should be rate-limited.
 * Returns false if the request should proceed.
 */
export function enforceRateLimit(res: Response, clientIp: string): boolean {
  const now = Date.now()
  const requestTimestamps =
    requestLogByIp.get(clientIp)?.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS) ?? []

  const lastRequestTime = requestTimestamps[requestTimestamps.length - 1]
  if (lastRequestTime && now - lastRequestTime < RATE_LIMIT_MIN_INTERVAL_MS) {
    const retryAfter = Math.ceil((RATE_LIMIT_MIN_INTERVAL_MS - (now - lastRequestTime)) / 1000)
    res.setHeader('Retry-After', String(retryAfter))
    res.status(429).json({ error: 'Too many requests. Please wait a moment before sending a new message.' })
    return true
  }

  if (requestTimestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    const retryAfter = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - requestTimestamps[0])) / 1000)
    res.setHeader('Retry-After', String(retryAfter))
    res.status(429).json({ error: 'Rate limit reached. Please retry in a minute.' })
    return true
  }

  requestTimestamps.push(now)
  requestLogByIp.set(clientIp, requestTimestamps)
  return false
}

export function getClientIp(req: { headers: Record<string, string | string[] | undefined>; socket: { remoteAddress?: string } }): string {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string') return forwarded.split(',')[0]?.trim() ?? 'unknown'
  return req.socket.remoteAddress ?? 'unknown'
}
