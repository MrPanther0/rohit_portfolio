import type { Metadata } from 'next';
import Script from 'next/script';
import { fetchBootstrap, SITE_URL } from '@/lib/api';
import { FALLBACK_BOOTSTRAP } from '@/lib/fallback';
import { SiteShell } from '@/components/layout/SiteShell';
import { Hero } from '@/components/sections/Hero';
import { Manifesto } from '@/components/sections/Manifesto';
import { WorkGallery } from '@/components/sections/WorkGallery';
import { About } from '@/components/sections/About';
import { Skills } from '@/components/sections/Skills';
import { Services } from '@/components/sections/Services';
import { Clients } from '@/components/sections/Clients';
import { Testimonials } from '@/components/sections/Testimonials';
import { Awards } from '@/components/sections/Awards';
import { Contact } from '@/components/sections/Contact';

export const revalidate = 300;

export const metadata: Metadata = {
  alternates: { canonical: SITE_URL },
};

export default async function HomePage() {
  // Falls back to bundled content when the API is cold, so the site never 500s.
  const data = (await fetchBootstrap()) ?? FALLBACK_BOOTSTRAP;
  const { settings, projects, categories, services, testimonials, clients, awards } = data;

  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Person',
        '@id': `${SITE_URL}#person`,
        name: settings.ownerName,
        jobTitle: settings.role,
        description: settings.seo?.description ?? settings.tagline,
        email: `mailto:${settings.email}`,
        url: SITE_URL,
        sameAs: settings.socials.map((social) => social.url),
        address: { '@type': 'PostalAddress', addressLocality: settings.location },
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}#website`,
        url: SITE_URL,
        name: `${settings.ownerName} — Portfolio`,
        description: settings.seo?.description ?? settings.tagline,
        publisher: { '@id': `${SITE_URL}#person` },
        inLanguage: 'en-GB',
      },
      ...projects.slice(0, 10).map((project) => ({
        '@type': 'CreativeWork',
        '@id': `${SITE_URL}/work/${project.slug}`,
        name: project.title,
        headline: project.subtitle ?? project.title,
        description: project.excerpt ?? undefined,
        url: `${SITE_URL}/work/${project.slug}`,
        creator: { '@id': `${SITE_URL}#person` },
        ...(project.year ? { dateCreated: String(project.year) } : {}),
        ...(project.cover?.url ? { image: project.cover.url } : {}),
      })),
    ],
  };

  return (
    <SiteShell settings={settings}>
      <Script
        id="structured-data"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <Hero settings={settings} projectCount={projects.length} />
      <Manifesto categories={categories} />
      <WorkGallery projects={projects} />
      <About settings={settings} />
      <Skills skills={settings.skills} />
      <Services services={services} />
      <Clients clients={clients} />
      <Testimonials testimonials={testimonials} />
      <Awards awards={awards} />
      <Contact settings={settings} />
    </SiteShell>
  );
}
