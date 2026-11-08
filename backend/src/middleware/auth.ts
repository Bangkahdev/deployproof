import { createHash, timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { AppError } from '../utils/errors';

/** Constant-time comparison (hash both sides so lengths always match). */
export function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function webhookAuth(req: Request, _res: Response, next: NextFunction) {
  const provided = req.header('x-webhook-secret') ?? '';
  if (!provided || !safeEqual(provided, env.WEBHOOK_SECRET)) {
    return next(new AppError(401, 'Invalid webhook secret'));
  }
  next();
}

export function dashboardAuth(req: Request, _res: Response, next: NextFunction) {
  const provided = req.header('x-api-key') ?? '';
  if (!provided || !safeEqual(provided, env.DASHBOARD_API_KEY)) {
    return next(new AppError(401, 'Invalid or missing API key'));
  }
  next();
}
