import type { Request, Response } from 'express';
import { prisma } from '../../lib/prisma.js';
import { env, isProd } from '../../config/env.js';
import { ConflictError, UnauthorizedError } from '../../lib/errors.js';
import { clientIp } from '../../lib/http.js';
import {
  createRefreshToken,
  fakeVerify,
  hashPassword,
  hashRefreshToken,
  signAccessToken,
  verifyPassword,
} from '../../lib/tokens.js';
import type { ChangePasswordInput, LoginInput, UpdateProfileInput } from './auth.schema.js';

const REFRESH_COOKIE = 'refresh_token';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'EDITOR' | 'VIEWER';
  avatarUrl: string | null;
  lastLoginAt: Date | null;
}

function setRefreshCookie(res: Response, token: string, expiresAt: Date): void {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'strict' : 'lax',
    path: '/api/auth',
    expires: expiresAt,
  });
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
}

async function issueSession(
  res: Response,
  req: Request,
  user: { id: string; email: string; name: string; role: SessionUser['role'] },
  remember: boolean,
): Promise<{ accessToken: string; expiresIn: string }> {
  const refresh = createRefreshToken(remember);

  await prisma.refreshToken.create({
    data: {
      tokenHash: refresh.tokenHash,
      userId: user.id,
      expiresAt: refresh.expiresAt,
      remember,
      ip: clientIp(req),
      userAgent: req.headers['user-agent']?.slice(0, 250) ?? null,
    },
  });

  setRefreshCookie(res, refresh.token, refresh.expiresAt);

  return {
    accessToken: signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    }),
    expiresIn: env.JWT_ACCESS_TTL,
  };
}

export async function login(req: Request, res: Response, input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  // Always burn the same CPU so response time cannot confirm an email exists.
  const valid = user ? await verifyPassword(user.passwordHash, input.password) : await fakeVerify(input.password);

  if (!user || !valid) throw new UnauthorizedError('Incorrect email or password');
  if (!user.active) throw new UnauthorizedError('This account has been deactivated');

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  const session = await issueSession(res, req, user, input.remember);

  return {
    ...session,
    user: toSessionUser({ ...user, lastLoginAt: new Date() }),
  };
}

export async function refresh(req: Request, res: Response) {
  const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
  if (!token) throw new UnauthorizedError('No active session');

  const record = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashRefreshToken(token) },
    include: { user: true },
  });

  if (!record || record.revokedAt || record.expiresAt < new Date()) {
    clearRefreshCookie(res);
    throw new UnauthorizedError('Session expired — please sign in again');
  }
  if (!record.user.active) {
    clearRefreshCookie(res);
    throw new UnauthorizedError('This account has been deactivated');
  }

  // Rotation: the presented token is burned and replaced on every refresh.
  await prisma.refreshToken.update({
    where: { id: record.id },
    data: { revokedAt: new Date() },
  });

  const session = await issueSession(res, req, record.user, record.remember);
  return { ...session, user: toSessionUser(record.user) };
}

export async function logout(req: Request, res: Response): Promise<void> {
  const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
  if (token) {
    await prisma.refreshToken.updateMany({
      where: { tokenHash: hashRefreshToken(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  clearRefreshCookie(res);
}

export async function logoutEverywhere(userId: string, res: Response): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  clearRefreshCookie(res);
}

export async function me(userId: string): Promise<SessionUser> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.active) throw new UnauthorizedError();
  return toSessionUser(user);
}

export async function changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new UnauthorizedError();

  const valid = await verifyPassword(user.passwordHash, input.currentPassword);
  if (!valid) throw new UnauthorizedError('Current password is incorrect');

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await hashPassword(input.newPassword) },
    }),
    // Force every other device to re-authenticate.
    prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
}

export async function updateProfile(userId: string, input: UpdateProfileInput): Promise<SessionUser> {
  if (input.email) {
    const clash = await prisma.user.findFirst({
      where: { email: input.email, NOT: { id: userId } },
      select: { id: true },
    });
    if (clash) throw new ConflictError('That email address is already in use');
  }

  const user = await prisma.user.update({ where: { id: userId }, data: input });
  return toSessionUser(user);
}

export async function listSessions(userId: string) {
  return prisma.refreshToken.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    select: { id: true, ip: true, userAgent: true, remember: true, createdAt: true, expiresAt: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function revokeSession(userId: string, sessionId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { id: sessionId, userId },
    data: { revokedAt: new Date() },
  });
}

/** Housekeeping — drops expired/revoked rows so the table stays small. */
export async function pruneExpiredTokens(): Promise<number> {
  const { count } = await prisma.refreshToken.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: new Date() } },
        { revokedAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      ],
    },
  });
  return count;
}

function toSessionUser(user: {
  id: string;
  email: string;
  name: string;
  role: SessionUser['role'];
  avatarUrl: string | null;
  lastLoginAt: Date | null;
}): SessionUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    avatarUrl: user.avatarUrl,
    lastLoginAt: user.lastLoginAt,
  };
}
