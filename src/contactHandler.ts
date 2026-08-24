import type { Request, Response } from 'express'
import nodemailer from 'nodemailer'
import { isRecaptchaConfigured, verifyRecaptchaToken } from './security/recaptcha.js'

interface ContactRequest {
  name?: string
  email?: string
  subject?: string
  message?: string
  recaptchaToken?: string
}

export async function contactHandler(req: Request, res: Response): Promise<void> {
  const contactToEmail = process.env.CONTACT_TO_EMAIL ?? process.env.GMAIL_USER

  const missing = ['GMAIL_USER', 'GMAIL_APP_PASSWORD'].filter((k) => !process.env[k])
  if (!isRecaptchaConfigured()) {
    missing.push('RECAPTCHA_SECRET_KEY')
  }

  if (missing.length > 0) {
    console.error('Missing env vars:', missing)
    res.status(500).json({ error: 'Server misconfigured' })
    return
  }

  const payload = req.body as ContactRequest
  const { name, email, subject, message, recaptchaToken } = payload

  if (
    !recaptchaToken
    || !(await verifyRecaptchaToken({ token: recaptchaToken, expectedAction: 'contact_form' }))
  ) {
    res.status(403).json({ error: 'reCAPTCHA verification failed' })
    return
  }

  if (!name?.trim() || !email?.trim() || !subject?.trim() || !message?.trim()) {
    res.status(400).json({ error: 'All fields are required' })
    return
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    res.status(400).json({ error: 'Invalid email address' })
    return
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  })

  try {
    await transporter.sendMail({
      from: process.env.CONTACT_FROM_EMAIL ?? `"${name}" <${process.env.GMAIL_USER}>`,
      replyTo: email,
      to: contactToEmail,
      subject: `[Portfolio] ${subject}`,
      text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
      html: `<p><strong>Name:</strong> ${name}</p><p><strong>Email:</strong> ${email}</p><hr/><p>${message.replace(/\n/g, '<br/>')}</p>`,
    })
  } catch (error) {
    console.error('Failed to send contact email:', error)
    res.status(500).json({ error: 'Email delivery failed' })
    return
  }

  res.json({ success: true })
}
