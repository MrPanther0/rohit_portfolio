import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Script from 'next/script';
import { fetchBootstrap, fetchNeighbours, fetchProject, SITE_URL } from '@/lib/api';
import { FALLBACK_PROJECTS, FALLBACK_SETTINGS, fallbackNeighbours, fallbackProject } from '@/lib/fallback';
import { SiteShell } from '@/components/layout/SiteShell';
import { ProjectView } from '@/components/project/ProjectView';

export const revalidate = 300;

interface PageProps {
  params: { slug: string };
}

/** Pre-renders every published case study at build time. */
export async function generateStaticParams() {
  const bootstrap = await fetchBootstrap();
  const projects = bootstrap?.projects ?? FALLBACK_PROJECTS;
  return projects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const project = (await fetchProject(params.slug)) ?? fallbackProject(params.slug);
  if (!project) return { title: 'Project not found' };

  const title = project.seoTitle ?? `${project.title} — ${project.subtitle ?? 'Case study'}`;
  const description = project.seoDescription ?? project.excerpt ?? undefined;
  const image = project.ogImage?.url ?? project.cover?.url;
  const url = `${SITE_URL}/work/${project.slug}`;

  return {
    title,
    description,
    alternates: { canonical: project.canonicalUrl ?? url },
    openGraph: {
      type: 'article',
      title,
      description,
      url,
      ...(project.publishedAt ? { publishedTime: project.publishedAt } : {}),
      ...(image ? { images: [{ url: image, width: 1200, height: 630, alt: project.title }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default async function ProjectPage({ params }: PageProps) {
  const [project, bootstrap] = await Promise.all([fetchProject(params.slug), fetchBootstrap()]);

  const resolved = project ?? fallbackProject(params.slug);
  if (!resolved) notFound();

  const settings = bootstrap?.settings ?? FALLBACK_SETTINGS;
  const neighbours = project ? await fetchNeighbours(params.slug) : fallbackNeighbours(params.slug);

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: resolved.title,
    headline: resolved.subtitle ?? resolved.title,
    description: resolved.excerpt ?? resolved.seoDescription ?? undefined,
    url: `${SITE_URL}/work/${resolved.slug}`,
    ...(resolved.cover?.url ? { image: resolved.cover.url } : {}),
    ...(resolved.publishedAt ? { datePublished: resolved.publishedAt } : {}),
    dateModified: resolved.updatedAt,
    creator: { '@type': 'Person', name: settings.ownerName, url: SITE_URL },
    ...(resolved.client ? { sourceOrganization: { '@type': 'Organization', name: resolved.client } } : {}),
    keywords: resolved.tags.map((tag) => tag.name).join(', '),
  };

  return (
    <SiteShell settings={settings} showIntro={false} projectSlug={resolved.slug}>
      <Script
        id={`project-${resolved.slug}-jsonld`}
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <ProjectView project={resolved} previous={neighbours.previous} next={neighbours.next} />
    </SiteShell>
  );
}
