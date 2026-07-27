'use client';

import { useRef, type ReactNode } from 'react';
import { motion, useAnimationFrame, useMotionValue, useTransform } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useSmoothScroll } from '@/components/experience/SmoothScroll';
import { usePrefersReducedMotion } from '@/hooks/useEnvironment';

interface MarqueeProps {
  children: ReactNode;
  /** Base pixels travelled per second. Negative reverses direction. */
  speed?: number;
  /** Extra push proportional to scroll velocity — the strip reacts to the reader. */
  scrollBoost?: number;
  className?: string;
  itemClassName?: string;
  repeat?: number;
  pauseOnHover?: boolean;
  /** Skew the whole strip with scroll velocity for a sense of drag. */
  skew?: boolean;
}

/**
 * Velocity-aware infinite marquee. Content is duplicated once and the track is
 * wrapped modulo 50%, so the loop is seamless regardless of content width.
 */
export function Marquee({
  children,
  speed = 60,
  scrollBoost = 0.6,
  className,
  itemClassName,
  repeat = 2,
  pauseOnHover = false,
  skew = false,
}: MarqueeProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const offset = useMotionValue(0);
  const paused = useRef(false);
  const { velocity } = useSmoothScroll();
  const reduced = usePrefersReducedMotion();

  const skewValue = useMotionValue(0);
  const skewSmooth = useTransform(skewValue, (value) => `${value.toFixed(2)}deg`);

  useAnimationFrame((_, delta) => {
    if (reduced || paused.current) return;
    const track = trackRef.current;
    if (!track) return;

    const half = track.scrollWidth / 2;
    if (half <= 0) return;

    const boost = velocity.current * scrollBoost;
    let next = offset.get() - ((speed + boost) * delta) / 1000;

    // Wrap within a single copy so the offset never grows unbounded.
    if (next <= -half) next += half;
    else if (next > 0) next -= half;
    offset.set(next);

    if (skew) {
      const target = Math.max(-6, Math.min(6, velocity.current * 0.25));
      skewValue.set(skewValue.get() + (target - skewValue.get()) * 0.08);
    }
  });

  const content = Array.from({ length: Math.max(2, repeat) }, (_, index) => (
    <div key={index} className={cn('flex shrink-0 items-center', itemClassName)} aria-hidden={index > 0}>
      {children}
    </div>
  ));

  return (
    <motion.div
      className={cn('relative w-full overflow-hidden', className)}
      style={skew ? { skewX: skewSmooth } : undefined}
      onPointerEnter={() => {
        if (pauseOnHover) paused.current = true;
      }}
      onPointerLeave={() => {
        if (pauseOnHover) paused.current = false;
      }}
    >
      <motion.div ref={trackRef} className="flex w-max will-change-transform" style={{ x: offset }}>
        {content}
      </motion.div>
    </motion.div>
  );
}
