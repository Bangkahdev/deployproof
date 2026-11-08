import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';

export function notFound(_req: Request, _res: Response, next: NextFunction) {
  next(new AppError(404, 'Route not found'));
}

/** Never leaks stack traces or secrets to clients (REQ / 9.6). */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: 'Invalid request',
      errors: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }
  if (err instanceof AppError) {
    return res.status(err.status).json({ success: false, message: err.message, code: err.code });
  }
  const e = err as { type?: string; status?: number };
  if (e?.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Malformed JSON body' });
  }
  if (e?.type === 'entity.too.large') {
    return res.status(413).json({ success: false, message: 'Request body too large' });
  }
  console.error('[error]', err instanceof Error ? err.message : 'unknown error');
  return res.status(500).json({ success: false, message: 'Internal server error' });
}
