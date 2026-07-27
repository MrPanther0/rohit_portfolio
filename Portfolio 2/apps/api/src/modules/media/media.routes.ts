import { Router } from 'express';
import { z } from 'zod';
import type { MediaKind, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { storage } from '../../lib/storage.js';
import { asyncHandler, noContent, ok, okPaged, paginate } from '../../lib/http.js';
import { BadRequestError, NotFoundError } from '../../lib/errors.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { upload } from '../../middleware/upload.js';
import { uploadLimiter } from '../../middleware/rateLimit.js';
import { logger } from '../../lib/logger.js';

export const mediaRouter = Router();
mediaRouter.use(requireAuth);

function kindFor(mimeType: string): MediaKind {
  if (mimeType === 'application/json') return 'LOTTIE';
  if (mimeType.startsWith('image/')) return 'IMAGE';
  if (mimeType.startsWith('video/')) return 'VIDEO';
  if (mimeType.startsWith('audio/')) return 'AUDIO';
  return 'DOCUMENT';
}

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(120).default(40),
  kind: z.enum(['IMAGE', 'VIDEO', 'DOCUMENT', 'AUDIO', 'LOTTIE', 'ALL']).default('ALL'),
  folderId: z.string().optional(),
  search: z.string().max(120).optional(),
});

mediaRouter.get(
  '/',
  validate({ query: listQuerySchema }),
  asyncHandler(async (req, res) => {
    const { page, perPage, kind, folderId, search } = req.query as unknown as z.infer<
      typeof listQuerySchema
    >;

    const where: Prisma.MediaWhereInput = {
      ...(kind !== 'ALL' ? { kind } : {}),
      ...(folderId ? { folderId: folderId === 'root' ? null : folderId } : {}),
      ...(search
        ? {
            OR: [
              { filename: { contains: search, mode: 'insensitive' } },
              { alt: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, data] = await prisma.$transaction([
      prisma.media.count({ where }),
      prisma.media.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
    ]);

    okPaged(res, data, paginate(total, page, perPage));
  }),
);

mediaRouter.post(
  '/upload',
  requireRole('EDITOR'),
  uploadLimiter,
  upload.array('files', 20),
  asyncHandler(async (req, res) => {
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    if (!files.length) throw new BadRequestError('Attach at least one file');

    const folderId = typeof req.body.folderId === 'string' && req.body.folderId ? req.body.folderId : null;
    const folderName = folderId
      ? ((await prisma.folder.findUnique({ where: { id: folderId }, select: { name: true } }))?.name ??
        'library')
      : 'library';

    const created = [];
    for (const file of files) {
      const stored = await storage.save({
        buffer: file.buffer,
        filename: file.originalname,
        mimeType: file.mimetype,
        folder: folderName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      });

      created.push(
        await prisma.media.create({
          data: {
            url: stored.url,
            thumbnailUrl: stored.thumbnailUrl,
            storageKey: stored.storageKey,
            driver: stored.driver,
            filename: file.originalname,
            mimeType: file.mimetype,
            kind: kindFor(file.mimetype),
            size: file.size,
            width: stored.width,
            height: stored.height,
            blurDataUrl: stored.blurDataUrl,
            alt: file.originalname.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '),
            folderId,
          },
        }),
      );
    }

    logger.info({ count: created.length, driver: storage.name }, 'media uploaded');
    ok(res, created, 201);
  }),
);

mediaRouter.patch(
  '/:id',
  requireRole('EDITOR'),
  validate({
    params: z.object({ id: z.string().min(1) }),
    body: z.object({
      alt: z.string().max(240).nullish(),
      filename: z.string().min(1).max(200).optional(),
      folderId: z.string().nullish(),
    }),
  }),
  asyncHandler(async (req, res) => {
    ok(res, await prisma.media.update({ where: { id: req.params.id! }, data: req.body }));
  }),
);

/** Replaces the binary behind an existing media record, keeping every reference intact. */
mediaRouter.post(
  '/:id/replace',
  requireRole('EDITOR'),
  uploadLimiter,
  upload.single('file'),
  validate({ params: z.object({ id: z.string().min(1) }) }),
  asyncHandler(async (req, res) => {
    const file = req.file;
    if (!file) throw new BadRequestError('Attach a replacement file');

    const existing = await prisma.media.findUnique({ where: { id: req.params.id! } });
    if (!existing) throw new NotFoundError('Media');

    const stored = await storage.save({
      buffer: file.buffer,
      filename: file.originalname,
      mimeType: file.mimetype,
    });

    const updated = await prisma.media.update({
      where: { id: existing.id },
      data: {
        url: stored.url,
        thumbnailUrl: stored.thumbnailUrl,
        storageKey: stored.storageKey,
        driver: stored.driver,
        filename: file.originalname,
        mimeType: file.mimetype,
        kind: kindFor(file.mimetype),
        size: file.size,
        width: stored.width,
        height: stored.height,
        blurDataUrl: stored.blurDataUrl,
      },
    });

    await storage.remove(existing.storageKey).catch((error) => {
      logger.warn({ error, key: existing.storageKey }, 'failed to remove replaced asset');
    });

    ok(res, updated);
  }),
);

mediaRouter.delete(
  '/:id',
  requireRole('EDITOR'),
  validate({ params: z.object({ id: z.string().min(1) }) }),
  asyncHandler(async (req, res) => {
    const media = await prisma.media.findUnique({ where: { id: req.params.id! } });
    if (!media) throw new NotFoundError('Media');

    await prisma.media.delete({ where: { id: media.id } });
    await storage.remove(media.storageKey).catch((error) => {
      logger.warn({ error, key: media.storageKey }, 'orphaned asset left on disk');
    });

    noContent(res);
  }),
);

mediaRouter.post(
  '/bulk-delete',
  requireRole('EDITOR'),
  validate({ body: z.object({ ids: z.array(z.string().min(1)).min(1).max(200) }) }),
  asyncHandler(async (req, res) => {
    const items = await prisma.media.findMany({ where: { id: { in: req.body.ids } } });
    await prisma.media.deleteMany({ where: { id: { in: items.map((i) => i.id) } } });
    await Promise.allSettled(items.map((i) => storage.remove(i.storageKey)));
    ok(res, { deleted: items.length });
  }),
);

// ── Folders ──────────────────────────────────────────────────────────────────

export const folderRouter = Router();
folderRouter.use(requireAuth);

folderRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const folders = await prisma.folder.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { media: true, children: true } } },
    });
    ok(res, folders);
  }),
);

folderRouter.post(
  '/',
  requireRole('EDITOR'),
  validate({
    body: z.object({ name: z.string().min(1).max(60), parentId: z.string().nullish() }),
  }),
  asyncHandler(async (req, res) => {
    ok(res, await prisma.folder.create({ data: req.body }), 201);
  }),
);

folderRouter.patch(
  '/:id',
  requireRole('EDITOR'),
  validate({
    params: z.object({ id: z.string().min(1) }),
    body: z.object({ name: z.string().min(1).max(60).optional(), parentId: z.string().nullish() }),
  }),
  asyncHandler(async (req, res) => {
    ok(res, await prisma.folder.update({ where: { id: req.params.id! }, data: req.body }));
  }),
);

folderRouter.delete(
  '/:id',
  requireRole('EDITOR'),
  validate({ params: z.object({ id: z.string().min(1) }) }),
  asyncHandler(async (req, res) => {
    await prisma.folder.delete({ where: { id: req.params.id! } });
    noContent(res);
  }),
);
