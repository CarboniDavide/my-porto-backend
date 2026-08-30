import { Router } from 'express'

export const visitRouter = Router()

visitRouter.post('/', (_req, res) => {
  res.status(202).json({ ok: true })
})
