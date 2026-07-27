import type { NextFunction, Request, RequestHandler, Response } from 'express';

/** Wraps an async handler so rejected promises reach the Express error pipeline. */
export const asyncHandler =
  <T extends RequestHandler>(handler: T): RequestHandler =>
  (req: Request, res: Response, next: NextFunction) => {
    void Promise.resolve(handler(req, res, next)).catch(next);
  };

export interface PageMeta {
  total: number;
  page: number;
  perPage: number;
  pageCount: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export function paginate(total: number, page: number, perPage: number): PageMeta {
  const pageCount = Math.max(1, Math.ceil(total / perPage));
  return {
    total,
    page,
    perPage,
    pageCount,
    hasNext: page < pageCount,
    hasPrev: page > 1,
  };
}

export function ok<T>(res: Response, data: T, status = 200): Response {
  return res.status(status).json({ success: true, data });
}

export function okPaged<T>(res: Response, data: T[], meta: PageMeta): Response {
  return res.status(200).json({ success: true, data, meta });
}

export function noContent(res: Response): Response {
  return res.status(204).send();
}

/** Best-effort client IP that respects the configured proxy depth. */
export function clientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length) {
    return forwarded.split(',')[0]!.trim();
  }
  return req.ip ?? req.socket.remoteAddress ?? 'unknown';
}
