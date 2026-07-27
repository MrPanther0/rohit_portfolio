'use client';

import { useRef, useState } from 'react';
import { motion, useScroll, useSpring, useTransform } from 'framer-motion';
import { Plus } from 'lucide-react';
import type { SiteSettings } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ease } from '@/lib/motion';
import { Counter } from '@/components/ui/Counter';
import { Markdown } from '@/components/ui/Markdown';
import { ProceduralArt } from '@/components/ui/Visual';
import { SectionHeading } from '@/components/layout/SectionHeading';
import { useCursor } from '@/components/experience/CursorProvider';
import { usePrefersReducedMotion } from '@/hooks/useEnvironment';

/** Portrait plate — floats, tilts, and carries the availability chip. */
function ProfilePlate({ settings }: { settings: SiteSettings }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useSpring(useTransform(scrollYProgress, [0, 1], [40, -40]), {
    stiffness: 90,
    damping: 24,
  });

  return (
    <motion.div
      ref={ref}
      className="relative"
      style={reduced ? undefined : { y }}
      onPointerMove={(event) => {
        if (reduced) return;
        const bounds = ref.current?.getBoundingClientRect();
        if (!bounds) return;
        setTilt({
          x: ((event.clientY - bounds.top) / bounds.height - 0.5) * -10,
          y: ((event.clientX - bounds.left) / bounds.width - 0.5) * 10,
        });
      }}
      onPointerLeave={() => setTilt({ x: 0, y: 0 })}
    >
      <motion.div
        className="preserve-3d relative aspect-[4/5] overflow-hidden rounded-[32px] border border-white/10"
        style={{ perspective: 1200 }}
        animate={{ rotateX: tilt.x, rotateY: tilt.y }}
        transition={{ type: 'spring', stiffness: 140, damping: 18 }}
      >
        <ProceduralArt
          seed={`${settings.ownerName}-portrait`}
          accent={settings.theme?.accent ?? '#8B5CF6'}
          secondary={settings.theme?.highlight ?? '#22D3EE'}
          variant="orbit"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-void via-transparent to-transparent" />

        <div className="absolute inset-x-0 bottom-0 p-6">
          <p className="display text-fluid-lg text-white">{settings.ownerName}</p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.24em] text-white/45">
            {settings.role}
          </p>
        </div>
      </motion.div>

      {/* Floating chips — depth without a drop shadow */}
      <motion.div
        className="glass absolute -right-4 top-8 rounded-2xl px-4 py-3 md:-right-8"
        animate={reduced ? undefined : { y: [0, -10, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">Based in</p>
        <p className="mt-0.5 text-sm text-white">{settings.location.split('—')[0]?.trim()}</p>
      </motion.div>

      <motion.div
        className="glass absolute -left-4 bottom-16 rounded-2xl px-4 py-3 md:-left-10"
        animate={reduced ? undefined : { y: [0, 12, 0] }}
        transition={{ duration: 7.5, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
      >
        <p className="flex items-center gap-2 text-sm text-white">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          {settings.availability}
        </p>
      </motion.div>
    </motion.div>
  );
}

/** Career timeline drawn as a beam of light that fills as the section scrolls. */
function Timeline({ settings }: { settings: SiteSettings }) {
  const ref = useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.75', 'end 0.55'] });
  const height = useSpring(scrollYProgress, { stiffness: 110, damping: 28 });

  return (
    <div className="relative">
      <ol ref={ref} className="relative space-y-10 pl-10">
        <div aria-hidden className="absolute left-[7px] top-2 h-full w-px bg-white/8" />
        <motion.div
          aria-hidden
          className="absolute left-[7px] top-2 w-px origin-top bg-gradient-to-b from-ultraviolet via-signal to-transparent"
          style={{ height: '100%', scaleY: height }}
        />

        {settings.timeline.map((entry, index) => (
          <motion.li
            key={`${entry.year}-${entry.title}`}
            className="relative"
            initial={{ opacity: 0, x: -18 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 0.85, ease: ease.expo, delay: index * 0.05 }}
          >
            <span
              aria-hidden
              className="absolute -left-10 top-1.5 grid h-4 w-4 place-items-center rounded-full border border-white/20 bg-void"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-ultraviolet" />
            </span>

            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-signal">{entry.year}</p>
            <h4 className="mt-1.5 text-fluid-lg font-medium tracking-tight text-white">{entry.title}</h4>
            {entry.organisation ? (
              <p className="mt-0.5 text-sm text-white/40">{entry.organisation}</p>
            ) : null}
            <p className="mt-2.5 max-w-lg text-sm leading-relaxed text-white/55">{entry.body}</p>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}

/** Philosophy accordion — one open at a time, no chrome. */
function Philosophy({ settings }: { settings: SiteSettings }) {
  const [open, setOpen] = useState(0);
  const cursor = useCursor();

  return (
    <div className="divide-y divide-white/6 border-y border-white/6">
      {settings.philosophy.map((item, index) => {
        const isOpen = open === index;
        return (
          <div key={item.title}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? -1 : index)}
              aria-expanded={isOpen}
              className="group flex w-full items-center justify-between gap-6 py-5 text-left"
              {...cursor.bind('link')}
            >
              <span className="flex items-baseline gap-4">
                <span className="font-mono text-[10px] text-ultraviolet">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span
                  className={cn(
                    'text-fluid-lg font-light tracking-tight transition-colors duration-500',
                    isOpen ? 'text-white' : 'text-white/55 group-hover:text-white',
                  )}
                >
                  {item.title}
                </span>
              </span>
              <motion.span
                animate={{ rotate: isOpen ? 45 : 0 }}
                transition={{ duration: 0.5, ease: ease.expo }}
                className="shrink-0 text-white/40"
              >
                <Plus size={18} />
              </motion.span>
            </button>

            <motion.div
              initial={false}
              animate={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0 }}
              transition={{ duration: 0.65, ease: ease.expo }}
              className="overflow-hidden"
            >
              <p className="max-w-xl pb-6 pl-10 text-sm leading-relaxed text-white/55">{item.body}</p>
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}

export function About({ settings }: { settings: SiteSettings }) {
  return (
    <section id="about" className="relative bg-void py-24 md:py-32" aria-label="About">
      <div className="container">
        <SectionHeading
          index="02"
          eyebrow="About"
          title="Nine years of arguing with blank pages"
          className="max-w-3xl"
        />

        <div className="mt-16 grid gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
          <ProfilePlate settings={settings} />

          <div>
            <Markdown content={settings.bio} className="max-w-xl" />

            <dl className="mt-12 grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4">
              {settings.stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.6 }}
                  transition={{ duration: 0.8, ease: ease.expo, delay: index * 0.07 }}
                >
                  <dt className="sr-only">{stat.label}</dt>
                  <dd>
                    <Counter
                      value={stat.value}
                      suffix={stat.suffix}
                      className="display block text-fluid-xl text-white"
                    />
                    <span className="mt-1.5 block font-mono text-[10px] uppercase tracking-[0.2em] text-white/35">
                      {stat.label}
                    </span>
                  </dd>
                </motion.div>
              ))}
            </dl>
          </div>
        </div>

        <div className="mt-24 grid gap-16 lg:grid-cols-2 lg:gap-24">
          <div>
            <h3 className="eyebrow mb-8">The route here</h3>
            <Timeline settings={settings} />
          </div>
          <div>
            <h3 className="eyebrow mb-8">How I work</h3>
            <Philosophy settings={settings} />
          </div>
        </div>
      </div>
    </section>
  );
}
