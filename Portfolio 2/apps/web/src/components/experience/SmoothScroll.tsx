'use client';

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/dist/ScrollTrigger';
import { usePathname } from 'next/navigation';
import { usePrefersReducedMotion } from '@/hooks/useEnvironment';

interface ScrollApi {
  lenis: Lenis | null;
  scrollTo: (target: string | number | HTMLElement, offset?: number) => void;
  /** Signed scroll velocity in px/frame — drives skew and marquee direction. */
  velocity: React.MutableRefObject<number>;
}

const ScrollContext = createContext<ScrollApi | null>(null);

export function useSmoothScroll(): ScrollApi {
  const context = useContext(ScrollContext);
  if (context) return context;
  return {
    lenis: null,
    velocity: { current: 0 },
    scrollTo: (target) => {
      if (typeof window === 'undefined') return;
      if (typeof target === 'number') window.scrollTo({ top: target, behavior: 'smooth' });
      else {
        const element = typeof target === 'string' ? document.querySelector(target) : target;
        element?.scrollIntoView({ behavior: 'smooth' });
      }
    },
  };
}

export function SmoothScroll({ children }: { children: ReactNode }) {
  const [lenis, setLenis] = useState<Lenis | null>(null);
  const velocity = useRef(0);
  const reduced = usePrefersReducedMotion();
  const pathname = usePathname();

  useEffect(() => {
    if (reduced) return;

    gsap.registerPlugin(ScrollTrigger);

    const instance = new Lenis({
      duration: 1.15,
      // Exponential ease-out: fast pickup, long glide, no rubber band.
      easing: (t: number) => Math.min(1, 1.001 - 2 ** (-10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.6,
      infinite: false,
    });

    instance.on('scroll', (event: { velocity: number }) => {
      velocity.current = event.velocity;
      ScrollTrigger.update();
    });

    // Drive Lenis from GSAP's ticker so both share one RAF loop.
    const tick = (time: number) => instance.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    ScrollTrigger.scrollerProxy(document.body, {
      scrollTop(value) {
        if (typeof value === 'number') instance.scrollTo(value, { immediate: true });
        return instance.scroll;
      },
    });

    setLenis(instance);

    return () => {
      gsap.ticker.remove(tick);
      instance.destroy();
      setLenis(null);
    };
  }, [reduced]);

  // Reset scroll position and recalculate triggers on navigation.
  useEffect(() => {
    lenis?.scrollTo(0, { immediate: true });
    const id = window.setTimeout(() => ScrollTrigger.refresh(), 120);
    return () => window.clearTimeout(id);
  }, [pathname, lenis]);

  const api: ScrollApi = {
    lenis,
    velocity,
    scrollTo: (target, offset = 0) => {
      if (lenis) {
        lenis.scrollTo(target as never, { offset, duration: 1.4 });
        return;
      }
      const element = typeof target === 'string' ? document.querySelector(target) : target;
      if (typeof target === 'number') window.scrollTo({ top: target + offset, behavior: 'smooth' });
      else if (element instanceof HTMLElement) {
        window.scrollTo({ top: element.offsetTop + offset, behavior: 'smooth' });
      }
    },
  };

  return <ScrollContext.Provider value={api}>{children}</ScrollContext.Provider>;
}
