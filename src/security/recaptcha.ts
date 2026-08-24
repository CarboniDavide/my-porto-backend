interface RecaptchaVerificationResponse {
  success: boolean
  score?: number
  action?: string
  hostname?: string
  'error-codes'?: string[]
}

function getRecaptchaMinScore(): number {
  const raw = Number(process.env.RECAPTCHA_MIN_SCORE ?? '0.5')
  if (Number.isNaN(raw)) return 0.5
  if (raw < 0) return 0
  if (raw > 1) return 1
  return raw
}

export type VerifyRecaptchaOptions = {
  token: string
  expectedAction?: string
}

export function isRecaptchaConfigured(): boolean {
  return Boolean(process.env.RECAPTCHA_SECRET_KEY)
}

export async function verifyRecaptchaToken({
  token,
  expectedAction,
}: VerifyRecaptchaOptions): Promise<boolean> {
  const secret = process.env.RECAPTCHA_SECRET_KEY
  const minScore = getRecaptchaMinScore()
  if (!secret) return false

  try {
    const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${encodeURIComponent(secret)}&response=${encodeURIComponent(token)}`,
    })

    if (!res.ok) {
      console.error('reCAPTCHA siteverify request failed', { status: res.status })
      return false
    }

    const data = (await res.json()) as RecaptchaVerificationResponse
    const hasScore = typeof data.score === 'number'
    const isScoreValid = !hasScore || (data.score !== undefined && data.score >= minScore)
    const isActionValid = !expectedAction || data.action === expectedAction
    const isValid = data.success && isScoreValid && isActionValid

    if (!isValid) {
      console.error('reCAPTCHA verification rejected', {
        success: data.success,
        score: data.score,
        minScore,
        action: data.action,
        expectedAction,
        hostname: data.hostname,
        errors: data['error-codes'],
      })
    }

    return isValid
  } catch {
    return false
  }
}
