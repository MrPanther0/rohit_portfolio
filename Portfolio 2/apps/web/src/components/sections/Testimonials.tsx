'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Quote } from 'lucide-react';
import type { Testimonial } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ease } from '@/lib/motion';
import { SectionHeading } from '@/components/layout/SectionHeading';
import { useCursor } from '@/components/experience/CursorProvider';
import { usePrefersReducedMotion } from '@/hooks/useEnvironment';

const ROTATE_MS = 6500;

/**
 * Glass cards at three depths. The stack drifts with the pointer (nearer cards
 * travel further) and advances on its own until the visitor takes over.
 */
export function Testimonials({ testimonials }: { testimonials: Testimonial[] }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const cursor = useCursor();
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (paused || reduced || testimonials.length < 2) return;
    const id = window.setInterval(() => setActive((index) => (index + 1) % testimonials.length), ROTATE_MS);
    return () => window.clearInterval(id);
  }, [paused, reduced, testimonials.length]);

  if (!testimonials.length) return null;

  const stack = [0, 1, 2].map((offset) => ({
    offset,
    testimonial: testimonials[(active + offset) % testimonials.length]!,
  }));

  return (
    <section className="relative overflow-hidden bg-void py-24 md:py-32" aria-label="Client feedback">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-1/2 h-[520px] -translate-y-1/2 opacity-60 blur-3xl"
        style={{
          background:
            'radial-gradient(ellipse 50% 60% at 30% 50%, rgba(139,92,246,0.13), transparent 70%), radial-gradient(ellipse 40% 50% at 75% 45%, rgba(34,211,238,0.1), transparent 70%)',
        }}
      />

      <div className="container relative">
        <SectionHeading
          index="06"
          eyebrow="What clients say"
          title="Six people who had to live with the result"
          align="center"
          className="mx-auto max-w-2xl"
        />

        <div
          ref={containerRef}
          className="relative mx-auto mt-16 h-[430px] max-w-3xl sm:h-[380px]"
          style={{ perspective: 1600 }}
          onPointerMove={(event) => {
            if (reduced) return;
            const bounds = containerRef.current?.getBoundingClientRect();
            if (!bounds) return;
            setParallax({
              x: ((event.clientX - bounds.left) / bounds.width - 0.5) * 2,
              y: ((event.clientY - bounds.top) / bounds.height - 0.5) * 2,
            });
          }}
          onPointerLeave={() => setParallax({ x: 0, y: 0 })}
          onPointerEnter={() => setPaused(true)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
        >
          <AnimatePresence initial={false}>
            {stack.reverse().map(({ offset, testimonial }) => {
              const depth = 2 - offset;
              return (
                <motion.figure
                  key={`${testimonial.id}-${offset}`}
                  className={cn(
                    'glass absolute inset-x-0 top-0 rounded-[28px] p-8 md:p-10',
                    offset === 0 ? 'z-30' : offset === 1 ? 'z-20' : 'z-10',
                  )}
                  initial={{ opacity: 0, y: 60, scale: 0.9, rotateX: -8 }}
                  animate={{
                    opacity: offset === 0 ? 1 : offset === 1 ? 0.45 : 0.2,
                    y: offset * 26,
                    scale: 1 - offset * 0.05,
                    rotateX: reduced ? 0 : parallax.y * -3 * (depth / 2),
                    rotateY: reduced ? 0 : parallax.x * 4 * (depth / 2),
                    x: reduced ? 0 : parallax.x * 10 * (depth / 2),
                  }}
                  exit={{ opacity: 0, y: -50, scale: 0.94 }}
                  transition={{ duration: 0.85, ease: ease.expo }}
                >
                  <Quote size={26} className="text-ultraviolet/70" aria-hidden />
                  <blockquote className="mt-5 text-fluid-lg font-light leading-snug tracking-tight text-white">
                    “{testimonial.quote}”
                  </blockquote>
                  <figcaption className="mt-7 flex items-center gap-4">
                    <span
                      aria-hidden
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/15 bg-white/[0.04] text-sm font-medium text-white/70"
                    >
                      {testimonial.name
                        .split(' ')
                        .map((part) => part[0])
                        .slice(0, 2)
                        .join('')}
                    </span>
                    <span>
                      <span className="block text-sm font-medium text-white">{testimonial.name}</span>
                      <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
                        {[testimonial.role, testimonial.company].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                  </figcaption>
                </motion.figure>
              );
            })}
          </AnimatePresence>
        </div>

        <div className="mt-10 flex items-center justify-center gap-2">
          {testimonials.map((testimonial, index) => (
            <button
              key={testimonial.id}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`Show testimonial from ${testimonial.name}`}
              aria-current={index === active}
              className={cn(
                'h-1 rounded-full transition-all duration-700 ease-expo',
                index === active ? 'w-10 bg-white' : 'w-4 bg-white/20 hover:bg-white/40',
              )}
              {...cursor.bind('link')}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
