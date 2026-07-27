'use client';

import { useCallback, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { MoveHorizontal } from 'lucide-react';
import { cn, clamp } from '@/lib/utils';
import { ProceduralArt, type ArtVariant } from './Visual';
import type { MediaRef } from '@/lib/types';
import { useCursor } from '@/components/experience/CursorProvider';

interface BeforeAfterProps {
  before?: MediaRef | null;
  after?: MediaRef | null;
  beforeLabel?: string;
  afterLabel?: string;
  seed: string;
  accent?: string;
  secondary?: string;
  className?: string;
}

function Layer({
  media,
  seed,
  accent,
  secondary,
  variant,
  alt,
}: {
  media?: MediaRef | null;
  seed: string;
  accent: string;
  secondary: string;
  variant: ArtVariant;
  alt: string;
}) {
  if (media?.url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={media.url} alt={alt} className="h-full w-full object-cover" draggable={false} />;
  }
  return <ProceduralArt seed={seed} accent={accent} secondary={secondary} variant={variant} />;
}

/**
 * Draggable comparison. Works with pointer, touch and the keyboard — the
 * handle is a real slider with arrow-key support and an ARIA value.
 */
export function BeforeAfter({
  before,
  after,
  beforeLabel = 'Before',
  afterLabel = 'After',
  seed,
  accent = '#8B5CF6',
  secondary = '#22D3EE',
  className,
}: BeforeAfterProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(50);
  const dragging = useRef(false);
  const cursor = useCursor();

  const updateFromClientX = useCallback((clientX: number) => {
    const bounds = containerRef.current?.getBoundingClientRect();
    if (!bounds) return;
    setPosition(clamp(((clientX - bounds.left) / bounds.width) * 100, 0, 100));
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative aspect-[16/10] w-full select-none overflow-hidden rounded-3xl border border-white/8',
        className,
      )}
      onPointerDown={(event) => {
        dragging.current = true;
        (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
        updateFromClientX(event.clientX);
      }}
      onPointerMove={(event) => {
        if (dragging.current) updateFromClientX(event.clientX);
      }}
      onPointerUp={() => {
        dragging.current = false;
      }}
      onPointerCancel={() => {
        dragging.current = false;
      }}
      {...cursor.bind('drag', 'drag')}
    >
      <div className="absolute inset-0">
        <Layer
          media={after}
          seed={`${seed}-after`}
          accent={accent}
          secondary={secondary}
          variant="bloom"
          alt={afterLabel}
        />
      </div>

      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}>
        <Layer
          media={before}
          seed={`${seed}-before`}
          accent={secondary}
          secondary={accent}
          variant="grid"
          alt={beforeLabel}
        />
        <div className="absolute inset-0 bg-black/25" />
      </div>

      {/* Labels */}
      <span className="pointer-events-none absolute left-5 top-5 rounded-full border border-white/15 bg-black/45 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.24em] text-white/70 backdrop-blur">
        {beforeLabel}
      </span>
      <span className="pointer-events-none absolute right-5 top-5 rounded-full border border-white/15 bg-black/45 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.24em] text-white/70 backdrop-blur">
        {afterLabel}
      </span>

      {/* Handle */}
      <motion.div
        className="absolute inset-y-0 z-10 w-px bg-white/80"
        style={{ left: `${position}%` }}
        animate={{ boxShadow: `0 0 26px 2px ${accent}` }}
      >
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div
            role="slider"
            tabIndex={0}
            aria-label="Comparison position"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(position)}
            aria-valuetext={`${Math.round(position)}% ${beforeLabel}`}
            onKeyDown={(event) => {
              if (event.key === 'ArrowLeft') setPosition((p) => clamp(p - 4, 0, 100));
              if (event.key === 'ArrowRight') setPosition((p) => clamp(p + 4, 0, 100));
              if (event.key === 'Home') setPosition(0);
              if (event.key === 'End') setPosition(100);
            }}
            className="grid h-12 w-12 cursor-ew-resize place-items-center rounded-full border border-white/25 bg-black/60 text-white backdrop-blur-md transition-transform duration-300 ease-expo hover:scale-110"
          >
            <MoveHorizontal size={16} />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
