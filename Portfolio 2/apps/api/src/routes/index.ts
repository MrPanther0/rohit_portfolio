import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, ok } from '../lib/http.js';
import { authRouter } from '../modules/auth/auth.routes.js';
import { adminProjectRouter, publicProjectRouter } from '../modules/projects/project.routes.js';
import { folderRouter, mediaRouter } from '../modules/media/media.routes.js';
import { adminContactRouter, publicContactRouter } from '../modules/contact/contact.routes.js';
import { adminAnalyticsRouter, publicAnalyticsRouter } from '../modules/analytics/analytics.routes.js';
import { adminSettingsRouter, publicSettingsRouter } from '../modules/settings/settings.routes.js';
import { usersRouter } from '../modules/users/users.routes.js';
import { backupRouter } from '../modules/backup/backup.routes.js';
import {
  awards,
  categories,
  clients,
  services,
  tags,
  testimonials,
} from '../modules/content/content.routes.js';
import { projectStats } from '../modules/projects/project.service.js';

export const apiRouter = Router();

// ── Public surface ───────────────────────────────────────────────────────────

apiRouter.use('/auth', authRouter);

apiRouter.use('/projects', publicProjectRouter);
apiRouter.use('/categories', categories.publicRouter);
apiRouter.use('/tags', tags.publicRouter);
apiRouter.use('/testimonials', testimonials.publicRouter);
apiRouter.use('/clients', clients.publicRouter);
apiRouter.use('/services', services.publicRouter);
apiRouter.use('/awards', awards.publicRouter);
apiRouter.use('/settings', publicSettingsRouter);
apiRouter.use('/contact', publicContactRouter);
apiRouter.use('/analytics', publicAnalyticsRouter);

/** Single round-trip used by the home page so first paint needs one request. */
apiRouter.get(
  '/bootstrap',
  asyncHandler(async (_req, res) => {
    const [settings, projectRows, categoryRows, serviceRows, testimonialRows, clientRows, awardRows] =
      await prisma.$transaction([
        prisma.siteSettings.findUnique({ where: { id: 'singleton' } }),
        prisma.project.findMany({
          where: { status: 'PUBLISHED' },
          orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
          take: 24,
          select: {
            id: true,
            title: true,
            slug: true,
            subtitle: true,
            excerpt: true,
            featured: true,
            year: true,
            client: true,
            accentColor: true,
            secondaryColor: true,
            views: true,
            heroVideoUrl: true,
            category: { select: { id: true, name: true, slug: true, color: true } },
            tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
            cover: {
              select: {
                id: true,
                url: true,
                thumbnailUrl: true,
                alt: true,
                width: true,
                height: true,
                blurDataUrl: true,
              },
            },
          },
        }),
        prisma.category.findMany({ orderBy: [{ order: 'asc' }, { name: 'asc' }] }),
        prisma.service.findMany({ where: { published: true }, orderBy: { order: 'asc' } }),
        prisma.testimonial.findMany({
          where: { published: true },
          orderBy: { order: 'asc' },
          include: { avatar: { select: { id: true, url: true, thumbnailUrl: true, alt: true } } },
        }),
        prisma.client.findMany({
          where: { published: true },
          orderBy: { order: 'asc' },
          include: { logo: { select: { id: true, url: true, thumbnailUrl: true, alt: true } } },
        }),
        prisma.award.findMany({ where: { published: true }, orderBy: [{ year: 'desc' }, { order: 'asc' }] }),
      ]);

    ok(res, {
      settings,
      projects: projectRows.map(({ tags: projectTags, ...rest }) => ({
        ...rest,
        tags: projectTags.map((t) => t.tag),
      })),
      categories: categoryRows,
      services: serviceRows,
      testimonials: testimonialRows,
      clients: clientRows,
      awards: awardRows,
    });
  }),
);

/** Feed for the Next.js sitemap route. */
apiRouter.get(
  '/seo/sitemap',
  asyncHandler(async (_req, res) => {
    const projects = await prisma.project.findMany({
      where: { status: 'PUBLISHED' },
      select: { slug: true, updatedAt: true, publishedAt: true },
      orderBy: { publishedAt: 'desc' },
    });
    ok(res, { projects });
  }),
);

// ── Admin surface ────────────────────────────────────────────────────────────

const admin = Router();

admin.use('/projects', adminProjectRouter);
admin.use('/media', mediaRouter);
admin.use('/folders', folderRouter);
admin.use('/categories', categories.adminRouter);
admin.use('/tags', tags.adminRouter);
admin.use('/testimonials', testimonials.adminRouter);
admin.use('/clients', clients.adminRouter);
admin.use('/services', services.adminRouter);
admin.use('/awards', awards.adminRouter);
admin.use('/contact', adminContactRouter);
admin.use('/analytics', adminAnalyticsRouter);
admin.use('/settings', adminSettingsRouter);
admin.use('/users', usersRouter);
admin.use('/backup', backupRouter);

admin.get(
  '/overview',
  asyncHandler(async (_req, res) => {
    const [projects, media, contacts, unread, testimonialCount, clientCount, users] = await Promise.all([
      projectStats(),
      prisma.media.count(),
      prisma.contactRequest.count(),
      prisma.contactRequest.count({ where: { status: 'NEW' } }),
      prisma.testimonial.count(),
      prisma.client.count(),
      prisma.user.count(),
    ]);

    ok(res, {
      projects,
      media,
      contacts: { total: contacts, unread },
      testimonials: testimonialCount,
      clients: clientCount,
      users,
    });
  }),
);

apiRouter.use('/admin', admin);
