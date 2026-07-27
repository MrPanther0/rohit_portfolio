import rateLimit, { type Options } from 'express-rate-limit';
import { env } from '../config/env.js';
import { TooManyRequestsError } from '../lib/errors.js';

const base: Partial<Options> = {
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, _res, next) => next(new TooManyRequestsError()),
};

/** Broad protection for every public endpoint. */
export const globalLimiter = rateLimit({
  ...base,
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX,
});

/** Credential-stuffing brake: 8 attempts per 15 minutes per IP. */
export const authLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 8,
  skipSuccessfulRequests: true,
  handler: (_req, _res, next) =>
    next(new TooManyRequestsError('Too many sign-in attempts. Try again in 15 minutes.')),
});

/** Contact form — deters drive-by spam without blocking genuine enquiries. */
export const contactLimiter = rateLimit({
  ...base,
  windowMs: 60 * 60 * 1000,
  limit: 5,
  handler: (_req, _res, next) =>
    next(new TooManyRequestsError('You have already sent several messages. Please try again later.')),
});

/** Uploads are expensive; cap concurrency per IP. */
export const uploadLimiter = rateLimit({
  ...base,
  windowMs: 10 * 60 * 1000,
  limit: 120,
});

/** Analytics beacons are high-volume but cheap. */
export const beaconLimiter = rateLimit({
  ...base,
  windowMs: 60 * 1000,
  limit: 120,
});
