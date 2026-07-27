import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler, noContent, ok } from '../../lib/http.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { hashPassword } from '../../lib/tokens.js';
import { BadRequestError, ConflictError, NotFoundError } from '../../lib/errors.js';
import { passwordSchema } from '../auth/auth.schema.js';

export const usersRouter = Router();
usersRouter.use(requireAuth, requireRole('ADMIN'));

const publicFields = {
  id: true,
  email: true,
  name: true,
  role: true,
  avatarUrl: true,
  active: true,
  lastLoginAt: true,
  createdAt: true,
} as const;

usersRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    ok(res, await prisma.user.findMany({ select: publicFields, orderBy: { createdAt: 'asc' } }));
  }),
);

usersRouter.post(
  '/',
  validate({
    body: z.object({
      email: z.string().email().toLowerCase().trim(),
      name: z.string().min(2).max(80),
      password: passwordSchema,
      role: z.enum(['ADMIN', 'EDITOR', 'VIEWER']).default('EDITOR'),
    }),
  }),
  asyncHandler(async (req, res) => {
    const { password, ...rest } = req.body as {
      email: string;
      name: string;
      password: string;
      role: 'ADMIN' | 'EDITOR' | 'VIEWER';
    };

    const clash = await prisma.user.findUnique({ where: { email: rest.email }, select: { id: true } });
    if (clash) throw new ConflictError('A user with that email already exists');

    const user = await prisma.user.create({
      data: { ...rest, passwordHash: await hashPassword(password) },
      select: publicFields,
    });

    ok(res, user, 201);
  }),
);

usersRouter.patch(
  '/:id',
  validate({
    params: z.object({ id: z.string().min(1) }),
    body: z.object({
      name: z.string().min(2).max(80).optional(),
      email: z.string().email().toLowerCase().trim().optional(),
      role: z.enum(['ADMIN', 'EDITOR', 'VIEWER']).optional(),
      active: z.boolean().optional(),
      password: passwordSchema.optional(),
    }),
  }),
  asyncHandler(async (req, res) => {
    const id = req.params.id!;
    const { password, ...rest } = req.body as Record<string, unknown> & { password?: string };

    const target = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
    if (!target) throw new NotFoundError('User');

    // Guard against locking every administrator out of the dashboard.
    const demoting = (rest.role && rest.role !== 'ADMIN') || rest.active === false;
    if (target.role === 'ADMIN' && demoting) {
      const admins = await prisma.user.count({ where: { role: 'ADMIN', active: true } });
      if (admins <= 1) throw new BadRequestError('At least one active administrator must remain');
    }

    const user = await prisma.user.update({
      where: { id },
      data: { ...rest, ...(password ? { passwordHash: await hashPassword(password) } : {}) },
      select: publicFields,
    });

    if (password || rest.active === false) {
      await prisma.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    ok(res, user);
  }),
);

usersRouter.delete(
  '/:id',
  validate({ params: z.object({ id: z.string().min(1) }) }),
  asyncHandler(async (req, res) => {
    const id = req.params.id!;
    if (id === req.user!.sub) throw new BadRequestError('You cannot delete your own account');

    const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
    if (!target) throw new NotFoundError('User');

    if (target.role === 'ADMIN') {
      const admins = await prisma.user.count({ where: { role: 'ADMIN', active: true } });
      if (admins <= 1) throw new BadRequestError('At least one active administrator must remain');
    }

    await prisma.user.delete({ where: { id } });
    noContent(res);
  }),
);
