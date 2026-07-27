'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';
import type { SiteSettings } from '@/lib/types';
import { hexToRgbChannels } from '@/lib/utils';
import { CursorProvider } from '@/components/experience/CursorProvider';
import { CustomCursor } from '@/components/experience/CustomCursor';
import { SmoothScroll } from '@/components/experience/SmoothScroll';
import { Preloader } from '@/components/experience/Preloader';
import { Analytics } from '@/components/experience/Analytics';
import { Header } from './Header';
import { Footer } from './Footer';

/** Thin reading-position indicator pinned to the top of the viewport. */
function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 180, damping: 30, restDelta: 0.001 });

  return (
    <motion.div
      aria-hidden
      className="fixed inset-x-0 top-0 z-[110] h-[2px] origin-left bg-gradient-to-r from-ultraviolet via-signal to-ultraviolet"
      style={{ scaleX }}
    />
  );
}

interface SiteShellProps {
  settings: SiteSettings;
  children: ReactNode;
  /** Project pages skip the intro — visitors arrive mid-story. */
  showIntro?: boolean;
  projectSlug?: string;
}

/**
 * Everything that wraps a public page: theming, smooth scroll, the custom
 * pointer, the intro sequence, grain, and the chrome.
 */
export function SiteShell({ settings, children, showIntro = true, projectSlug }: SiteShellProps) {
  const theme = settings.theme ?? {};
  const introEnabled = (theme.intro ?? true) && showIntro;
  const [ready, setReady] = useState(!introEnabled);

  // Publish the owner's palette as CSS custom properties so every accent —
  // selection, scrollbar, focus ring, shader — follows the admin setting.
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--accent', hexToRgbChannels(theme.accent ?? '#8B5CF6'));
    root.style.setProperty('--highlight', hexToRgbChannels(theme.highlight ?? '#22D3EE'));
  }, [theme.accent, theme.highlight]);

  // Hold the page still until the intro lifts.
  useEffect(() => {
    if (ready) {
      document.body.style.overflow = '';
      return;
    }
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [ready]);

  return (
    <CursorProvider>
      <SmoothScroll>
        <div className={theme.grain === false ? undefined : 'grain'}>
          {introEnabled ? <Preloader name={settings.ownerName} onComplete={() => setReady(true)} /> : null}

          {theme.cursor === false ? null : <CustomCursor />}
          <ScrollProgress />

          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[130] focus:rounded-full focus:bg-white focus:px-5 focus:py-2.5 focus:text-sm focus:font-medium focus:text-void"
          >
            Skip to content
          </a>

          <Header name={settings.ownerName} availability={settings.availability} />

          <main id="main" className="relative">
            {children}
          </main>

          <Footer settings={settings} />
          <Analytics projectSlug={projectSlug} />
        </div>
      </SmoothScroll>
    </CursorProvider>
  );
}
