import type { Request, Response } from 'express'

export function wakeupHandler(_req: Request, res: Response): void {
  res.json({
    status: 'awake',
    now: new Date().toISOString(),
  })
}
