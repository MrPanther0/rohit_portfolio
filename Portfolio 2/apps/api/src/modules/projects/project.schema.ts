import { z } from 'zod';

const hex = z
  .string()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Use a hex colour such as #8B5CF6');

export const paletteEntrySchema = z.object({
  name: z.string().min(1).max(40),
  hex,
  usage: z.string().max(120).optional().default(''),
});

export const typographyEntrySchema = z.object({
  family: z.string().min(1).max(80),
  role: z.string().min(1).max(60),
  weights: z.string().max(60).optional().default(''),
  sample: z.string().max(120).optional().default(''),
});

export const processStepSchema = z.object({
  title: z.string().min(1).max(80),
  body: z.string().max(1200),
  duration: z.string().max(40).optional().default(''),
});

export const metricSchema = z.object({
  label: z.string().min(1).max(60),
  value: z.string().min(1).max(30),
});

export const feedbackSchema = z
  .object({
    quote: z.string().max(1000),
    author: z.string().max(80),
    role: z.string().max(120).optional().default(''),
    avatarUrl: z.string().url().nullish(),
  })
  .nullable();

export const galleryItemSchema = z.object({
  mediaId: z.string().min(1),
  kind: z.enum(['GALLERY', 'SKETCH', 'PROCESS', 'OUTPUT', 'BEFORE', 'AFTER']).default('GALLERY'),
  caption: z.string().max(240).nullish(),
  span: z.number().int().min(1).max(3).default(1),
  order: z.number().int().min(0).default(0),
});

export const createProjectSchema = z.object({
  title: z.string().min(2, 'Give the project a title').max(120),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slugs use lowercase words separated by hyphens')
    .max(140)
    .optional(),
  subtitle: z.string().max(180).nullish(),
  excerpt: z.string().max(400).nullish(),
  description: z.string().max(60000).default(''),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
  featured: z.boolean().default(false),
  order: z.number().int().min(0).default(0),

  client: z.string().max(120).nullish(),
  role: z.string().max(160).nullish(),
  year: z.number().int().min(1990).max(2100).nullish(),
  duration: z.string().max(60).nullish(),
  deliverables: z.array(z.string().max(80)).max(30).default([]),
  technologies: z.array(z.string().max(60)).max(40).default([]),

  accentColor: hex.default('#8B5CF6'),
  secondaryColor: hex.default('#22D3EE'),
  palette: z.array(paletteEntrySchema).max(24).default([]),
  typography: z.array(typographyEntrySchema).max(12).default([]),
  processSteps: z.array(processStepSchema).max(12).default([]),
  metrics: z.array(metricSchema).max(8).default([]),
  feedback: feedbackSchema.optional(),

  heroVideoUrl: z.string().url().nullish(),
  liveUrl: z.string().url().nullish(),
  behanceUrl: z.string().url().nullish(),
  dribbbleUrl: z.string().url().nullish(),

  seoTitle: z.string().max(70).nullish(),
  seoDescription: z.string().max(180).nullish(),
  canonicalUrl: z.string().url().nullish(),

  coverId: z.string().nullish(),
  ogImageId: z.string().nullish(),
  categoryId: z.string().nullish(),
  tagIds: z.array(z.string()).max(20).default([]),
  gallery: z.array(galleryItemSchema).max(120).default([]),
});

export const updateProjectSchema = createProjectSchema.partial();

export const listProjectsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(12),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED', 'ALL']).optional(),
  category: z.string().optional(),
  tag: z.string().optional(),
  featured: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  search: z.string().max(120).optional(),
  sort: z.enum(['order', 'recent', 'popular', 'title']).default('order'),
});

export const reorderSchema = z.object({
  items: z.array(z.object({ id: z.string().min(1), order: z.number().int().min(0) })).min(1).max(500),
});

export const slugParamSchema = z.object({ slug: z.string().min(1).max(140) });
export const idParamSchema = z.object({ id: z.string().min(1) });

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>;
