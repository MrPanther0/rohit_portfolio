'use client';

import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowLeft, ArrowUpRight, Quote } from 'lucide-react';
import type { Project, ProjectNeighbour } from '@/lib/types';
import { cn, withAlpha } from '@/lib/utils';
import { ease } from '@/lib/motion';
import { SplitText } from '@/components/ui/SplitText';
import { Markdown } from '@/components/ui/Markdown';
import { RevealImage } from '@/components/ui/Visual';
import { Lightbox } from '@/components/ui/Lightbox';
import { BeforeAfter } from '@/components/ui/BeforeAfter';
import { Counter } from '@/components/ui/Counter';
import { useCursor } from '@/components/experience/CursorProvider';
import { trackEvent } from '@/components/experience/Analytics';
import { usePrefersReducedMotion } from '@/hooks/useEnvironment';

interface ProjectViewProps {
  project: Project;
  previous: ProjectNeighbour | null;
  next: ProjectNeighbour | null;
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-white/8 py-4">
      <dt className="font-mono text-[10px] uppercase tracking-[0.24em] text-white/35">{label}</dt>
      <dd className="mt-1.5 text-sm text-white/80">{value}</dd>
    </div>
  );
}

export function ProjectView({ project, previous, next }: ProjectViewProps) {
  const heroRef = useRef<HTMLElement>(null);
  const cursor = useCursor();
  const reduced = usePrefersReducedMotion();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 1.16]);
  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '18%']);
  const titleY = useTransform(scrollYProgress, [0, 1], ['0%', '-38%']);

  const galleryItems = useMemo(
    () => project.gallery.filter((item) => item.kind !== 'BEFORE' && item.kind !== 'AFTER'),
    [project.gallery],
  );

  const before = project.gallery.find((item) => item.kind === 'BEFORE');
  const after = project.gallery.find((item) => item.kind === 'AFTER');

  const sketches = galleryItems.filter((item) => item.kind === 'SKETCH' || item.kind === 'PROCESS');
  const outputs = galleryItems.filter((item) => item.kind === 'OUTPUT' || item.kind === 'GALLERY');

  return (
    <article
      style={{
        ['--project-accent' as string]: project.accentColor,
        ['--project-secondary' as string]: project.secondaryColor,
      }}
    >
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section
        ref={heroRef}
        className="relative flex min-h-[92svh] items-end overflow-hidden pb-14 pt-[calc(var(--header-h)+3rem)]"
      >
        <motion.div className="absolute inset-0 -z-10" style={reduced ? undefined : { scale: heroScale, y: heroY }}>
          {project.heroVideoUrl ? (
            <video
              src={project.heroVideoUrl}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              className="h-full w-full object-cover"
              aria-hidden
            />
          ) : (
            <RevealImage
              media={project.cover}
              seed={project.slug}
              accent={project.accentColor}
              secondary={project.secondaryColor}
              alt={project.title}
              className="h-full w-full"
              sizes="100vw"
              priority
              reveal={false}
            />
          )}
        </motion.div>

        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-void via-void/60 to-void/35" />
        <div
          className="absolute inset-0 -z-10 opacity-50"
          style={{
            background: `radial-gradient(ellipse 70% 50% at 20% 100%, ${withAlpha(project.accentColor, 0.28)}, transparent 65%)`,
          }}
        />

        <motion.div className="container" style={reduced ? undefined : { y: titleY }}>
          <Link
            href="/#work"
            className="group mb-8 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-white/45 transition-colors hover:text-white"
            {...cursor.bind('link', 'back')}
          >
            <ArrowLeft size={14} className="transition-transform duration-500 group-hover:-translate-x-1" />
            All work
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            {project.category ? (
              <span
                className="rounded-full border px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em]"
                style={{
                  borderColor: withAlpha(project.category.color, 0.4),
                  color: project.category.color,
                  background: withAlpha(project.category.color, 0.1),
                }}
              >
                {project.category.name}
              </span>
            ) : null}
            {project.year ? (
              <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-white/40">
                {project.year}
              </span>
            ) : null}
          </div>

          <SplitText
            as="h1"
            mode="chars"
            immediate
            stagger={0.026}
            delay={0.15}
            className="display mt-5 max-w-[14ch] text-fluid-3xl text-white"
          >
            {project.title}
          </SplitText>

          {project.subtitle ? (
            <motion.p
              className="mt-5 max-w-2xl text-fluid-lg font-light leading-snug text-white/65"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: ease.expo, delay: 0.55 }}
            >
              {project.subtitle}
            </motion.p>
          ) : null}
        </motion.div>
      </section>

      {/* ── Overview ─────────────────────────────────────────────────────── */}
      <section className="container grid gap-14 py-20 md:py-28 lg:grid-cols-[1fr_320px] lg:gap-20">
        <div>
          {project.excerpt ? (
            <p className="mb-10 max-w-3xl text-fluid-lg font-light leading-snug tracking-tight text-white">
              {project.excerpt}
            </p>
          ) : null}
          <Markdown content={project.description} className="max-w-2xl" />

          {project.metrics.length ? (
            <dl className="mt-14 grid gap-8 border-t border-white/8 pt-10 sm:grid-cols-3">
              {project.metrics.map((metric) => {
                const numeric = Number.parseFloat(metric.value.replace(/[^0-9.-]/g, ''));
                const prefix = metric.value.startsWith('+') ? '+' : metric.value.startsWith('−') ? '−' : '';
                const suffix = metric.value.replace(/^[+−-]?[\d.,]*/, '');
                return (
                  <div key={metric.label}>
                    <dt className="sr-only">{metric.label}</dt>
                    <dd>
                      <span className="display block text-fluid-xl" style={{ color: project.accentColor }}>
                        {Number.isFinite(numeric) ? (
                          <Counter value={Math.abs(numeric)} prefix={prefix} suffix={suffix} />
                        ) : (
                          metric.value
                        )}
                      </span>
                      <span className="mt-2 block font-mono text-[10px] uppercase tracking-[0.2em] text-white/35">
                        {metric.label}
                      </span>
                    </dd>
                  </div>
                );
              })}
            </dl>
          ) : null}
        </div>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <dl>
            {project.client ? <MetaRow label="Client" value={project.client} /> : null}
            {project.role ? <MetaRow label="Role" value={project.role} /> : null}
            {project.duration ? <MetaRow label="Duration" value={project.duration} /> : null}
            {project.deliverables.length ? (
              <MetaRow label="Deliverables" value={project.deliverables.join(' · ')} />
            ) : null}
            {project.tags.length ? (
              <MetaRow label="Disciplines" value={project.tags.map((tag) => tag.name).join(' · ')} />
            ) : null}
          </dl>

          {(project.liveUrl || project.behanceUrl || project.dribbbleUrl) && (
            <div className="mt-8 flex flex-wrap gap-2">
              {[
                { label: 'Live', href: project.liveUrl },
                { label: 'Behance', href: project.behanceUrl },
                { label: 'Dribbble', href: project.dribbbleUrl },
              ]
                .filter((link): link is { label: string; href: string } => Boolean(link.href))
                .map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackEvent('outbound', `${project.slug}:${link.label}`)}
                    className="group inline-flex items-center gap-1.5 rounded-full border border-white/12 px-4 py-2 text-sm text-white/60 transition-all duration-500 hover:border-white/35 hover:text-white"
                    {...cursor.bind('link', 'open')}
                  >
                    {link.label}
                    <ArrowUpRight size={13} />
                  </a>
                ))}
            </div>
          )}
        </aside>
      </section>

      {/* ── Process ──────────────────────────────────────────────────────── */}
      {project.processSteps.length ? (
        <section className="border-y border-white/6 bg-graphite-400/40 py-20 md:py-28">
          <div className="container">
            <h2 className="eyebrow mb-12">Process</h2>
            <ol className="grid gap-x-10 gap-y-12 md:grid-cols-2 xl:grid-cols-4">
              {project.processSteps.map((step, index) => (
                <motion.li
                  key={step.title}
                  initial={{ opacity: 0, y: 28 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ duration: 0.9, ease: ease.expo, delay: index * 0.08 }}
                >
                  <div className="mb-5 flex items-center gap-3">
                    <span
                      className="grid h-8 w-8 place-items-center rounded-full font-mono text-[11px]"
                      style={{
                        background: withAlpha(project.accentColor, 0.14),
                        color: project.accentColor,
                      }}
                    >
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span
                      className="h-px flex-1"
                      style={{
                        background: `linear-gradient(90deg, ${withAlpha(project.accentColor, 0.5)}, transparent)`,
                      }}
                    />
                  </div>
                  <h3 className="text-fluid-lg font-medium tracking-tight text-white">{step.title}</h3>
                  {step.duration ? (
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-white/30">
                      {step.duration}
                    </p>
                  ) : null}
                  <p className="mt-3 text-sm leading-relaxed text-white/55">{step.body}</p>
                </motion.li>
              ))}
            </ol>
          </div>
        </section>
      ) : null}

      {/* ── Sketches & exploration ───────────────────────────────────────── */}
      {sketches.length ? (
        <section className="container py-20 md:py-28">
          <h2 className="eyebrow mb-10">Exploration</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {sketches.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setLightboxIndex(galleryItems.indexOf(item))}
                className="group relative block overflow-hidden rounded-2xl"
                aria-label={`Open ${item.caption ?? `exploration ${index + 1}`} in the viewer`}
                {...cursor.bind('media', 'expand', project.accentColor)}
              >
                <RevealImage
                  media={item.media}
                  seed={`${project.slug}-${item.id}`}
                  accent={project.accentColor}
                  secondary={project.secondaryColor}
                  alt={item.caption ?? `${project.title} exploration ${index + 1}`}
                  className="aspect-[4/3] w-full"
                  imageClassName="transition-transform duration-1400 ease-expo group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  parallax={4}
                />
                <span className="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-700 group-hover:bg-black/20" />
                {item.caption ? (
                  <span className="absolute bottom-3 left-4 font-mono text-[10px] uppercase tracking-[0.2em] text-white/70">
                    {item.caption}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {/* ── Palette & typography ─────────────────────────────────────────── */}
      {(project.palette.length > 0 || project.typography.length > 0) && (
        <section className="border-y border-white/6 bg-graphite-400/40 py-20 md:py-28">
          <div className="container grid gap-16 lg:grid-cols-2 lg:gap-24">
            {project.palette.length ? (
              <div>
                <h2 className="eyebrow mb-8">Colour</h2>
                <ul className="space-y-3">
                  {project.palette.map((swatch, index) => (
                    <motion.li
                      key={swatch.hex + index}
                      className="group flex items-center gap-5"
                      initial={{ opacity: 0, x: -14 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, amount: 0.6 }}
                      transition={{ duration: 0.7, ease: ease.expo, delay: index * 0.06 }}
                    >
                      <span
                        className="h-14 w-14 shrink-0 rounded-xl border border-white/10 transition-transform duration-500 ease-expo group-hover:scale-110"
                        style={{ background: swatch.hex, boxShadow: `0 12px 40px -18px ${swatch.hex}` }}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1 border-b border-white/6 pb-3">
                        <span className="flex flex-wrap items-baseline justify-between gap-2">
                          <span className="text-sm text-white">{swatch.name}</span>
                          <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-white/40">
                            {swatch.hex}
                          </span>
                        </span>
                        {swatch.usage ? (
                          <span className="mt-1 block text-xs text-white/35">{swatch.usage}</span>
                        ) : null}
                      </span>
                    </motion.li>
                  ))}
                </ul>
              </div>
            ) : null}

            {project.typography.length ? (
              <div>
                <h2 className="eyebrow mb-8">Typography</h2>
                <ul className="space-y-6">
                  {project.typography.map((face, index) => (
                    <motion.li
                      key={face.family + index}
                      className="border-b border-white/6 pb-6"
                      initial={{ opacity: 0, y: 18 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.6 }}
                      transition={{ duration: 0.8, ease: ease.expo, delay: index * 0.08 }}
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-3">
                        <span className="text-fluid-lg tracking-tight text-white">{face.family}</span>
                        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/35">
                          {face.role}
                        </span>
                      </div>
                      {face.weights ? (
                        <p className="mt-1 font-mono text-[11px] text-white/30">{face.weights}</p>
                      ) : null}
                      {face.sample ? (
                        <p className="mt-4 text-[clamp(1.6rem,4vw,2.6rem)] font-light leading-none tracking-tight text-white/55">
                          {face.sample}
                        </p>
                      ) : null}
                    </motion.li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </section>
      )}

      {/* ── Before / after ───────────────────────────────────────────────── */}
      {before && after ? (
        <section className="container py-20 md:py-28">
          <h2 className="eyebrow mb-10">Before &amp; after</h2>
          <BeforeAfter
            before={before.media}
            after={after.media}
            seed={project.slug}
            accent={project.accentColor}
            secondary={project.secondaryColor}
          />
        </section>
      ) : null}

      {/* ── Final outputs ────────────────────────────────────────────────── */}
      {outputs.length ? (
        <section className="container py-20 md:py-28">
          <h2 className="eyebrow mb-10">Outcome</h2>
          <div className="grid auto-rows-[minmax(220px,auto)] grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {outputs.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setLightboxIndex(galleryItems.indexOf(item))}
                aria-label={`Open ${item.caption ?? `image ${index + 1}`} in the viewer`}
                className={cn(
                  'group relative overflow-hidden rounded-2xl',
                  item.span >= 2 ? 'sm:col-span-2 sm:row-span-2' : '',
                )}
                {...cursor.bind('media', 'expand', project.accentColor)}
              >
                <RevealImage
                  media={item.media}
                  seed={`${project.slug}-${item.id}`}
                  accent={index % 2 === 0 ? project.accentColor : project.secondaryColor}
                  secondary={index % 2 === 0 ? project.secondaryColor : project.accentColor}
                  alt={item.caption ?? `${project.title} — image ${index + 1}`}
                  className={cn('w-full', item.span >= 2 ? 'aspect-[16/11] h-full' : 'aspect-[4/5] h-full')}
                  imageClassName="transition-transform duration-1600 ease-expo group-hover:scale-[1.06]"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  parallax={5}
                />
                <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-700 group-hover:opacity-100" />
                {item.caption ? (
                  <span className="pointer-events-none absolute bottom-4 left-5 translate-y-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white opacity-0 transition-all duration-700 ease-expo group-hover:translate-y-0 group-hover:opacity-100">
                    {item.caption}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {/* ── Client feedback ──────────────────────────────────────────────── */}
      {project.feedback ? (
        <section className="border-y border-white/6 py-20 md:py-28">
          <div className="container">
            <motion.figure
              className="glass mx-auto max-w-4xl rounded-[32px] p-9 text-center md:p-14"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 1, ease: ease.expo }}
              style={{ boxShadow: `0 40px 120px -60px ${project.accentColor}` }}
            >
              <Quote size={28} className="mx-auto" style={{ color: project.accentColor }} aria-hidden />
              <blockquote className="mt-7 text-fluid-xl font-light leading-tight tracking-tight text-white">
                “{project.feedback.quote}”
              </blockquote>
              <figcaption className="mt-8 font-mono text-[10px] uppercase tracking-[0.24em] text-white/45">
                {project.feedback.author}
                {project.feedback.role ? ` · ${project.feedback.role}` : ''}
              </figcaption>
            </motion.figure>
          </div>
        </section>
      ) : null}

      {/* ── Next project ─────────────────────────────────────────────────── */}
      {next ? (
        <section className="relative overflow-hidden">
          <Link
            href={`/work/${next.slug}`}
            className="group relative block py-24 md:py-32"
            {...cursor.bind('view', 'next case', next.accentColor)}
          >
            <div className="absolute inset-0 -z-10 opacity-25 transition-opacity duration-1000 group-hover:opacity-45">
              <RevealImage
                media={next.cover}
                seed={next.slug}
                accent={next.accentColor}
                secondary={project.secondaryColor}
                alt=""
                className="h-full w-full"
                sizes="100vw"
                reveal={false}
              />
            </div>
            <div className="absolute inset-0 -z-10 bg-gradient-to-b from-void via-void/70 to-void" />

            <div className="container text-center">
              <span className="eyebrow">Next case study</span>
              <span className="display mt-4 block text-fluid-3xl text-white transition-transform duration-1200 ease-expo group-hover:-translate-y-1.5">
                {next.title}
              </span>
              {next.subtitle ? (
                <span className="mt-4 block text-fluid-base text-white/50">{next.subtitle}</span>
              ) : null}
              <span className="mt-8 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-white/60">
                Open case
                <ArrowUpRight size={14} className="transition-transform duration-500 group-hover:translate-x-1" />
              </span>
            </div>
          </Link>

          {previous ? (
            <div className="container pb-14">
              <Link
                href={`/work/${previous.slug}`}
                className="group inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-white/35 transition-colors hover:text-white"
                {...cursor.bind('link', 'previous')}
              >
                <ArrowLeft size={14} className="transition-transform duration-500 group-hover:-translate-x-1" />
                Previous — {previous.title}
              </Link>
            </div>
          ) : null}
        </section>
      ) : null}

      <Lightbox
        items={galleryItems}
        index={lightboxIndex}
        seed={project.slug}
        accent={project.accentColor}
        secondary={project.secondaryColor}
        onClose={() => setLightboxIndex(null)}
        onNavigate={setLightboxIndex}
      />
    </article>
  );
}
