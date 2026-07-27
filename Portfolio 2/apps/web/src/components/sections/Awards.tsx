'use client';

import { useMemo, useRef } from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import type { Award } from '@/lib/types';
import { ease } from '@/lib/motion';
import { SectionHeading } from '@/components/layout/SectionHeading';
import { useCursor } from '@/components/experience/CursorProvider';

export function Awards({ awards }: { awards: Award[] }) {
  const listRef = useRef<HTMLDivElement>(null);
  const cursor = useCursor();

  const { scrollYProgress } = useScroll({ target: listRef, offset: ['start 0.8', 'end 0.6'] });
  const beam = useSpring(scrollYProgress, { stiffness: 110, damping: 30 });

  const grouped = useMemo(() => {
    const map = new Map<number, Award[]>();
    for (const award of awards) {
      const bucket = map.get(award.year) ?? [];
      bucket.push(award);
      map.set(award.year, bucket);
    }
    return [...map.entries()].sort((a, b) => b[0] - a[0]);
  }, [awards]);

  if (!awards.length) return null;

  return (
    <section id="awards" className="relative bg-void py-24 md:py-32" aria-label="Recognition">
      <div className="container">
        <SectionHeading
          index="05"
          eyebrow="Recognition"
          title="Occasionally, other people agree"
          className="max-w-2xl"
        />

        <div ref={listRef} className="relative mt-16">
          {/* Light beam that fills as the list scrolls past */}
          <div aria-hidden className="absolute inset-y-0 left-0 hidden w-px bg-white/8 md:block" />
          <motion.div
            aria-hidden
            className="absolute inset-y-0 left-0 hidden w-px origin-top bg-gradient-to-b from-signal via-ultraviolet to-transparent md:block"
            style={{ scaleY: beam }}
          />

          {grouped.map(([year, items], groupIndex) => (
            <div key={year} className="relative md:pl-14">
              <motion.p
                className="display sticky top-24 mb-4 text-fluid-lg text-white/20 md:absolute md:-left-2 md:top-1 md:mb-0 md:-translate-x-full md:pr-8"
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.6 }}
                transition={{ duration: 0.8, ease: ease.expo }}
              >
                {year}
              </motion.p>

              <ul className="divide-y divide-white/6 border-t border-white/6">
                {items.map((award, index) => {
                  const Wrapper = award.url ? 'a' : 'div';
                  return (
                    <motion.li
                      key={award.id}
                      initial={{ opacity: 0, y: 18 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.5 }}
                      transition={{
                        duration: 0.8,
                        ease: ease.expo,
                        delay: (groupIndex * 2 + index) * 0.04,
                      }}
                    >
                      <Wrapper
                        {...(award.url
                          ? {
                              href: award.url,
                              target: '_blank',
                              rel: 'noopener noreferrer',
                              ...cursor.bind('link', 'open'),
                            }
                          : {})}
                        className="group flex items-start justify-between gap-6 py-6 transition-colors duration-500 hover:bg-white/[0.015]"
                      >
                        <div className="min-w-0">
                          <h3 className="text-fluid-lg font-light tracking-tight text-white/85 transition-colors duration-500 group-hover:text-white">
                            {award.title}
                          </h3>
                          <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-signal">
                            {award.organization}
                          </p>
                          {award.description ? (
                            <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/45">
                              {award.description}
                            </p>
                          ) : null}
                        </div>

                        {award.url ? (
                          <ArrowUpRight
                            size={18}
                            className="mt-1 shrink-0 text-white/25 transition-all duration-500 ease-expo group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white"
                          />
                        ) : null}
                      </Wrapper>
                    </motion.li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
