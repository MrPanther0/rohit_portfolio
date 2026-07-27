import { Router } from 'express';
import { z, type ZodTypeAny } from 'zod';
import type { Role } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler, noContent, ok } from '../../lib/http.js';
import { NotFoundError } from '../../lib/errors.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { uniqueSlug } from '../../lib/slug.js';

/** Minimal structural type covering the Prisma delegate methods the factory uses. */
interface Delegate {
  findMany(args?: unknown): Promise<unknown[]>;
  findUnique(args: unknown): Promise<unknown | null>;
  create(args: unknown): Promise<unknown>;
  update(args: unknown): Promise<unknown>;
  delete(args: unknown): Promise<unknown>;
}

export type CrudModel = 'category' | 'tag' | 'testimonial' | 'client' | 'service' | 'award';

export interface CrudConfig {
  model: CrudModel;
  resource: string;
  createSchema: ZodTypeAny;
  updateSchema: ZodTypeAny;
  include?: Record<string, unknown>;
  orderBy: Record<string, unknown> | Record<string, unknown>[];
  /** Extra filter applied to the public router only (e.g. `{ published: true }`). */
  publicWhere?: Record<string, unknown>;
  /** Field used to derive a unique slug on create/update. */
  slugFrom?: 'name' | 'title';
  deleteRole?: Role;
  writeRole?: Role;
}

const idParams = z.object({ id: z.string().min(1) });
const reorderBody = z.object({
  items: z.array(z.object({ id: z.string().min(1), order: z.number().int().min(0) })).min(1).max(300),
});

export interface CrudRouters {
  publicRouter: Router;
  adminRouter: Router;
}

export function createCrudRouters(config: CrudConfig): CrudRouters {
  const {
    model,
    resource,
    createSchema,
    updateSchema,
    include,
    orderBy,
    publicWhere,
    slugFrom,
    deleteRole = 'ADMIN',
    writeRole = 'EDITOR',
  } = config;

  const delegate = prisma[model] as unknown as Delegate;
  const query = { ...(include ? { include } : {}), orderBy };

  const withSlug = async (data: Record<string, unknown>, ignoreId?: string) => {
    if (!slugFrom) return data;
    const source = data[slugFrom];
    if (typeof source !== 'string' || !source) return data;
    if (model !== 'category' && model !== 'tag') return data;
    return { ...data, slug: await uniqueSlug(model, source, ignoreId) };
  };

  // ── public ────────────────────────────────────────────────────────────────
  const publicRouter = Router();

  publicRouter.get(
    '/',
    asyncHandler(async (_req, res) => {
      ok(res, await delegate.findMany({ ...query, ...(publicWhere ? { where: publicWhere } : {}) }));
    }),
  );

  // ── admin ─────────────────────────────────────────────────────────────────
  const adminRouter = Router();
  adminRouter.use(requireAuth);

  adminRouter.get(
    '/',
    asyncHandler(async (_req, res) => {
      ok(res, await delegate.findMany(query));
    }),
  );

  adminRouter.get(
    '/:id',
    validate({ params: idParams }),
    asyncHandler(async (req, res) => {
      const record = await delegate.findUnique({ where: { id: req.params.id! }, ...(include ? { include } : {}) });
      if (!record) throw new NotFoundError(resource);
      ok(res, record);
    }),
  );

  adminRouter.post(
    '/',
    requireRole(writeRole),
    validate({ body: createSchema }),
    asyncHandler(async (req, res) => {
      const data = await withSlug(req.body as Record<string, unknown>);
      ok(res, await delegate.create({ data, ...(include ? { include } : {}) }), 201);
    }),
  );

  adminRouter.patch(
    '/reorder',
    requireRole(writeRole),
    validate({ body: reorderBody }),
    asyncHandler(async (req, res) => {
      await prisma.$transaction(
        (req.body.items as { id: string; order: number }[]).map((item) =>
          delegate.update({ where: { id: item.id }, data: { order: item.order } }),
        ) as never,
      );
      noContent(res);
    }),
  );

  adminRouter.patch(
    '/:id',
    requireRole(writeRole),
    validate({ params: idParams, body: updateSchema }),
    asyncHandler(async (req, res) => {
      const data = await withSlug(req.body as Record<string, unknown>, req.params.id!);
      ok(res, await delegate.update({ where: { id: req.params.id! }, data, ...(include ? { include } : {}) }));
    }),
  );

  adminRouter.delete(
    '/:id',
    requireRole(deleteRole),
    validate({ params: idParams }),
    asyncHandler(async (req, res) => {
      await delegate.delete({ where: { id: req.params.id! } });
      noContent(res);
    }),
  );

  return { publicRouter, adminRouter };
}
