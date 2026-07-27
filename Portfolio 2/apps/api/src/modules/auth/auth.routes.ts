import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, noContent, ok } from '../../lib/http.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { authLimiter } from '../../middleware/rateLimit.js';
import * as service from './auth.service.js';
import { changePasswordSchema, loginSchema, updateProfileSchema } from './auth.schema.js';

export const authRouter = Router();

authRouter.post(
  '/login',
  authLimiter,
  validate({ body: loginSchema }),
  asyncHandler(async (req, res) => {
    ok(res, await service.login(req, res, req.body));
  }),
);

authRouter.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    ok(res, await service.refresh(req, res));
  }),
);

authRouter.post(
  '/logout',
  asyncHandler(async (req, res) => {
    await service.logout(req, res);
    noContent(res);
  }),
);

authRouter.post(
  '/logout-all',
  requireAuth,
  asyncHandler(async (req, res) => {
    await service.logoutEverywhere(req.user!.sub, res);
    noContent(res);
  }),
);

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    ok(res, await service.me(req.user!.sub));
  }),
);

authRouter.patch(
  '/me',
  requireAuth,
  validate({ body: updateProfileSchema }),
  asyncHandler(async (req, res) => {
    ok(res, await service.updateProfile(req.user!.sub, req.body));
  }),
);

authRouter.post(
  '/change-password',
  requireAuth,
  authLimiter,
  validate({ body: changePasswordSchema }),
  asyncHandler(async (req, res) => {
    await service.changePassword(req.user!.sub, req.body);
    noContent(res);
  }),
);

authRouter.get(
  '/sessions',
  requireAuth,
  asyncHandler(async (req, res) => {
    ok(res, await service.listSessions(req.user!.sub));
  }),
);

authRouter.delete(
  '/sessions/:id',
  requireAuth,
  validate({ params: z.object({ id: z.string().min(1) }) }),
  asyncHandler(async (req, res) => {
    await service.revokeSession(req.user!.sub, req.params.id!);
    noContent(res);
  }),
);
