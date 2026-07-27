'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ease } from '@/lib/motion';
import { usePerformanceTier, usePrefersReducedMotion } from '@/hooks/useEnvironment';

interface Particle {
  x: number;
  y: number;
  tx: number;
  ty: number;
  vx: number;
  vy: number;
  size: number;
  hue: number;
  delay: number;
  seed: number;
}

const SESSION_KEY = 'portfolio.intro-seen';

/**
 * Cinematic entry: drifting particles converge into the designer's wordmark,
 * a waveform resolves beneath it, then the curtain lifts.
 *
 * Everything is drawn on a single 2D canvas — no textures, no WebGL context,
 * so the first paint costs nothing the hero scene will need later.
 */
export function Preloader({ name, onComplete }: { name: string; onComplete: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const pointerRef = useRef({ x: 0, y: 0, active: false });

  const reduced = usePrefersReducedMotion();
  const tier = usePerformanceTier();

  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<'idle' | 'forming' | 'resolved' | 'exiting' | 'done'>('idle');

  const finish = useCallback(() => {
    setPhase('exiting');
    window.setTimeout(() => {
      setPhase('done');
      try {
        window.sessionStorage.setItem(SESSION_KEY, '1');
      } catch {
        /* private mode — replay the intro next time, no harm done */
      }
      onComplete();
    }, 1100);
  }, [onComplete]);

  // Skip entirely for repeat visits in the same session or reduced-motion users.
  useEffect(() => {
    let seen = false;
    try {
      seen = window.sessionStorage.getItem(SESSION_KEY) === '1';
    } catch {
      seen = false;
    }
    if (seen || reduced) {
      setPhase('done');
      onComplete();
    } else {
      setPhase('forming');
    }
  }, [reduced, onComplete]);

  /** Samples the wordmark's glyph coverage to produce particle targets. */
  const sampleTargets = useCallback(
    (width: number, height: number, density: number): { x: number; y: number }[] => {
      if (width < 2 || height < 2) return [];

      const off = document.createElement('canvas');
      off.width = width;
      off.height = height;
      const ctx = off.getContext('2d', { willReadFrequently: true });
      if (!ctx) return [];

      const text = name.toUpperCase().slice(0, 12);
      const fontSize = Math.min(width / (text.length * 0.62), height * 0.36);

      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `800 ${fontSize}px "Syne", Impact, sans-serif`;
      // Canvas letterSpacing is Chromium-only; harmless where unsupported.
      (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing =
        `${-fontSize * 0.04}px`;
      ctx.fillText(text, width / 2, height / 2);

      const points: { x: number; y: number }[] = [];
      const step = density;

      try {
        const { data } = ctx.getImageData(0, 0, width, height);
        for (let y = 0; y < height; y += step) {
          for (let x = 0; x < width; x += step) {
            const alpha = data[(y * width + x) * 4 + 3] ?? 0;
            if (alpha > 140) {
              points.push({
                x: x + (Math.random() - 0.5) * step * 0.8,
                y: y + (Math.random() - 0.5) * step * 0.8,
              });
            }
          }
        }
      } catch {
        // Tainted or zero-sized canvas — fall through with no targets so the
        // intro degrades to a plain fade rather than breaking the page.
        return [];
      }

      return points;
    },
    [name],
  );

  useEffect(() => {
    if (phase !== 'forming') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, tier === 'low' ? 1 : 2);
    const width = window.innerWidth;
    const height = window.innerHeight;

    // A hidden tab or a zero-height frame has nothing to animate into.
    if (width < 2 || height < 2) {
      setPhase('resolved');
      return;
    }

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    const density = tier === 'low' ? 9 : tier === 'medium' ? 7 : 5;
    const targets = sampleTargets(width, height, density);

    particlesRef.current = targets.map((target, index) => {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.max(width, height) * (0.35 + Math.random() * 0.6);
      return {
        x: width / 2 + Math.cos(angle) * radius,
        y: height / 2 + Math.sin(angle) * radius,
        tx: target.x,
        ty: target.y,
        vx: 0,
        vy: 0,
        size: 0.7 + Math.random() * 1.5,
        hue: Math.random() > 0.72 ? 186 : 262,
        delay: (index % 40) * 0.008 + Math.random() * 0.25,
        seed: Math.random() * Math.PI * 2,
      };
    });

    const onPointer = (event: PointerEvent) => {
      pointerRef.current = { x: event.clientX, y: event.clientY, active: true };
    };
    window.addEventListener('pointermove', onPointer, { passive: true });

    startRef.current = performance.now();

    const render = (now: number) => {
      const elapsed = (now - startRef.current) / 1000;
      const particles = particlesRef.current;

      ctx.clearRect(0, 0, width, height);

      // Faint radial bloom behind the forming mark.
      const bloom = ctx.createRadialGradient(
        width / 2,
        height / 2,
        0,
        width / 2,
        height / 2,
        Math.max(width, height) * 0.5,
      );
      bloom.addColorStop(0, `rgba(139,92,246,${0.1 * Math.min(elapsed / 1.6, 1)})`);
      bloom.addColorStop(1, 'rgba(5,5,5,0)');
      ctx.fillStyle = bloom;
      ctx.fillRect(0, 0, width, height);

      let settled = 0;

      for (const particle of particles) {
        const life = Math.max(0, elapsed - particle.delay);
        const attraction = Math.min(life / 1.7, 1);
        const eased = 1 - (1 - attraction) ** 3;

        // Spring toward the glyph target.
        const dx = particle.tx - particle.x;
        const dy = particle.ty - particle.y;
        particle.vx = (particle.vx + dx * 0.0022 * (0.35 + eased)) * 0.92;
        particle.vy = (particle.vy + dy * 0.0022 * (0.35 + eased)) * 0.92;

        // Pointer repulsion once the mark has resolved.
        if (pointerRef.current.active && eased > 0.7) {
          const px = particle.x - pointerRef.current.x;
          const py = particle.y - pointerRef.current.y;
          const distanceSq = px * px + py * py;
          if (distanceSq < 14000 && distanceSq > 0.01) {
            const force = (1 - distanceSq / 14000) * 1.5;
            const distance = Math.sqrt(distanceSq);
            particle.vx += (px / distance) * force;
            particle.vy += (py / distance) * force;
          }
        }

        // Residual shimmer keeps the mark alive rather than frozen.
        particle.x += particle.vx + Math.sin(elapsed * 1.5 + particle.seed) * 0.12 * (1 - eased * 0.85);
        particle.y += particle.vy + Math.cos(elapsed * 1.3 + particle.seed) * 0.12 * (1 - eased * 0.85);

        if (Math.abs(dx) < 2 && Math.abs(dy) < 2) settled += 1;

        const alpha = Math.min(life * 1.8, 1) * (0.4 + eased * 0.6);
        ctx.fillStyle = `hsla(${particle.hue}, 92%, ${62 + eased * 18}%, ${alpha})`;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * (0.6 + eased * 0.7), 0, Math.PI * 2);
        ctx.fill();
      }

      // Waveform sweep beneath the wordmark.
      if (elapsed > 1.5) {
        const waveProgress = Math.min((elapsed - 1.5) / 1.4, 1);
        const baseline = height / 2 + Math.min(width, height) * 0.19;
        const reach = width * 0.34 * waveProgress;

        ctx.beginPath();
        for (let x = -reach; x <= reach; x += 2) {
          const distance = Math.abs(x) / Math.max(reach, 1);
          const envelope = (1 - distance) ** 1.5;
          const amplitude = 26 * envelope * (1 - waveProgress * 0.55);
          const yy =
            baseline +
            Math.sin(x * 0.045 - elapsed * 6) * amplitude +
            Math.sin(x * 0.017 + elapsed * 3.2) * amplitude * 0.5;
          if (x === -reach) ctx.moveTo(width / 2 + x, yy);
          else ctx.lineTo(width / 2 + x, yy);
        }
        const stroke = ctx.createLinearGradient(width / 2 - reach, 0, width / 2 + reach, 0);
        stroke.addColorStop(0, 'rgba(139,92,246,0)');
        stroke.addColorStop(0.5, `rgba(34,211,238,${0.55 + waveProgress * 0.35})`);
        stroke.addColorStop(1, 'rgba(139,92,246,0)');
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }

      const ratio = particles.length ? settled / particles.length : 1;
      const timeProgress = Math.min(elapsed / 3.1, 1);
      setProgress(Math.round(Math.min(ratio * 0.55 + timeProgress * 0.45, 1) * 100));

      if (elapsed > 3.2) {
        setPhase('resolved');
        return;
      }
      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('pointermove', onPointer);
    };
  }, [phase, tier, sampleTargets]);

  // Hold the resolved frame briefly, then lift the curtain.
  useEffect(() => {
    if (phase !== 'resolved') return;
    const id = window.setTimeout(finish, 620);
    return () => window.clearTimeout(id);
  }, [phase, finish]);

  if (phase === 'done' || phase === 'idle') return null;

  return (
    <AnimatePresence>
      <motion.div
        key="preloader"
        className="fixed inset-0 z-[200] overflow-hidden bg-void"
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        aria-live="polite"
        aria-label="Loading the portfolio"
      >
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

        <motion.div
          className="absolute inset-x-0 bottom-0 flex items-end justify-between px-6 pb-8 md:px-12 md:pb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: phase === 'exiting' ? 0 : 1, y: 0 }}
          transition={{ duration: 0.9, ease: ease.expo, delay: 0.8 }}
        >
          <div className="max-w-xs">
            <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-white/35">
              Portfolio — {new Date().getFullYear()}
            </p>
            <p className="mt-2 text-sm text-white/55">Assembling the exhibition…</p>
          </div>

          <div className="text-right">
            <span className="display block text-[clamp(2.5rem,9vw,7rem)] leading-none text-white/90 tabular-nums">
              {String(progress).padStart(3, '0')}
            </span>
            <div className="ml-auto mt-3 h-px w-[min(40vw,320px)] overflow-hidden bg-white/10">
              <motion.div
                className="h-full bg-gradient-to-r from-ultraviolet to-signal"
                style={{ width: `${progress}%` }}
                transition={{ ease: 'linear' }}
              />
            </div>
          </div>
        </motion.div>

        {/* Curtain — four panels lift on a stagger so the reveal has depth. */}
        {phase === 'exiting' ? (
          <div className="absolute inset-0 flex">
            {[0, 1, 2, 3].map((index) => (
              <motion.div
                key={index}
                className="h-full flex-1 bg-void"
                initial={{ y: 0 }}
                animate={{ y: '-101%' }}
                transition={{ duration: 1, ease: ease.expo, delay: index * 0.07 }}
              />
            ))}
          </div>
        ) : null}
      </motion.div>
    </AnimatePresence>
  );
}
