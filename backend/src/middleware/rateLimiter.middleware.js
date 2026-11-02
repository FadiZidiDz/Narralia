import rateLimit from 'express-rate-limit';

// Global rate limiter
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per IP
  message: { error: 'Too many requests, please try again later.' }
});

// Stricter limiter for AI generation (expensive)
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: { error: 'AI rate limit exceeded. Please wait a minute.' }
});

// Limiter for writing/auto-save
export const writingLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  message: { error: 'Slow down! Too many writing updates.' }
});

/** Illustration generation (Pollinations / HF) — expensive */
export const illustrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 8,
  message: { error: 'Too many illustration requests. Try again later.' }
});
