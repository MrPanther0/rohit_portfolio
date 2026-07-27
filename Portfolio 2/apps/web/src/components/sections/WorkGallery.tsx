'use client';

import Link from 'next/link';
import { useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/dist/ScrollTrigger';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import type { ProjectSummary } from '@/lib/types';
import { cn, withAlpha } from '@/lib/utils';
import { ease } from '@/lib/motion';
import { RevealImage } from '@/components/ui/Visual';
import { SectionHeading } from '@/components/layout/SectionHeading';
import { useCursor } from '@/components/experience/CursorProvider';
import { useIsMobile, usePrefersReducedMotion } from '@/hooks/useEnvironment';

/**
 * A single work panel. Tilts toward the pointer in 3D, drives a light sweep
 * from the pointer position, and parallaxes its artwork inside the frame.
 */
function WorkCard({ project, index }: { project: ProjectSummary; index: number }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const cursor = useCursor();
  const reduced = usePrefersReducedMotion();

  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const springX = useSpring(px, { stiffness: 180, damping: 22 });
  const springY = useSpring(py, { stiffness: 180, damping: 22 });

  const rotateY = useTransform(springX, [0, 1], [7, -7]);
  const rotateX = useTransform(springY, [0, 1], [-6, 6]);

  // Light source follows the pointer across the surface of the card.
  const glow = useTransform<number, string>([springX, springY], (latest) => {
    const x = (latest[0] ?? 0.5) * 100;
    const y = (latest[1] ?? 0.5) * 100;
    return `radial-gradient(420px circle at ${x}% ${y}%, ${withAlpha(project.accentColor, 0.28)}, transparent 62%)`;
  });

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (reduced) return;
    const bounds = cardRef.current?.getBoundingClientRect();
    if (!bounds) return;
    px.set((event.clientX - bounds.left) / bounds.width);
    py.set((event.clientY - bounds.top) / bounds.height);
  };

  const reset = () => {
    px.set(0.5);
    py.set(0.5);
  };

  return (
    <motion.article
      ref={cardRef}
      className="group relative w-[86vw] shrink-0 sm:w-[62vw] lg:w-[42vw] xl:w-[36vw]"
      onPointerMove={onPointerMove}
      onPointerLeave={reset}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 1, ease: ease.expo, delay: (index % 3) * 0.08 }}
      style={{ perspective: 1400 }}
    >
      <Link
        href={`/work/${project.slug}`}
        className="block focus-visible:outline-none"
        aria-label={`Open case study: ${project.title}`}
        {...cursor.bind('view', 'view case', project.accentColor)}
      >
        <motion.div
          className="preserve-3d relative aspect-[4/5] overflow-hidden rounded-[28px] border border-white/8 bg-graphite-300"
          style={reduced ? undefined : { rotateX, rotateY, transformStyle: 'preserve-3d' }}
          transition={{ type: 'spring', stiffness: 160, damping: 20 }}
        >
          <RevealImage
            media={project.cover}
            seed={project.slug}
            accent={project.accentColor}
            secondary={project.secondaryColor}
            alt={project.title}
            className="absolute inset-0 h-full w-full"
            imageClassName="transition-transform duration-1400 ease-expo group-hover:scale-[1.07]"
            sizes="(max-width: 640px) 86vw, (max-width: 1024px) 62vw, 40vw"
            parallax={6}
          />

          {/* Pointer light */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-700 group-hover:opacity-100"
            style={{ background: glow }}
          />

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />

          {/* Index + category */}
          <div className="absolute inset-x-0 top-0 flex items-start justify-between p-6">
            <span className="font-mono text-xs tracking-[0.2em] text-white/50">
              {String(index + 1).padStart(2, '0')}
            </span>
            {project.category ? (
              <span
                className="rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] backdrop-blur-md"
                style={{
                  borderColor: withAlpha(project.category.color, 0.35),
                  color: project.category.color,
                  background: withAlpha(project.category.color, 0.1),
                }}
              >
                {project.category.name}
              </span>
            ) : null}
          </div>

          {/* Caption */}
          <div className="absolute inset-x-0 bottom-0 p-6 md:p-7">
            <div className="flex items-end justify-between gap-4">
              <div className="min-w-0">
                <h3 className="display truncate text-[clamp(1.6rem,3.4vw,2.6rem)] text-white">
                  {project.title}
                </h3>
                <p className="mt-1.5 line-clamp-2 text-sm text-white/55">{project.subtitle}</p>
              </div>
              <span
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/20 text-white transition-all duration-600 ease-expo group-hover:border-transparent"
                style={{ background: 'transparent' }}
              >
                <ArrowUpRight
                  size={17}
                  className="transition-transform duration-600 ease-expo group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                />
              </span>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] uppercase tracking-[0.2em] text-white/35">
              {project.client ? <span>{project.client}</span> : null}
              {project.year ? <span>{project.year}</span> : null}
              {project.tags.slice(0, 2).map((tag) => (
                <span key={tag.id}>{tag.name}</span>
              ))}
            </div>

            {/* Accent underline grows on hover */}
            <span
              aria-hidden
              className="mt-5 block h-px w-0 transition-all duration-900 ease-expo group-hover:w-full"
              style={{ background: `linear-gradient(90deg, ${project.accentColor}, transparent)` }}
            />
          </div>
        </motion.div>
      </Link>
    </motion.article>
  );
}

