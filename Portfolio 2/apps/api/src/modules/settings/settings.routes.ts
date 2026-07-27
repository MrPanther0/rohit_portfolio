import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler, ok } from '../../lib/http.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';

const SINGLETON = 'singleton';

export const socialSchema = z.object({
  label: z.string().min(1).max(40),
  url: z.string().url(),
  handle: z.string().max(60).optional().default(''),
});

export const statSchema = z.object({
  label: z.string().min(1).max(40),
  value: z.number().min(0).max(1_000_000),
  suffix: z.string().max(6).optional().default('+'),
});

export const timelineSchema = z.object({
  year: z.string().min(1).max(20),
  title: z.string().min(1).max(80),
  organisation: z.string().max(80).optional().default(''),
  body: z.string().max(600).optional().default(''),
});

export const skillNodeSchema = z.object({
  name: z.string().min(1).max(40),
  level: z.number().min(0).max(100),
  group: z.string().min(1).max(40),
});

export const philosophySchema = z.object({
  title: z.string().min(1).max(60),
  body: z.string().max(600),
});

const seoSchema = z.object({
  title: z.string().max(70).optional(),
  description: z.string().max(180).optional(),
  keywords: z.array(z.string().max(40)).max(30).optional(),
  ogImageUrl: z.string().url().nullish(),
  twitterHandle: z.string().max(40).optional(),
  canonicalUrl: z.string().url().nullish(),
  robots: z.string().max(120).optional(),
  structuredData: z.record(z.unknown()).optional(),
});

const themeSchema = z.object({
  accent: z.string().regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/).optional(),
  highlight: z.string().regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/).optional(),
  grain: z.boolean().optional(),
  intro: z.boolean().optional(),
  cursor: z.boolean().optional(),
});

const updateSettingsSchema = z.object({
  ownerName: z.string().min(1).max(80).optional(),
  role: z.string().min(1).max(120).optional(),
  headline: z.string().min(1).max(120).optional(),
  tagline: z.string().max(200).optional(),
  bio: z.string().max(4000).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(40).nullish(),
  location: z.string().max(120).optional(),
  availability: z.string().max(120).optional(),
  resumeUrl: z.string().url().nullish(),
  socials: z.array(socialSchema).max(12).optional(),
  stats: z.array(statSchema).max(8).optional(),
  timeline: z.array(timelineSchema).max(20).optional(),
  skills: z.array(skillNodeSchema).max(60).optional(),
  philosophy: z.array(philosophySchema).max(8).optional(),
  seo: seoSchema.optional(),
  theme: themeSchema.optional(),
});

export async function getSettings() {
  const existing = await prisma.siteSettings.findUnique({ where: { id: SINGLETON } });
  if (existing) return existing;
  return prisma.siteSettings.create({ data: { id: SINGLETON } });
}

export const publicSettingsRouter = Router();

publicSettingsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    ok(res, await getSettings());
  }),
);

export const adminSettingsRouter = Router();
adminSettingsRouter.use(requireAuth);

adminSettingsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    ok(res, await getSettings());
  }),
);

adminSettingsRouter.patch(
  '/',
  requireRole('EDITOR'),
  validate({ body: updateSettingsSchema }),
  asyncHandler(async (req, res) => {
    await getSettings();
    const updated = await prisma.siteSettings.update({
      where: { id: SINGLETON },
      data: req.body as never,
    });
    ok(res, updated);
  }),
);
