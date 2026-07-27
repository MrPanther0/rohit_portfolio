'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import type { Category } from '@/lib/types';
import { Marquee } from '@/components/ui/Marquee';
import { usePrefersReducedMotion } from '@/hooks/useEnvironment';

const STATEMENT =
  'Design should carry an argument. A mark means something before it looks like anything. A grid has a point of view. Everything that does not earn its place gets cut.';

/**
 * The transition between the hero and the work: a velocity-reactive marquee
 * followed by a statement whose words illuminate one at a time as they pass
 * the middle of the viewport.
 */
export function Manifesto({ categories }: { categories: Category[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();

  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.85', 'end 0.35'] });
  const words = STATEMENT.split(' ');

  return (
    <section className="relative overflow-hidden border-y border-white/6 bg-void py-20 md:py-28">
      <Marquee speed={38} scrollBoost={0.9} skew className="mb-20 opacity-90" itemClassName="gap-10 px-5">
        {categories.map((category) => (
          <span key={category.id} className="flex items-center gap-10">
            <span className="display whitespace-nowrap text-fluid-2xl text-white/85">{category.name}</span>
            <span
              className="h-2.5 w-2.5 shrink-0 rotate-45"
              style={{ background: category.color }}
              aria-hidden
            />
          </span>
        ))}
      </Marquee>

      <div ref={ref} className="container">
        <p className="max-w-5xl text-fluid-xl font-light leading-[1.35] tracking-tight">
          {words.map((word, index) => {
            const start = index / words.length;
            const end = start + 1 / words.length;
            return (
              // The trailing space is a real text node, so selecting or reading
              // the statement aloud produces sentences rather than one long word.
              <span key={index}>
                <Word progress={scrollYProgress} range={[start, end]} reduced={reduced}>
                  {word}
                </Word>{' '}
              </span>
            );
          })}
        </p>
      </div>
    </section>
  );
}

function Word({
  children,
  progress,
  range,
  reduced,
}: {
  children: string;
  progress: ReturnType<typeof useScroll>['scrollYProgress'];
  range: [number, number];
  reduced: boolean;
}) {
  const opacity = useTransform(progress, range, [0.16, 1]);
  const blur = useTransform(progress, range, ['blur(5px)', 'blur(0px)']);

  return (
    <span className="relative inline-block">
      <motion.span
        className="inline-block text-white"
        style={reduced ? { opacity: 1 } : { opacity, filter: blur }}
      >
        {children}
      </motion.span>
    </span>
  );
}
