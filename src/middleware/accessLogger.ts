import type { NextFunction, Request, Response } from 'express';

import { AccessLog } from '../db/models/AccessLog.js';

export function accessLogger(req: Request, res: Response, next: NextFunction): void {
  if (req.path === '/api/logs') {
    next();
    return;
  }

  const start = Date.now();

  res.on('finish', () => {
    const ip = (req.headers['x-forwarded-for'] ?? '').split(',')[0].trim() || req.socket?.remoteAddress || '-';

    void AccessLog.create({
      ip,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Date.now() - start,
      userAgent: req.headers['user-agent'] ?? null,
      referer: req.headers.referer ?? null,
    }).catch((error: Error) => {
      console.error('accessLogger insert failed:', error.message);
    });
  });

  next();
}
