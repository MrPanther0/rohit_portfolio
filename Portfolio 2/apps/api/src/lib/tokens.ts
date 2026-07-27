import crypto from 'node:crypto';
import { promisify } from 'node:util';
import jwt, { type SignOptions } from 'jsonwebtoken';
import type { Role } from '@prisma/client';
import { env } from '../config/env.js';
import { UnauthorizedError } from './errors.js';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: Role;
  name: string;
}

// ── Password hashing ─────────────────────────────────────────────────────────
//
// scrypt from node:crypto — a memory-hard KDF recommended by OWASP, with no
// native module to compile. Parameters follow the OWASP cheat sheet
// (N=2^16, r=8, p=1 ≈ 64 MiB per hash).

const scryptAsync = promisify(crypto.scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: crypto.ScryptOptions,
) => Promise<Buffer>;

const SCRYPT: Required<Pick<crypto.ScryptOptions, 'N' | 'r' | 'p' | 'maxmem'>> = {
  N: 65536,
  r: 8,
  p: 1,
  maxmem: 128 * 65536 * 8 * 2, // headroom above 128·N·r
};

const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

/** Encodes as `scrypt$N$r$p$salt$hash`, so parameters can be raised later without breaking old hashes. */
export async function hashPassword(plain: string): Promise<string> {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const derived = await scryptAsync(plain.normalize('NFKC'), salt, KEY_LENGTH, SCRYPT);
  return [
    'scrypt',
    SCRYPT.N,
    SCRYPT.r,
    SCRYPT.p,
    salt.toString('base64url'),
    derived.toString('base64url'),
  ].join('$');
}

export async function verifyPassword(stored: string, plain: string): Promise<boolean> {
  try {
    const [scheme, n, r, p, salt, hash] = stored.split('$');
    if (scheme !== 'scrypt' || !n || !r || !p || !salt || !hash) return false;

    const expected = Buffer.from(hash, 'base64url');
    const derived = await scryptAsync(plain.normalize('NFKC'), Buffer.from(salt, 'base64url'), expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
      maxmem: 128 * Number(n) * Number(r) * 2,
    });

    return derived.length === expected.length && crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

/**
 * Burns roughly the same CPU as a real verification. Called when the email is
 * unknown so response time does not reveal whether an account exists.
 */
export async function fakeVerify(plain: string): Promise<false> {
  await scryptAsync(plain.normalize('NFKC'), crypto.randomBytes(SALT_LENGTH), KEY_LENGTH, SCRYPT).catch(
    () => Buffer.alloc(0),
  );
  return false;
}

// ── JWT access tokens ────────────────────────────────────────────────────────

export function signAccessToken(payload: AccessTokenPayload): string {
  const options: SignOptions = {
    expiresIn: env.JWT_ACCESS_TTL as SignOptions['expiresIn'],
    issuer: 'portfolio-api',
    audience: 'portfolio-admin',
  };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, options);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET, {
      issuer: 'portfolio-api',
      audience: 'portfolio-admin',
    }) as AccessTokenPayload;
  } catch {
    throw new UnauthorizedError('Session expired or invalid');
  }
}

// ── Refresh tokens ───────────────────────────────────────────────────────────

export interface RefreshTokenBundle {
  token: string;
  tokenHash: string;
  expiresAt: Date;
}

/**
 * Opaque random strings. Only a keyed SHA-256 digest is persisted, so a
 * database leak alone cannot be replayed against the API.
 */
export function createRefreshToken(remember: boolean): RefreshTokenBundle {
  const token = crypto.randomBytes(48).toString('base64url');
  const days = remember ? env.JWT_REFRESH_REMEMBER_TTL_DAYS : env.JWT_REFRESH_TTL_DAYS;
  return {
    token,
    tokenHash: hashRefreshToken(token),
    expiresAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
  };
}

export function hashRefreshToken(token: string): string {
  return crypto.createHmac('sha256', env.JWT_REFRESH_SECRET).update(token).digest('hex');
}
