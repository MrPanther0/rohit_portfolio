import slugify from 'slugify';
import { prisma } from './prisma.js';

export function toSlug(value: string): string {
  return slugify(value, { lower: true, strict: true, trim: true }) || 'untitled';
}

type SluggableModel = 'project' | 'category' | 'tag';

/** Returns a slug guaranteed unique for the model, appending -2, -3 … as needed. */
export async function uniqueSlug(
  model: SluggableModel,
  desired: string,
  ignoreId?: string,
): Promise<string> {
  const base = toSlug(desired);
  let candidate = base;
  let suffix = 1;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const delegate = prisma[model] as {
      findFirst: (args: unknown) => Promise<{ id: string } | null>;
    };
    const existing = await delegate.findFirst({
      where: { slug: candidate, ...(ignoreId ? { NOT: { id: ignoreId } } : {}) },
      select: { id: true },
    });
    if (!existing) return candidate;
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
}
