'use client';

import { useEffect, useRef } from 'react';
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useCursor, type CursorVariant } from './CursorProvider';
import { useHasPointer, usePrefersReducedMotion } from '@/hooks/useEnvironment';
import { spring } from '@/lib/motion';

interface Shape {
  size: number;
  ringSize: number;
  ringOpacity: number;
  dotOpacity: number;
  blend: 'difference' | 'normal';
  border: number;
}

const SHAPES: Record<CursorVariant, Shape> = {
  default: { size: 6, ringSize: 34, ringOpacity: 0.45, dotOpacity: 1, blend: 'difference', border: 1 },
  link: { size: 0, ringSize: 62, ringOpacity: 0.9, dotOpacity: 0, blend: 'difference', border: 1 },
  view: { size: 0, ringSize: 104, ringOpacity: 1, dotOpacity: 0, blend: 'normal', border: 0 },
  drag: { size: 0, ringSize: 88, ringOpacity: 1, dotOpacity: 0, blend: 'normal', border: 0 },
  text: { size: 2, ringSize: 46, ringOpacity: 0.25, dotOpacity: 0.6, blend: 'difference', border: 1 },
  media: { size: 0, ringSize: 120, ringOpacity: 0.9, dotOpacity: 0, blend: 'normal', border: 0 },
  close: { size: 0, ringSize: 72, ringOpacity: 1, dotOpacity: 0, blend: 'normal', border: 0 },
  hidden: { size: 0, ringSize: 0, ringOpacity: 0, dotOpacity: 0, blend: 'difference', border: 0 },
};

/**
 * Two-part pointer: a dot that tracks instantly and a ring that trails on a
 * spring. Velocity stretches the ring along the direction of travel, so quick
 * movements read as motion rather than teleporting.
 */
export function CustomCursor() {
  const { variant, label, accent } = useCursor();
  const hasPointer = useHasPointer();
  const reduced = usePrefersReducedMotion();

  const x = useMotionValue(-200);
  const y = useMotionValue(-200);
  const ringX = useSpring(x, spring.cursor);
  const ringY = useSpring(y, spring.cursor);

  const velocity = useMotionValue(0);
  const angle = useMotionValue(0);
  const stretch = useSpring(velocity, { stiffness: 220, damping: 26 });
  const scaleX = useTransform(stretch, [0, 1400], [1, 1.45], { clamp: true });
  const scaleY = useTransform(stretch, [0, 1400], [1, 0.62], { clamp: true });

  const pressed = useRef(false);
  const last = useRef({ x: 0, y: 0, t: 0 });

  useEffect(() => {
    if (!hasPointer || reduced) return;

    document.documentElement.classList.add('has-custom-cursor');

    const onMove = (event: PointerEvent) => {
      x.set(event.clientX);
      y.set(event.clientY);

      const now = performance.now();
      const dt = Math.max(now - last.current.t, 1);
      const dx = event.clientX - last.current.x;
      const dy = event.clientY - last.current.y;
      const speed = (Math.hypot(dx, dy) / dt) * 1000;

      velocity.set(Math.min(speed, 2000));
      if (speed > 60) angle.set((Math.atan2(dy, dx) * 180) / Math.PI);

      last.current = { x: event.clientX, y: event.clientY, t: now };
    };

    const onDown = () => {
      pressed.current = true;
      document.documentElement.style.setProperty('--cursor-press', '0.82');
    };
    const onUp = () => {
      pressed.current = false;
      document.documentElement.style.setProperty('--cursor-press', '1');
    };
    const onLeave = () => {
      x.set(-200);
      y.set(-200);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);
    document.addEventListener('pointerleave', onLeave);

    return () => {
      document.documentElement.classList.remove('has-custom-cursor');
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointerleave', onLeave);
    };
  }, [hasPointer, reduced, x, y, velocity, angle]);

  if (!hasPointer || reduced) return null;

  const shape = SHAPES[variant];
  const tint = accent ?? '#ffffff';
  const filled = variant === 'view' || variant === 'drag' || variant === 'media' || variant === 'close';

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[9999] hidden md:block">
      {/* Trailing ring */}
      <motion.div
        className="absolute left-0 top-0 flex items-center justify-center rounded-full"
        style={{
          x: ringX,
          y: ringY,
          translateX: '-50%',
          translateY: '-50%',
          rotate: angle,
          scaleX,
          scaleY,
          mixBlendMode: shape.blend,
        }}
      >
        <motion.div
          className="flex items-center justify-center rounded-full"
          animate={{
            width: shape.ringSize,
            height: shape.ringSize,
            opacity: shape.ringOpacity,
            backgroundColor: filled ? tint : 'rgba(255,255,255,0)',
            borderWidth: shape.border,
          }}
          transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
          style={{ borderColor: 'rgba(255,255,255,0.75)', borderStyle: 'solid' }}
        >
          <AnimatePresence mode="wait">
            {label ? (
              <motion.span
                key={label}
                initial={{ opacity: 0, y: 6, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -6, filter: 'blur(4px)' }}
                transition={{ duration: 0.24 }}
                className="select-none whitespace-nowrap font-mono text-[10px] font-medium uppercase tracking-[0.18em]"
                style={{ color: filled ? '#050505' : '#fff', rotate: `${-angle.get()}deg` }}
              >
                {label}
              </motion.span>
            ) : null}
          </AnimatePresence>
        </motion.div>
      </motion.div>

      {/* Leading dot */}
      <motion.div
        className="absolute left-0 top-0 rounded-full bg-white"
        style={{ x, y, translateX: '-50%', translateY: '-50%', mixBlendMode: 'difference' }}
        animate={{ width: shape.size, height: shape.size, opacity: shape.dotOpacity }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      />
    </div>
  );
}
