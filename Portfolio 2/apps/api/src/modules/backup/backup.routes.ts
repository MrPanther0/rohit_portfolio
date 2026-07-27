import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler, ok } from '../../lib/http.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { logger } from '../../lib/logger.js';

export const backupRouter = Router();
backupRouter.use(requireAuth, requireRole('ADMIN'));

const SCHEMA_VERSION = 1;

/**
 * Content-level export. Binary assets stay with the storage driver; the archive
 * carries every row needed to rebuild the site's content on a fresh database.
 */
backupRouter.get(
  '/export',
  asyncHandler(async (_req, res) => {
    const [
      settings,
      categories,
      tags,
      media,
      folders,
      projects,
      projectTags,
      projectMedia,
      testimonials,
      clients,
      services,
      awards,
    ] = await prisma.$transaction([
      prisma.siteSettings.findMany(),
      prisma.category.findMany(),
      prisma.tag.findMany(),
      prisma.media.findMany(),
      prisma.folder.findMany(),
      prisma.project.findMany(),
      prisma.projectTag.findMany(),
      prisma.projectMedia.findMany(),
      prisma.testimonial.findMany(),
      prisma.client.findMany(),
      prisma.service.findMany(),
      prisma.award.findMany(),
    ]);

    const payload = {
      schemaVersion: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      counts: {
        projects: projects.length,
        media: media.length,
        testimonials: testimonials.length,
        clients: clients.length,
        services: services.length,
        awards: awards.length,
      },
      data: {
        settings,
        folders,
        media,
        categories,
        tags,
        projects,
        projectTags,
        projectMedia,
        testimonials,
        clients,
        services,
        awards,
      },
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="portfolio-backup-${new Date().toISOString().slice(0, 10)}.json"`,
    );
    res.status(200).send(JSON.stringify(payload, null, 2));
  }),
);

const restoreSchema = z.object({
  schemaVersion: z.number().int(),
  data: z.record(z.array(z.record(z.unknown()))),
  /** Wipe existing content before importing. Without it, rows are upserted. */
  replace: z.boolean().default(false),
});

backupRouter.post(
  '/import',
  validate({ body: restoreSchema }),
  asyncHandler(async (req, res) => {
    const { schemaVersion, data, replace } = req.body as z.infer<typeof restoreSchema>;
    if (schemaVersion !== SCHEMA_VERSION) {
      throw new Error(`Unsupported backup schema version ${schemaVersion}`);
    }

    // Insert order respects foreign keys; the reverse order clears them safely.
    const order = [
      'folders',
      'media',
      'categories',
      'tags',
      'projects',
      'projectTags',
      'projectMedia',
      'testimonials',
      'clients',
      'services',
      'awards',
      'settings',
    ] as const;

    const delegates: Record<(typeof order)[number], { createMany: Function; deleteMany: Function }> = {
      folders: prisma.folder,
      media: prisma.media,
      categories: prisma.category,
      tags: prisma.tag,
      projects: prisma.project,
      projectTags: prisma.projectTag,
      projectMedia: prisma.projectMedia,
      testimonials: prisma.testimonial,
      clients: prisma.client,
      services: prisma.service,
      awards: prisma.award,
      settings: prisma.siteSettings,
    } as never;

    if (replace) {
      for (const key of [...order].reverse()) {
        await delegates[key].deleteMany({});
      }
    }

    const imported: Record<string, number> = {};
    for (const key of order) {
      const rows = data[key];
      if (!rows?.length) continue;
      const result = (await delegates[key].createMany({ data: rows, skipDuplicates: true })) as {
        count: number;
      };
      imported[key] = result.count;
    }

    logger.warn({ imported, replace }, 'content restored from backup');
    ok(res, { imported });
  }),
);
