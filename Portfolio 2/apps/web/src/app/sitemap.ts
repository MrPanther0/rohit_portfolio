import type { MetadataRoute } from 'next';
import { fetchSitemapEntries, SITE_URL } from '@/lib/api';
import { FALLBACK_PROJECTS } from '@/lib/fallback';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries = await fetchSitemapEntries();
  const projects = entries.length
    ? entries
    : FALLBACK_PROJECTS.map((project) => ({ slug: project.slug, updatedAt: project.updatedAt }));

  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    ...projects.map((project) => ({
      url: `${SITE_URL}/work/${project.slug}`,
      lastModified: new Date(project.updatedAt),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
  ];
}
