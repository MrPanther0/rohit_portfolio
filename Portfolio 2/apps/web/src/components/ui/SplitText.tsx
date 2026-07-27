'use client';

import { useMemo } from 'react';
import { motion, type Variants } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ease } from '@/lib/motion';
import { usePrefersReducedMotion } from '@/hooks/useEnvironment';

type SplitMode = 'chars' | 'words' | 'lines';

interface SplitTextProps {
  children: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span' | 'div';
  mode?: SplitMode;
  className?: string;
  /** Seconds between successive units. */
  stagger?: number;
  delay?: number;
  duration?: number;
  once?: boolean;
  amount?: number;
  /** Skip viewport detection and play as soon as it mounts. */
  immediate?: boolean;
}

/**
 * Masked reveal for display typography. Every unit sits inside an
 * `overflow-hidden` wrapper so glyphs rise out of a hard edge rather than
 * fading in place — the difference between "animated" and "designed".
 */
export function SplitText({
  children,
  as = 'span',
  mode = 'chars',
  className,
  stagger = 0.024,
  delay = 0,
  duration = 1.05,
  once = true,
  amount = 0.4,
  immediate = false,
}: SplitTextProps) {
  const reduced = usePrefersReducedMotion();
  const Component = motion[as] as typeof motion.span;

  const lines = useMemo(() => children.split('\n'), [children]);

  const units = useMemo(
    () =>
      lines.map((line) => {
        if (mode === 'lines') return [line];
        if (mode === 'words') return line.split(' ');
        return line.split('');
      }),
    [lines, mode],
  );

  if (reduced) {
    return <Component className={className}>{children}</Component>;
  }

  const variants: Variants = {
    hidden: { y: '110%', opacity: 0 },
    show: (index: number) => ({
      y: '0%',
      opacity: 1,
      transition: { duration, ease: ease.expo, delay: delay + index * stagger },
    }),
  };

  let counter = -1;

  return (
    <Component
      className={cn(className)}
      initial="hidden"
      {...(immediate ? { animate: 'show' } : { whileInView: 'show', viewport: { once, amount } })}
      aria-label={children}
    >
      {units.map((line, lineIndex) => (
        <span key={lineIndex} className="block overflow-hidden pb-[0.08em]" aria-hidden>
          {line.map((unit, unitIndex) => {
            counter += 1;
            return (
              <motion.span
                key={`${lineIndex}-${unitIndex}`}
                custom={counter}
                variants={variants}
                className="inline-block whitespace-pre will-change-transform"
              >
                {unit}
                {mode === 'words' && unitIndex < line.length - 1 ? ' ' : ''}
              </motion.span>
            );
          })}
        </span>
      ))}
    </Component>
  );
}
