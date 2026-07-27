import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { Role } from '@prisma/client';
import { ForbiddenError, UnauthorizedError } from '../lib/errors.js';
import { verifyAccessToken, type AccessTokenPayload } from '../lib/tokens.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7).trim();
  const cookie = req.cookies?.access_token;
  return typeof cookie === 'string' && cookie.length ? cookie : null;
}

/** Rejects the request unless a valid access token is present. */
export const requireAuth: RequestHandler = (req, _res, next) => {
  const token = extractToken(req);
  if (!token) return next(new UnauthorizedError());
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch (error) {
    next(error);
  }
};

/** Attaches req.user when a token is present but never blocks the request. */
export const optionalAuth: RequestHandler = (req, _res, next) => {
  const token = extractToken(req);
  if (token) {
    try {
      req.user = verifyAccessToken(token);
    } catch {
      /* anonymous — ignore malformed tokens on public routes */
    }
  }
  next();
};

const RANK: Record<Role, number> = { VIEWER: 0, EDITOR: 1, ADMIN: 2 };

/** Role gate. `requireRole('EDITOR')` also admits ADMIN. */
export function requireRole(minimum: Role): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new UnauthorizedError());
    if (RANK[req.user.role] < RANK[minimum]) {
      return next(new ForbiddenError(`Requires ${minimum} privileges or higher`));
    }
    next();
  };
}
