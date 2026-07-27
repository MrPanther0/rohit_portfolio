import { z } from 'zod';
import { createCrudRouters } from './crud.factory.js';

const hex = z.string().regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Use a hex colour');

const mediaSelect = {
  select: {
    id: true,
    url: true,
    thumbnailUrl: true,
    alt: true,
    width: true,
    height: true,
    blurDataUrl: true,
  },
};

// ── Categories ───────────────────────────────────────────────────────────────

const categoryCreate = z.object({
  name: z.string().min(1).max(60),
  description: z.string().max(400).nullish(),
  color: hex.default('#8B5CF6'),
  order: z.number().int().min(0).default(0),
});

export const categories = createCrudRouters({
  model: 'category',
  resource: 'Category',
  createSchema: categoryCreate,
  updateSchema: categoryCreate.partial(),
  orderBy: [{ order: 'asc' }, { name: 'asc' }],
  include: { _count: { select: { projects: true } } },
  slugFrom: 'name',
});

// ── Tags ─────────────────────────────────────────────────────────────────────

const tagCreate = z.object({ name: z.string().min(1).max(40) });

export const tags = createCrudRouters({
  model: 'tag',
  resource: 'Tag',
  createSchema: tagCreate,
  updateSchema: tagCreate.partial(),
  orderBy: { name: 'asc' },
  include: { _count: { select: { projects: true } } },
  slugFrom: 'name',
});

// ── Testimonials ─────────────────────────────────────────────────────────────

const testimonialCreate = z.object({
  name: z.string().min(1).max(80),
  role: z.string().max(80).nullish(),
  company: z.string().max(80).nullish(),
  quote: z.string().min(10).max(1200),
  rating: z.number().int().min(1).max(5).default(5),
  featured: z.boolean().default(false),
  published: z.boolean().default(true),
  order: z.number().int().min(0).default(0),
  avatarId: z.string().nullish(),
});

export const testimonials = createCrudRouters({
  model: 'testimonial',
  resource: 'Testimonial',
  createSchema: testimonialCreate,
  updateSchema: testimonialCreate.partial(),
  orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
  publicWhere: { published: true },
  include: { avatar: mediaSelect },
});

// ── Clients ──────────────────────────────────────────────────────────────────

const clientCreate = z.object({
  name: z.string().min(1).max(80),
  url: z.string().url().nullish(),
  wordmark: z.string().max(40).nullish(),
  logoId: z.string().nullish(),
  published: z.boolean().default(true),
  order: z.number().int().min(0).default(0),
});

export const clients = createCrudRouters({
  model: 'client',
  resource: 'Client',
  createSchema: clientCreate,
  updateSchema: clientCreate.partial(),
  orderBy: [{ order: 'asc' }, { name: 'asc' }],
  publicWhere: { published: true },
  include: { logo: mediaSelect },
});

// ── Services ─────────────────────────────────────────────────────────────────

const serviceCreate = z.object({
  title: z.string().min(1).max(80),
  description: z.string().min(1).max(600),
  icon: z.string().max(40).default('sparkles'),
  features: z.array(z.string().max(80)).max(12).default([]),
  accent: hex.default('#8B5CF6'),
  priceFrom: z.string().max(40).nullish(),
  published: z.boolean().default(true),
  order: z.number().int().min(0).default(0),
});

export const services = createCrudRouters({
  model: 'service',
  resource: 'Service',
  createSchema: serviceCreate,
  updateSchema: serviceCreate.partial(),
  orderBy: [{ order: 'asc' }, { title: 'asc' }],
  publicWhere: { published: true },
});

// ── Awards ───────────────────────────────────────────────────────────────────

const awardCreate = z.object({
  title: z.string().min(1).max(120),
  organization: z.string().min(1).max(100),
  year: z.number().int().min(1990).max(2100),
  description: z.string().max(600).nullish(),
  url: z.string().url().nullish(),
  published: z.boolean().default(true),
  order: z.number().int().min(0).default(0),
});

export const awards = createCrudRouters({
  model: 'award',
  resource: 'Award',
  createSchema: awardCreate,
  updateSchema: awardCreate.partial(),
  orderBy: [{ year: 'desc' }, { order: 'asc' }],
  publicWhere: { published: true },
});
