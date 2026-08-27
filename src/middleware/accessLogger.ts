import type { NextFunction, Request, Response } from 'express';

import { AccessLog } from '../db/models/AccessLog.js';

type LogCriteria = {
  path?: string | RegExp;
  method?: string | string[];
  excludeBots?: boolean;
};

abstract class LogRouteRule {
  protected readonly nextRule?: LogRouteRule;

  constructor(nextRule?: LogRouteRule) {
    this.nextRule = nextRule;
  }

  public shouldLog(req: Request): boolean {
    if (!this.matches(req)) {
      return false;
    }

    if (this.nextRule) {
      return this.nextRule.shouldLog(req);
    }

    return true;
  }

  protected abstract matches(req: Request): boolean;
}

class RouteLogRule extends LogRouteRule {
  private readonly criteria: LogCriteria;

  constructor(criteria: LogCriteria, nextRule?: LogRouteRule) {
    super(nextRule);
    this.criteria = criteria;
  }

  protected matches(req: Request): boolean {
    if (this.criteria.path !== undefined && !matchesPath(req.path, this.criteria.path)) {
      return false;
    }

    if (this.criteria.method !== undefined && !matchesMethod(req.method, this.criteria.method)) {
      return false;
    }

    if (this.criteria.excludeBots && isBotUserAgent(req)) {
      return false;
    }

    return true;
  }
}

const LOGGED_ROUTES: LogRouteRule[] = [
  new RouteLogRule({
    path: '/api/visit',
    method: 'POST',
    excludeBots: true,
  }),
  new RouteLogRule({
    path: '/api/chat',
    method: 'POST',
    excludeBots: true,
  }),
];

function matchesPath(currentPath: string, expectedPath: string | RegExp): boolean {
  if (expectedPath instanceof RegExp) {
    return expectedPath.test(currentPath);
  }

  return currentPath === expectedPath;
}

function matchesMethod(currentMethod: string, expectedMethod: string | string[]): boolean {
  if (Array.isArray(expectedMethod)) {
    return expectedMethod.includes(currentMethod.toUpperCase());
  }

  return currentMethod.toUpperCase() === expectedMethod.toUpperCase();
}

function isBotUserAgent(req: Request): boolean {
  return typeof req.headers['user-agent'] === 'string' && /bot|crawl|spider|slurp|bingpreview|duckduckbot|facebookexternalhit|headless|wget|curl|python-requests/i.test(req.headers['user-agent']);
}

function shouldLogRoute(req: Request): boolean {
  return LOGGED_ROUTES.some((rule) => rule.shouldLog(req));
}

export function accessLogger(req: Request, res: Response, next: NextFunction): void {
  if (!shouldLogRoute(req)) {
    next();
    return;
  }

  const start = Date.now();

  res.on('finish', () => {
    const forwardedFor = req.headers['x-forwarded-for'];
    const ip = (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor ?? '').split(',')[0].trim() || req.socket?.remoteAddress || '-';

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
