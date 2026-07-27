'use client';

import Image from 'next/image';
import { useMemo, useRef, useState, type ReactNode } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ease } from '@/lib/motion';
import type { MediaRef } from '@/lib/types';
import { usePrefersReducedMotion } from '@/hooks/useEnvironment';

function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type ArtVariant = 'orbit' | 'strata' | 'grid' | 'bloom';

/**
 * Deterministic vector composition used wherever a project has no uploaded
 * artwork yet. Same seed always yields the same picture, so a card looks
 * identical between server render and hydration.
 */
export function ProceduralArt({
  seed,
  accent,
  secondary,
  variant,
  className,
}: {
  seed: string;
  accent: string;
  secondary: string;
  variant?: ArtVariant;
  className?: string;
}) {
  const id = useMemo(() => `art-${hash(seed).toString(36)}`, [seed]);

  const shapes = useMemo<ReactNode[]>(() => {
    const random = rng(hash(seed));
    const pick: ArtVariant =
      variant ?? (['orbit', 'strata', 'grid', 'bloom'] as const)[Math.floor(random() * 4)]!;
    const nodes: ReactNode[] = [];

    if (pick === 'orbit') {
      for (let i = 0; i < 7; i += 1) {
        nodes.push(
          <circle
            key={`c${i}`}
            cx={(0.14 + random() * 0.72) * 1000}
            cy={(0.14 + random() * 0.72) * 1250}
            r={(0.16 + random() * 0.4) * 900}
            fill="none"
            stroke={`url(#${id}-stroke)`}
            strokeWidth={1 + random() * 2.4}
            opacity={0.12 + random() * 0.3}
          />,
        );
      }
    } else if (pick === 'strata') {
      for (let i = 0; i < 15; i += 1) {
        nodes.push(
          <rect
            key={`s${i}`}
            x={-100}
            y={(i / 15) * 1250 + random() * 20}
            width={1200}
            height={3 + random() * 30}
            fill={`url(#${id}-stroke)`}
            opacity={0.05 + random() * 0.2}
            transform={`rotate(${(-9 + random() * 18).toFixed(2)} 500 625)`}
          />,
        );
      }
    } else if (pick === 'grid') {
      const cols = 8;
      const rows = 10;
      for (let x = 0; x < cols; x += 1) {
        for (let y = 0; y < rows; y += 1) {
          if (random() > 0.55) continue;
          nodes.push(
            <rect
              key={`g${x}-${y}`}
              x={(x * 1000) / cols}
              y={(y * 1250) / rows}
              width={(1000 / cols) * (0.3 + random() * 0.62)}
              height={(1250 / rows) * (0.22 + random() * 0.5)}
              fill={`url(#${id}-stroke)`}
              opacity={0.06 + random() * 0.26}
              rx={6}
            />,
          );
        }
      }
    } else {
      for (let i = 0; i < 5; i += 1) {
        nodes.push(
          <ellipse
            key={`b${i}`}
            cx={random() * 1000}
            cy={random() * 1250}
            rx={(0.2 + random() * 0.4) * 1000}
            ry={(0.16 + random() * 0.34) * 1250}
            fill={`url(#${id}-bloom)`}
            opacity={0.25 + random() * 0.4}
          />,
        );
      }
    }

    return nodes;
  }, [seed, variant, id]);

  return (
    <svg
      viewBox="0 0 1000 1250"
      preserveAspectRatio="xMidYMid slice"
      className={cn('h-full w-full', className)}
      aria-hidden
      role="presentation"
    >
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#08080c" />
          <stop offset="55%" stopColor="#0d0b16" />
          <stop offset="100%" stopColor="#050505" />
        </linearGradient>
        <linearGradient id={`${id}-stroke`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={accent} />
          <stop offset="100%" stopColor={secondary} />
        </linearGradient>
        <radialGradient id={`${id}-bloom`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={accent} stopOpacity="0.85" />
          <stop offset="100%" stopColor={secondary} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-glow`} cx="28%" cy="18%" r="72%">
          <stop offset="0%" stopColor={accent} stopOpacity="0.32" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </radialGradient>
        <filter id={`${id}-soft`}>
          <feGaussianBlur stdDeviation="14" />
        </filter>
      </defs>

      <rect width="1000" height="1250" fill={`url(#${id}-bg)`} />
      <rect width="1000" height="1250" fill={`url(#${id}-glow)`} />
      <g filter={`url(#${id}-soft)`}>{shapes}</g>
    </svg>
  );
}

interface RevealImageProps {
  media?: MediaRef | null;
  seed: string;
  accent?: string;
  secondary?: string;
  variant?: ArtVariant;
  alt?: string;
  className?: string;
  imageClassName?: string;
  sizes?: string;
  priority?: boolean;
  /** Vertical drift inside the frame while scrolling, in percent of height. */
  parallax?: number;
  /** Play the clip-path wipe when the frame enters the viewport. */
  reveal?: boolean;
}

/**
 * One component for every picture on the site: clip-path reveal, blur-up
 * placeholder, lazy loading, in-frame parallax, and a procedural fallback when
 * no asset has been uploaded.
 */
export function RevealImage({
  media,
  seed,
  accent = '#8B5CF6',
  secondary = '#22D3EE',
  variant,
  alt,
  className,
  imageClassName,
  sizes = '(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 40vw',
  priority = false,
  parallax = 0,
  reveal = true,
}: RevealImageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const reduced = usePrefersReducedMotion();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  });
  const y = useTransform(scrollYProgress, [0, 1], [`-${parallax}%`, `${parallax}%`]);

  const hasImage = Boolean(media?.url);

  return (
    <motion.div
      ref={containerRef}
      className={cn('relative overflow-hidden bg-graphite-300', className)}
      initial={reveal && !reduced ? { clipPath: 'inset(0% 0% 100% 0%)' } : undefined}
      whileInView={reveal && !reduced ? { clipPath: 'inset(0% 0% 0% 0%)' } : undefined}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 1.2, ease: ease.expo }}
    >
      <motion.div
        className="absolute inset-0 h-[calc(100%+var(--overscan))] -top-[calc(var(--overscan)/2)] gpu"
        style={{
          y: reduced || parallax === 0 ? 0 : y,
          ['--overscan' as string]: `${parallax * 2}%`,
        }}
      >
        {hasImage ? (
          <Image
            src={media!.url}
            alt={alt ?? media!.alt ?? ''}
            fill
            sizes={sizes}
            priority={priority}
            loading={priority ? undefined : 'lazy'}
            quality={86}
            placeholder={media!.blurDataUrl ? 'blur' : 'empty'}
            blurDataURL={media!.blurDataUrl ?? undefined}
            onLoad={() => setLoaded(true)}
            className={cn(
              'object-cover transition-[transform,filter,opacity] duration-1200 ease-expo',
              loaded ? 'scale-100 blur-0 opacity-100' : 'scale-[1.06] blur-lg opacity-0',
              imageClassName,
            )}
          />
        ) : (
          <ProceduralArt
            seed={seed}
            accent={accent}
            secondary={secondary}
            variant={variant}
            className={imageClassName}
          />
        )}
      </motion.div>
    </motion.div>
  );
}