export function WorkGallery({ projects }: { projects: ProjectSummary[] }) {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  const isMobile = useIsMobile();
  const reduced = usePrefersReducedMotion();
  const horizontal = !isMobile && !reduced && projects.length > 2;

  useLayoutEffect(() => {
    if (!horizontal) return;

    gsap.registerPlugin(ScrollTrigger);

    const context = gsap.context(() => {
      const track = trackRef.current;
      const section = sectionRef.current;
      if (!track || !section) return;

      const distance = () => Math.max(0, track.scrollWidth - window.innerWidth + 96);

      gsap.to(track, {
        x: () => -distance(),
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: () => `+=${distance()}`,
          pin: true,
          scrub: 0.8,
          invalidateOnRefresh: true,
          anticipatePin: 1,
          onUpdate: (self) => setProgress(self.progress),
        },
      });
    }, sectionRef);

    // Late-loading artwork changes the track width; recalculate once settled.
    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener('load', refresh);
    const timer = window.setTimeout(refresh, 600);

    return () => {
      context.revert();
      window.removeEventListener('load', refresh);
      window.clearTimeout(timer);
    };
  }, [horizontal, projects.length]);

  if (!projects.length) return null;

  return (
    <section
      ref={sectionRef}
      id="work"
      className={cn('relative bg-void', horizontal ? 'h-screen overflow-hidden' : 'py-24 md:py-32')}
      aria-label="Selected work"
    >
      <div className={cn('container', horizontal && 'pt-[calc(var(--header-h)+2rem)]')}>
        <SectionHeading
          index="01"
          eyebrow="Selected work"
          title="Case studies, not thumbnails"
          description="Six projects taken from first question to final production. Open any of them for the full reasoning."
          className="max-w-3xl"
        />
      </div>

      <div
        className={cn(
          horizontal
            ? 'mt-12 flex items-center'
            : 'container mt-14 grid gap-8 sm:grid-cols-2',
        )}
      >
        <div
          ref={trackRef}
          className={cn(
            horizontal ? 'flex gap-8 pl-[max(1.25rem,calc((100vw-1600px)/2+3rem))] pr-24' : 'contents',
          )}
        >
          {projects.map((project, index) => (
            <WorkCard key={project.id} project={project} index={index} />
          ))}

          {horizontal ? (
            <div className="flex w-[30vw] shrink-0 items-center justify-center">
              <Link
                href="/#contact"
                className="group text-center"
                aria-label="Start a project"
              >
                <span className="display block text-fluid-xl text-white/25 transition-colors duration-700 group-hover:text-white">
                  Your project
                  <br />
                  next?
                </span>
                <span className="mt-4 inline-block font-mono text-[10px] uppercase tracking-[0.28em] text-white/35">
                  Get in touch →
                </span>
              </Link>
            </div>
          ) : null}
        </div>
      </div>

      {horizontal ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-8 z-10 px-6 md:px-10">
          <div className="flex items-center gap-4">
            <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-white/35">
              Drag · scroll
            </span>
            <div className="h-px flex-1 bg-white/10">
              <div
                className="h-full bg-gradient-to-r from-ultraviolet to-signal transition-[width] duration-100"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
            <span className="font-mono text-[10px] tabular-nums text-white/35">
              {String(Math.min(projects.length, Math.round(progress * projects.length) + 1)).padStart(2, '0')}
              <span className="text-white/20"> / {String(projects.length).padStart(2, '0')}</span>
            </span>
          </div>
        </div>
      ) : null}
    </section>
  );
}
