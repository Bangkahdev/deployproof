import rateLimit from 'express-rate-limit';

const base = { standardHeaders: true, legacyHeaders: false } as const;

export const webhookLimiter = rateLimit({
  ...base,
  windowMs: 60_000,
  limit: 60,
  message: { success: false, message: 'Too many requests' },
});

export const verifyLimiter = rateLimit({
  ...base,
  windowMs: 60_000,
  limit: 30,
  message: { success: false, message: 'Too many requests' },
});

export const apiLimiter = rateLimit({
  ...base,
  windowMs: 60_000,
  limit: 240,
  message: { success: false, message: 'Too many requests' },
});
