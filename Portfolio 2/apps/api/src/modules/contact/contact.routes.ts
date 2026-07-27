import { Router } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler, clientIp, noContent, ok, paginate } from '../../lib/http.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { contactLimiter } from '../../middleware/rateLimit.js';
import { BadRequestError } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';

const submitSchema = z.object({
  name: z.string().min(2, 'Tell me your name').max(80).trim(),
  email: z.string().email('Enter a valid email address').max(160).toLowerCase().trim(),
  subject: z.string().max(140).nullish(),
  budget: z.string().max(60).nullish(),
  message: z.string().min(10, 'Add a little more detail').max(5000).trim(),
  /** Honeypot — real humans never see or fill this field. */
  website: z.string().max(0).optional(),
});

export const publicContactRouter = Router();

publicContactRouter.post(
  '/',
  contactLimiter,
  validate({ body: submitSchema }),
  asyncHandler(async (req, res) => {
    const { website, ...input } = req.body as z.infer<typeof submitSchema>;
    if (website) throw new BadRequestError('Submission rejected');

    const request = await prisma.contactRequest.create({
      data: {
        ...input,
        ip: clientIp(req),
        userAgent: req.headers['user-agent']?.slice(0, 250) ?? null,
        referrer: (req.headers.referer as string | undefined)?.slice(0, 250) ?? null,
      },
      select: { id: true, createdAt: true },
    });

    logger.info({ id: request.id }, 'contact request received');
    ok(res, { id: request.id, receivedAt: request.createdAt }, 201);
  }),
);

// ── Admin inbox ──────────────────────────────────────────────────────────────

export const adminContactRouter = Router();
adminContactRouter.use(requireAuth);

const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['NEW', 'READ', 'REPLIED', 'ARCHIVED', 'SPAM', 'ALL']).default('ALL'),
  search: z.string().max(120).optional(),
});

adminContactRouter.get(
  '/',
  validate({ query: listQuery }),
  asyncHandler(async (req, res) => {
    const { page, perPage, status, search } = req.query as unknown as z.infer<typeof listQuery>;

    const where: Prisma.ContactRequestWhereInput = {
      ...(status !== 'ALL' ? { status } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { message: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, data, unread] = await prisma.$transaction([
      prisma.contactRequest.count({ where }),
      prisma.contactRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.contactRequest.count({ where: { status: 'NEW' } }),
    ]);

    res.status(200).json({ success: true, data, meta: { ...paginate(total, page, perPage), unread } });
  }),
);

adminContactRouter.patch(
  '/:id',
  requireRole('EDITOR'),
  validate({
    params: z.object({ id: z.string().min(1) }),
    body: z.object({
      status: z.enum(['NEW', 'READ', 'REPLIED', 'ARCHIVED', 'SPAM']).optional(),
      notes: z.string().max(2000).nullish(),
    }),
  }),
  asyncHandler(async (req, res) => {
    ok(res, await prisma.contactRequest.update({ where: { id: req.params.id! }, data: req.body }));
  }),
);

adminContactRouter.delete(
  '/:id',
  requireRole('ADMIN'),
  validate({ params: z.object({ id: z.string().min(1) }) }),
  asyncHandler(async (req, res) => {
    await prisma.contactRequest.delete({ where: { id: req.params.id! } });
    noContent(res);
  }),
);
