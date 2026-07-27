'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ease } from '@/lib/motion';
import type { GalleryItem } from '@/lib/types';
import { ProceduralArt } from './Visual';

interface LightboxProps {
  items: GalleryItem[];
  index: number | null;
  seed: string;
  accent: string;
  secondary: string;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

/**
 * Full-screen viewer with keyboard, drag and wheel-zoom support.
 * Focus is trapped while open and returned to the trigger on close.
 */
export function Lightbox({ items, index, seed, accent, secondary, onClose, onNavigate }: LightboxProps) {
  const [zoomed, setZoomed] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocus = useRef<Element | null>(null);

  const open = index !== null;
  const current = open ? items[index] : undefined;

  const go = useCallback(
    (direction: 1 | -1) => {
      if (index === null || items.length === 0) return;
      setZoomed(false);
      onNavigate((index + direction + items.length) % items.length);
    },
    [index, items.length, onNavigate],
  );

  useEffect(() => {
    if (!open) return;

    restoreFocus.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowRight':
          go(1);
          break;
        case 'ArrowLeft':
          go(-1);
          break;
        case ' ':
        case 'Enter':
          event.preventDefault();
          setZoomed((z) => !z);
          break;
        case 'Tab':
          // Single focusable surface — keep focus inside.
          event.preventDefault();
          panelRef.current?.focus();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      (restoreFocus.current as HTMLElement | null)?.focus?.();
    };
  }, [open, go, onClose]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (zoomed) return;
    if (info.offset.y > 140 || info.velocity.y > 700) return onClose();
    if (info.offset.x < -110) return go(1);
    if (info.offset.x > 110) return go(-1);
  };

  return (
    <AnimatePresence>
      {open && current ? (
        <motion.div
          key="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`Image ${index! + 1} of ${items.length}`}
          className="fixed inset-0 z-[120] flex flex-col bg-black/92 backdrop-blur-2xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: ease.expo }}
          ref={panelRef}
          tabIndex={-1}
        >
          {/* Chrome */}
          <div className="flex items-center justify-between px-5 py-5 md:px-10">
            <span className="font-mono text-xs uppercase tracking-[0.3em] text-white/45">
              {String(index! + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}
              {current.caption ? <span className="ml-4 normal-case tracking-normal text-white/60">{current.caption}</span> : null}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setZoomed((z) => !z)}
                aria-label={zoomed ? 'Zoom out' : 'Zoom in'}
                className="grid h-10 w-10 place-items-center rounded-full border border-white/12 text-white/70 transition hover:border-white/40 hover:text-white"
              >
                {zoomed ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close gallery"
                className="grid h-10 w-10 place-items-center rounded-full border border-white/12 text-white/70 transition hover:border-white/40 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Stage */}
          <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4 pb-4 md:px-16">
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous image"
              className="absolute left-2 z-10 hidden h-12 w-12 place-items-center rounded-full border border-white/12 text-white/70 transition hover:border-white/40 hover:text-white md:grid"
            >
              <ChevronLeft size={18} />
            </button>

            <AnimatePresence mode="wait">
              <motion.div
                key={current.id}
                className={cn(
                  'relative flex max-h-full max-w-full items-center justify-center',
                  zoomed ? 'cursor-zoom-out' : 'cursor-zoom-in',
                )}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: zoomed ? 1.65 : 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.5, ease: ease.expo }}
                drag={!zoomed}
                dragElastic={0.16}
                dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                onDragEnd={onDragEnd}
                onClick={() => setZoomed((z) => !z)}
              >
                {current.media.url ? (
                  // Full-resolution original — deliberately not routed through the
                  // optimiser so the viewer shows exactly what was uploaded.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={current.media.url}
                    alt={current.media.alt ?? current.caption ?? ''}
                    className="max-h-[74vh] w-auto max-w-full rounded-lg object-contain shadow-elevated"
                    draggable={false}
                  />
                ) : (
                  <div className="aspect-[4/5] h-[70vh] overflow-hidden rounded-lg shadow-elevated">
                    <ProceduralArt
                      seed={`${seed}-${current.id}`}
                      accent={accent}
                      secondary={secondary}
                    />
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next image"
              className="absolute right-2 z-10 hidden h-12 w-12 place-items-center rounded-full border border-white/12 text-white/70 transition hover:border-white/40 hover:text-white md:grid"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Filmstrip */}
          <div className="no-scrollbar flex gap-2 overflow-x-auto px-5 pb-6 md:justify-center md:px-10">
            {items.map((item, i) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setZoomed(false);
                  onNavigate(i);
                }}
                aria-label={`Go to image ${i + 1}`}
                aria-current={i === index}
                className={cn(
                  'relative h-14 w-20 shrink-0 overflow-hidden rounded-md border transition-all duration-500 ease-expo',
                  i === index ? 'border-white/70 opacity-100' : 'border-white/10 opacity-40 hover:opacity-80',
                )}
              >
                {item.media.thumbnailUrl || item.media.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.media.thumbnailUrl ?? item.media.url}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <ProceduralArt seed={`${seed}-${item.id}`} accent={accent} secondary={secondary} />
                )}
              </button>
            ))}
          </div>

          <p className="pb-4 text-center font-mono text-[10px] uppercase tracking-[0.24em] text-white/25">
            ← → navigate · space zoom · drag to dismiss · esc close
          </p>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
