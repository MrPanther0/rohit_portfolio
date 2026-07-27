import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, noContent, ok, okPaged } from '../../lib/http.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import * as service from './project.service.js';
import {
  createProjectSchema,
  idParamSchema,
  listProjectsQuerySchema,
  reorderSchema,
  slugParamSchema,
  updateProjectSchema,
  type ListProjectsQuery,
} from './project.schema.js';

/** Public, unauthenticated read surface consumed by the site. */
export const publicProjectRouter = Router();

publicProjectRouter.get(
  '/',
  validate({ query: listProjectsQuerySchema }),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as ListProjectsQuery;
    const { data, meta } = await service.listProjects({ ...query, publicOnly: true });
    okPaged(res, data, meta);
  }),
);

publicProjectRouter.get(
  '/:slug',
  validate({ params: slugParamSchema }),
  asyncHandler(async (req, res) => {
    ok(res, await service.getProjectBySlug(req.params.slug!, true));
  }),
);

publicProjectRouter.get(
  '/:slug/neighbours',
  validate({ params: slugParamSchema }),
  asyncHandler(async (req, res) => {
    ok(res, await service.getProjectNeighbours(req.params.slug!));
  }),
);

publicProjectRouter.post(
  '/:slug/view',
  validate({ params: slugParamSchema }),
  asyncHandler(async (req, res) => {
    await service.registerView(req.params.slug!);
    noContent(res);
  }),
);

/** Authenticated admin surface. */
export const adminProjectRouter = Router();

adminProjectRouter.use(requireAuth);

adminProjectRouter.get(
  '/',
  validate({ query: listProjectsQuerySchema }),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as ListProjectsQuery;
    const { data, meta } = await service.listProjects({ ...query, publicOnly: false });
    okPaged(res, data, meta);
  }),
);

adminProjectRouter.get('/stats', asyncHandler(async (_req, res) => ok(res, await service.projectStats())));

adminProjectRouter.get(
  '/:id',
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    ok(res, await service.getProjectById(req.params.id!));
  }),
);

adminProjectRouter.post(
  '/',
  requireRole('EDITOR'),
  validate({ body: createProjectSchema }),
  asyncHandler(async (req, res) => {
    ok(res, await service.createProject(req.body), 201);
  }),
);

adminProjectRouter.patch(
  '/reorder',
  requireRole('EDITOR'),
  validate({ body: reorderSchema }),
  asyncHandler(async (req, res) => {
    await service.reorderProjects(req.body.items);
    noContent(res);
  }),
);

adminProjectRouter.patch(
  '/:id',
  requireRole('EDITOR'),
  validate({ params: idParamSchema, body: updateProjectSchema }),
  asyncHandler(async (req, res) => {
    ok(res, await service.updateProject(req.params.id!, req.body));
  }),
);

adminProjectRouter.post(
  '/:id/duplicate',
  requireRole('EDITOR'),
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    ok(res, await service.duplicateProject(req.params.id!), 201);
  }),
);

adminProjectRouter.post(
  '/:id/status',
  requireRole('EDITOR'),
  validate({
    params: idParamSchema,
    body: z.object({ status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']) }),
  }),
  asyncHandler(async (req, res) => {
    ok(res, await service.updateProject(req.params.id!, { status: req.body.status }));
  }),
);

adminProjectRouter.delete(
  '/:id',
  requireRole('ADMIN'),
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    await service.deleteProject(req.params.id!);
    noContent(res);
  }),
);
