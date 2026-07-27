import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler, noContent, ok } from '../../lib/http.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { beaconLimiter } from '../../middleware/rateLimit.js';
import { env } from '../../config/env.js';

const DEVICE = /Mobi|Android|iPhone|iPad/i;

function deviceFrom(userAgent: string | undefined): string {
  if (!userAgent) return 'unknown';
  if (/iPad|Tablet/i.test(userAgent)) return 'tablet';
  return DEVICE.test(userAgent) ? 'mobile' : 'desktop';
}

// ── Ingest (public, fire-and-forget beacons) ─────────────────────────────────

export const publicAnalyticsRouter = Router();

const viewSchema = z.object({
  path: z.string().min(1).max(300),
  sessionId: z.string().min(8).max(64),
  projectSlug: z.string().max(140).nullish(),
  referrer: z.string().max(300).nullish(),
  duration: z.number().int().min(0).max(86_400).nullish(),
});

publicAnalyticsRouter.post(
  '/view',
  beaconLimiter,
  validate({ body: viewSchema }),
  asyncHandler(async (req, res) => {
    if (!env.ENABLE_ANALYTICS) return noContent(res);
    const body = req.body as z.infer<typeof viewSchema>;

    const project = body.projectSlug
      ? await prisma.project.findUnique({ where: { slug: body.projectSlug }, select: { id: true } })
      : null;

    await prisma.pageView.create({
      data: {
        path: body.path,
        sessionId: body.sessionId,
        projectId: project?.id ?? null,
        referrer: body.referrer ?? null,
        duration: body.duration ?? null,
        device: deviceFrom(req.headers['user-agent']),
      },
    });

    noContent(res);
  }),
);

const eventSchema = z.object({
  type: z.string().min(1).max(60),
  label: z.string().max(140).nullish(),
  path: z.string().max(300).nullish(),
  sessionId: z.string().min(8).max(64).nullish(),
  meta: z.record(z.unknown()).nullish(),
});

publicAnalyticsRouter.post(
  '/event',
  beaconLimiter,
  validate({ body: eventSchema }),
  asyncHandler(async (req, res) => {
    if (!env.ENABLE_ANALYTICS) return noContent(res);
    const body = req.body as z.infer<typeof eventSchema>;

    await prisma.eventLog.create({
      data: {
        type: body.type,
        label: body.label ?? null,
        path: body.path ?? null,
        sessionId: body.sessionId ?? null,
        meta: (body.meta ?? undefined) as never,
      },
    });

    noContent(res);
  }),
);

// ── Reporting (admin) ────────────────────────────────────────────────────────

export const adminAnalyticsRouter = Router();
adminAnalyticsRouter.use(requireAuth);

const rangeQuery = z.object({ days: z.coerce.number().int().min(1).max(365).default(30) });

function since(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function hostOf(url: string | null): string {
  if (!url) return 'direct';
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'direct';
  }
}

adminAnalyticsRouter.get(
  '/overview',
  validate({ query: rangeQuery }),
  asyncHandler(async (req, res) => {
    const { days } = req.query as unknown as z.infer<typeof rangeQuery>;
    const from = since(days);
    const previousFrom = since(days * 2);

    const [views, previousViews, sessions, contacts, projects, downloads] = await prisma.$transaction([
      prisma.pageView.count({ where: { createdAt: { gte: from } } }),
      prisma.pageView.count({ where: { createdAt: { gte: previousFrom, lt: from } } }),
      prisma.pageView.findMany({
        where: { createdAt: { gte: from } },
        select: { sessionId: true },
        distinct: ['sessionId'],
      }),
      prisma.contactRequest.count({ where: { createdAt: { gte: from } } }),
      prisma.project.count({ where: { status: 'PUBLISHED' } }),
      prisma.eventLog.count({ where: { type: 'download', createdAt: { gte: from } } }),
    ]);

    const delta = previousViews === 0 ? (views > 0 ? 100 : 0) : ((views - previousViews) / previousViews) * 100;

    ok(res, {
      rangeDays: days,
      views,
      previousViews,
      changePercent: Math.round(delta * 10) / 10,
      visitors: sessions.length,
      contactRequests: contacts,
      publishedProjects: projects,
      downloads,
    });
  }),
);

adminAnalyticsRouter.get(
  '/timeseries',
  validate({ query: rangeQuery }),
  asyncHandler(async (req, res) => {
    const { days } = req.query as unknown as z.infer<typeof rangeQuery>;
    const from = since(days);

    const rows = await prisma.pageView.findMany({
      where: { createdAt: { gte: from } },
      select: { createdAt: true, sessionId: true },
    });

    const buckets = new Map<string, { views: number; sessions: Set<string> }>();
    for (let i = days - 1; i >= 0; i -= 1) {
      const key = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
      buckets.set(key, { views: 0, sessions: new Set() });
    }
    for (const row of rows) {
      const key = row.createdAt.toISOString().slice(0, 10);
      const bucket = buckets.get(key);
      if (!bucket) continue;
      bucket.views += 1;
      bucket.sessions.add(row.sessionId);
    }

    ok(
      res,
      [...buckets.entries()].map(([date, value]) => ({
        date,
        views: value.views,
        visitors: value.sessions.size,
      })),
    );
  }),
);

adminAnalyticsRouter.get(
  '/breakdown',
  validate({ query: rangeQuery }),
  asyncHandler(async (req, res) => {
    const { days } = req.query as unknown as z.infer<typeof rangeQuery>;
    const from = since(days);

    const [views, topProjects, eventRows] = await prisma.$transaction([
      prisma.pageView.findMany({
        where: { createdAt: { gte: from } },
        select: { path: true, device: true, referrer: true },
        orderBy: { createdAt: 'desc' },
        take: 20_000,
      }),
      prisma.project.findMany({
        where: { status: 'PUBLISHED' },
        orderBy: { views: 'desc' },
        take: 8,
        select: { id: true, title: true, slug: true, views: true, accentColor: true },
      }),
      prisma.eventLog.findMany({
        where: { createdAt: { gte: from } },
        select: { type: true },
        orderBy: { createdAt: 'desc' },
        take: 20_000,
      }),
    ]);

    /** Frequency table sorted high→low, capped for display. */
    const tally = <T>(rows: T[], key: (row: T) => string, limit = 10) => {
      const counts = new Map<string, number>();
      for (const row of rows) {
        const value = key(row);
        counts.set(value, (counts.get(value) ?? 0) + 1);
      }
      return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
    };

    ok(res, {
      topPages: tally(views, (row) => row.path).map(([path, count]) => ({ path, views: count })),
      devices: tally(views, (row) => row.device ?? 'unknown', 6).map(([device, count]) => ({
        device,
        views: count,
      })),
      referrers: tally(views, (row) => hostOf(row.referrer)).map(([source, count]) => ({
        source,
        views: count,
      })),
      topProjects,
      events: tally(eventRows, (row) => row.type).map(([type, count]) => ({ type, count })),
    });
  }),
);

adminAnalyticsRouter.delete(
  '/',
  asyncHandler(async (_req, res) => {
    await prisma.$transaction([prisma.pageView.deleteMany({}), prisma.eventLog.deleteMany({})]);
    noContent(res);
  }),
);
