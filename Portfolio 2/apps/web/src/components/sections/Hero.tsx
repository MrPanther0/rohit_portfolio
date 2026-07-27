'use client';

import dynamic from 'next/dynamic';
import { useMemo, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowDown, ArrowUpRight } from 'lucide-react';
import type { SiteSettings } from '@/lib/types';
import { ease } from '@/lib/motion';
import { SplitText } from '@/components/ui/SplitText';
import { MagneticButton } from '@/components/ui/MagneticButton';
import { useSmoothScroll } from '@/components/experience/SmoothScroll';
import { useCursor } from '@/components/experience/CursorProvider';
import { usePrefersReducedMotion } from '@/hooks/useEnvironment';

const HeroCanvas = dynamic(() => import('@/components/canvas/HeroCanvas'), {
  ssr: false,
  loading: () => (
    <div
      aria-hidden
      className="absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_25%_15%,rgba(139,92,246,0.18),transparent_62%),radial-gradient(ellipse_60%_45%_at_80%_30%,rgba(34,211,238,0.14),transparent_66%)]"
    />
  ),
});

export function Hero({ settings, projectCount }: { settings: SiteSettings; projectCount: number }) {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollTo } = useSmoothScroll();
  const cursor = useCursor();
  const reduced = usePrefersReducedMotion();

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end start'] });
  const contentY = useTransform(scrollYProgress, [0, 1], ['0%', '32%']);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.65], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.12]);

  // "CREATIVITY WITHOUT LIMITS" → one word per line, so the type fills the screen.
  const lines = useMemo(
    () => settings.headline.trim().split(/\s+/).slice(0, 4),
    [settings.headline],
  );

  return (
    <section
      ref={sectionRef}
      className="relative flex min-h-[100svh] flex-col justify-between overflow-hidden pb-8 pt-[calc(var(--header-h)+2rem)]"
      aria-label="Introduction"
    >
      <motion.div className="absolute inset-0 -z-10" style={reduced ? undefined : { scale }}>
        <HeroCanvas
          accent={settings.theme?.accent ?? '#8B5CF6'}
          highlight={settings.theme?.highlight ?? '#22D3EE'}
          className="absolute inset-0"
        />
        {/* Legibility scrim — the type must never fight the shader. */}
        <div className="absolute inset-0 bg-gradient-to-b from-void/55 via-transparent to-void" />
        <div className="absolute inset-0 bg-gradient-to-r from-void/60 via-transparent to-transparent" />
      </motion.div>

      <motion.div
        className="container flex flex-1 flex-col justify-center"
        style={reduced ? undefined : { y: contentY, opacity: contentOpacity }}
      >
        <motion.div
          className="mb-6 flex items-center gap-4"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: ease.expo, delay: 0.25 }}
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-signal" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-signal" />
          </span>
          <span className="eyebrow">{settings.availability}</span>
        </motion.div>

        <h1 className="sr-only">
          {settings.ownerName} — {settings.role}. {settings.headline}
        </h1>

        <div aria-hidden className="perspective">
          {lines.map((word, index) => (
            <SplitText
              key={word + index}
              as="div"
              mode="chars"
              immediate
              delay={0.45 + index * 0.13}
              stagger={0.028}
              className="display block text-fluid-3xl text-white"
            >
              {word}
            </SplitText>
          ))}
        </div>

        <motion.div
          className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between"
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, ease: ease.expo, delay: 1.05 }}
        >
          <div className="max-w-md">
            <p className="text-fluid-lg font-light text-white">
              {settings.ownerName}
              <span className="mx-3 inline-block h-px w-8 translate-y-[-0.35em] bg-white/30" />
              <span className="text-white/55">{settings.role}</span>
            </p>
            <p className="mt-3 text-fluid-base leading-relaxed text-white/45">{settings.tagline}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <MagneticButton
              href="/#work"
              size="lg"
              cursorLabel="explore"
              icon={<ArrowDown size={16} />}
              onClick={() => scrollTo('#work', -40)}
            >
              View selected work
            </MagneticButton>
            <MagneticButton
              href="/#contact"
              size="lg"
              variant="outline"
              icon={<ArrowUpRight size={16} />}
              onClick={() => scrollTo('#contact', -40)}
            >
              Start a project
            </MagneticButton>
          </div>
        </motion.div>
      </motion.div>

      <motion.div
        className="container flex items-end justify-between gap-6 pt-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, delay: 1.4 }}
      >
        <button
          type="button"
          onClick={() => scrollTo('#work', -40)}
          className="group flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.28em] text-white/40 transition-colors hover:text-white"
          {...cursor.bind('link', 'scroll')}
        >
          <span className="relative grid h-9 w-9 place-items-center overflow-hidden rounded-full border border-white/15">
            <motion.span
              animate={reduced ? undefined : { y: [-14, 0, 14] }}
              transition={{ duration: 2.1, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute"
            >
              <ArrowDown size={13} />
            </motion.span>
          </span>
          Scroll to begin
        </button>

        <dl className="hidden gap-8 sm:flex">
          {[
            { label: 'Selected works', value: String(projectCount).padStart(2, '0') },
            { label: 'Based in', value: settings.location.split('—')[0]?.trim() ?? settings.location },
          ].map((item) => (
            <div key={item.label} className="text-right">
              <dt className="font-mono text-[10px] uppercase tracking-[0.24em] text-white/30">
                {item.label}
              </dt>
              <dd className="mt-1 text-sm text-white/70">{item.value}</dd>
            </div>
          ))}
        </dl>
      </motion.div>
    </section>
  );
}
