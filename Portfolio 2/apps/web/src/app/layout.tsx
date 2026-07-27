import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono, Syne } from 'next/font/google';
import { Toaster } from 'sonner';
import { fetchBootstrap, SITE_URL } from '@/lib/api';
import { FALLBACK_SETTINGS } from '@/lib/fallback';
import './globals.css';

const display = Syne({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
  preload: true,
});

const sans = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  preload: true,
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: '#050505',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

/** Metadata is generated from the CMS so SEO is editable without a deploy. */
export async function generateMetadata(): Promise<Metadata> {
  const bootstrap = await fetchBootstrap();
  const settings = bootstrap?.settings ?? FALLBACK_SETTINGS;
  const seo = settings.seo ?? {};

  const title = seo.title ?? `${settings.ownerName} — ${settings.role}`;
  const description = seo.description ?? settings.tagline;

  return {
    metadataBase: new URL(SITE_URL),
    title: { default: title, template: `%s — ${settings.ownerName}` },
    description,
    keywords: seo.keywords,
    authors: [{ name: settings.ownerName }],
    creator: settings.ownerName,
    applicationName: `${settings.ownerName} Portfolio`,
    alternates: { canonical: seo.canonicalUrl ?? SITE_URL },
    robots: seo.robots ?? 'index, follow',
    openGraph: {
      type: 'website',
      siteName: `${settings.ownerName} — Portfolio`,
      title,
      description,
      url: SITE_URL,
      locale: 'en_GB',
      ...(seo.ogImageUrl ? { images: [{ url: seo.ogImageUrl, width: 1200, height: 630, alt: title }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(seo.twitterHandle ? { creator: seo.twitterHandle } : {}),
      ...(seo.ogImageUrl ? { images: [seo.ogImageUrl] } : {}),
    },
    icons: {
      icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    },
    formatDetection: { telephone: false, email: false, address: false },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <body className="bg-void text-bone">
        {children}
        <Toaster
          position="bottom-right"
          theme="dark"
          toastOptions={{
            style: {
              background: 'rgba(20,20,25,0.92)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#F4F2ED',
              backdropFilter: 'blur(16px)',
            },
          }}
        />
      </body>
    </html>
  );
}
