import { Prisma, type ProjectStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { NotFoundError } from '../../lib/errors.js';
import { paginate, type PageMeta } from '../../lib/http.js';
import { uniqueSlug } from '../../lib/slug.js';
import type {
  CreateProjectInput,
  ListProjectsQuery,
  UpdateProjectInput,
} from './project.schema.js';

const mediaSelect = {
  id: true,
  url: true,
  thumbnailUrl: true,
  alt: true,
  width: true,
  height: true,
  blurDataUrl: true,
  mimeType: true,
  kind: true,
} satisfies Prisma.MediaSelect;

const projectInclude = {
  cover: { select: mediaSelect },
  ogImage: { select: mediaSelect },
  category: { select: { id: true, name: true, slug: true, color: true } },
  tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
  gallery: {
    orderBy: { order: 'asc' },
    include: { media: { select: mediaSelect } },
  },
} satisfies Prisma.ProjectInclude;

type ProjectRow = Prisma.ProjectGetPayload<{ include: typeof projectInclude }>;

/** Flattens Prisma's join tables into the shape the front end consumes. */
export function serializeProject(project: ProjectRow) {
  const { tags, gallery, ...rest } = project;
  return {
    ...rest,
    tags: tags.map((t) => t.tag),
    gallery: gallery.map((g) => ({
      id: g.id,
      kind: g.kind,
      caption: g.caption,
      span: g.span,
      order: g.order,
      media: g.media,
    })),
  };
}

export type SerializedProject = ReturnType<typeof serializeProject>;

function orderBy(sort: ListProjectsQuery['sort']): Prisma.ProjectOrderByWithRelationInput[] {
  switch (sort) {
    case 'recent':
      return [{ publishedAt: 'desc' }, { createdAt: 'desc' }];
    case 'popular':
      return [{ views: 'desc' }, { order: 'asc' }];
    case 'title':
      return [{ title: 'asc' }];
    default:
      return [{ order: 'asc' }, { createdAt: 'desc' }];
  }
}

interface ListOptions extends ListProjectsQuery {
  /** Public callers may only ever see PUBLISHED rows. */
  publicOnly: boolean;
}

export async function listProjects(
  options: ListOptions,
): Promise<{ data: SerializedProject[]; meta: PageMeta }> {
  const { page, perPage, publicOnly, status, category, tag, featured, search, sort } = options;

  const where: Prisma.ProjectWhereInput = {
    ...(publicOnly
      ? { status: 'PUBLISHED' as ProjectStatus }
      : status && status !== 'ALL'
        ? { status: status as ProjectStatus }
        : {}),
    ...(category ? { category: { slug: category } } : {}),
    ...(tag ? { tags: { some: { tag: { slug: tag } } } } : {}),
    ...(featured !== undefined ? { featured } : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { subtitle: { contains: search, mode: 'insensitive' } },
            { excerpt: { contains: search, mode: 'insensitive' } },
            { client: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [total, rows] = await prisma.$transaction([
    prisma.project.count({ where }),
    prisma.project.findMany({
      where,
      include: projectInclude,
      orderBy: orderBy(sort),
      skip: (page - 1) * perPage,
      take: perPage,
    }),
  ]);

  return { data: rows.map(serializeProject), meta: paginate(total, page, perPage) };
}

export async function getProjectBySlug(slug: string, publicOnly: boolean): Promise<SerializedProject> {
  const project = await prisma.project.findFirst({
    where: { slug, ...(publicOnly ? { status: 'PUBLISHED' } : {}) },
    include: projectInclude,
  });
  if (!project) throw new NotFoundError('Project');
  return serializeProject(project);
}

export async function getProjectById(id: string): Promise<SerializedProject> {
  const project = await prisma.project.findUnique({ where: { id }, include: projectInclude });
  if (!project) throw new NotFoundError('Project');
  return serializeProject(project);
}

/** Previous/next in display order — powers the "next project" navigation. */
export async function getProjectNeighbours(slug: string) {
  const published = await prisma.project.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    select: {
      slug: true,
      title: true,
      subtitle: true,
      accentColor: true,
      cover: { select: mediaSelect },
    },
  });

  const index = published.findIndex((p) => p.slug === slug);
  if (index === -1) return { previous: null, next: null };

  const wrap = (i: number) => published[(i + published.length) % published.length] ?? null;
  return {
    previous: published.length > 1 ? wrap(index - 1) : null,
    next: published.length > 1 ? wrap(index + 1) : null,
  };
}

function scalarData(input: UpdateProjectInput) {
  const {
    tagIds: _tagIds,
    gallery: _gallery,
    slug: _slug,
    palette,
    typography,
    processSteps,
    metrics,
    feedback,
    ...scalars
  } = input;

  return {
    ...scalars,
    ...(palette !== undefined ? { palette: palette as Prisma.InputJsonValue } : {}),
    ...(typography !== undefined ? { typography: typography as Prisma.InputJsonValue } : {}),
    ...(processSteps !== undefined ? { processSteps: processSteps as Prisma.InputJsonValue } : {}),
    ...(metrics !== undefined ? { metrics: metrics as Prisma.InputJsonValue } : {}),
    ...(feedback !== undefined
      ? { feedback: (feedback ?? Prisma.JsonNull) as Prisma.InputJsonValue }
      : {}),
  };
}

export async function createProject(input: CreateProjectInput): Promise<SerializedProject> {
  const slug = await uniqueSlug('project', input.slug ?? input.title);

  const data: Prisma.ProjectUncheckedCreateInput = {
    ...(scalarData(input) as Prisma.ProjectUncheckedCreateInput),
    title: input.title,
    slug,
    publishedAt: input.status === 'PUBLISHED' ? new Date() : null,
    tags: { create: input.tagIds.map((tagId) => ({ tagId })) },
    gallery: {
      create: input.gallery.map((item, index) => ({
        mediaId: item.mediaId,
        kind: item.kind,
        caption: item.caption ?? null,
        span: item.span,
        order: item.order || index,
      })),
    },
  };

  const project = await prisma.project.create({ data, include: projectInclude });
  return serializeProject(project);
}

export async function updateProject(id: string, input: UpdateProjectInput): Promise<SerializedProject> {
  const existing = await prisma.project.findUnique({
    where: { id },
    select: { id: true, slug: true, status: true, publishedAt: true },
  });
  if (!existing) throw new NotFoundError('Project');

  const slug =
    input.slug && input.slug !== existing.slug ? await uniqueSlug('project', input.slug, id) : undefined;

  const statusChanged = input.status && input.status !== existing.status;
  const timestamps =
    statusChanged && input.status === 'PUBLISHED'
      ? { publishedAt: existing.publishedAt ?? new Date(), archivedAt: null }
      : statusChanged && input.status === 'ARCHIVED'
        ? { archivedAt: new Date() }
        : {};

  const project = await prisma.$transaction(async (tx) => {
    if (input.tagIds) {
      await tx.projectTag.deleteMany({ where: { projectId: id } });
      if (input.tagIds.length) {
        await tx.projectTag.createMany({
          data: input.tagIds.map((tagId) => ({ projectId: id, tagId })),
          skipDuplicates: true,
        });
      }
    }

    if (input.gallery) {
      await tx.projectMedia.deleteMany({ where: { projectId: id } });
      if (input.gallery.length) {
        await tx.projectMedia.createMany({
          data: input.gallery.map((item, index) => ({
            projectId: id,
            mediaId: item.mediaId,
            kind: item.kind,
            caption: item.caption ?? null,
            span: item.span,
            order: item.order || index,
          })),
          skipDuplicates: true,
        });
      }
    }

    return tx.project.update({
      where: { id },
      data: { ...scalarData(input), ...(slug ? { slug } : {}), ...timestamps },
      include: projectInclude,
    });
  });

  return serializeProject(project);
}

export async function deleteProject(id: string): Promise<void> {
  await prisma.project.delete({ where: { id } });
}

export async function duplicateProject(id: string): Promise<SerializedProject> {
  const source = await prisma.project.findUnique({
    where: { id },
    include: { tags: true, gallery: true },
  });
  if (!source) throw new NotFoundError('Project');

  const { id: _id, slug, createdAt, updatedAt, publishedAt, archivedAt, views, tags, gallery, title, ...rest } =
    source;

  const copy = await prisma.project.create({
    data: {
      ...rest,
      title: `${title} (copy)`,
      slug: await uniqueSlug('project', `${slug}-copy`),
      status: 'DRAFT',
      featured: false,
      views: 0,
      publishedAt: null,
      archivedAt: null,
      palette: rest.palette as Prisma.InputJsonValue,
      typography: rest.typography as Prisma.InputJsonValue,
      processSteps: rest.processSteps as Prisma.InputJsonValue,
      metrics: rest.metrics as Prisma.InputJsonValue,
      feedback: (rest.feedback ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      tags: { create: tags.map((t) => ({ tagId: t.tagId })) },
      gallery: {
        create: gallery.map((g) => ({
          mediaId: g.mediaId,
          kind: g.kind,
          caption: g.caption,
          span: g.span,
          order: g.order,
        })),
      },
    },
    include: projectInclude,
  });

  return serializeProject(copy);
}

export async function reorderProjects(items: { id: string; order: number }[]): Promise<void> {
  await prisma.$transaction(
    items.map((item) => prisma.project.update({ where: { id: item.id }, data: { order: item.order } })),
  );
}

export async function registerView(slug: string): Promise<void> {
  await prisma.project.updateMany({ where: { slug }, data: { views: { increment: 1 } } });
}

export async function projectStats() {
  const [total, published, draft, archived, featured, views] = await prisma.$transaction([
    prisma.project.count(),
    prisma.project.count({ where: { status: 'PUBLISHED' } }),
    prisma.project.count({ where: { status: 'DRAFT' } }),
    prisma.project.count({ where: { status: 'ARCHIVED' } }),
    prisma.project.count({ where: { featured: true } }),
    prisma.project.aggregate({ _sum: { views: true } }),
  ]);

  return { total, published, draft, archived, featured, totalViews: views._sum.views ?? 0 };
}
