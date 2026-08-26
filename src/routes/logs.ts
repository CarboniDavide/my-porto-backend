import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';

import { AccessLog } from '../db/models/AccessLog.js';

export const logsRouter = Router();

function authenticate(req: Request, res: Response, next: NextFunction): void {
  const key = process.env.LOG_ACCESS_KEY;
  if (!key) {
    res.status(503).json({ error: 'LOG_ACCESS_KEY not configured' });
    return;
  }
  if (req.query.key !== key) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

logsRouter.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 500, 5000);
    const rows = await AccessLog.findAll({ order: [['id', 'DESC']], limit });
    res.json(rows);
  } catch (error) {
    next(error);
  }
});
