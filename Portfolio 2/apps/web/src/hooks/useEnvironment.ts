'use client';

import { useEffect, useState } from 'react';

/** True once the component has mounted on the client. */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const list = window.matchMedia(query);
    setMatches(list.matches);
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    list.addEventListener('change', onChange);
    return () => list.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

/** Honours the OS-level reduced-motion preference and reacts to changes. */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}

/** Fine pointer + hover — the only environment where a custom cursor makes sense. */
export function useHasPointer(): boolean {
  return useMediaQuery('(hover: hover) and (pointer: fine)');
}

export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 767px)');
}

/**
 * Coarse device-capability tier, used to scale particle counts and shader
 * resolution rather than shipping the same load to every machine.
 */
export type PerformanceTier = 'low' | 'medium' | 'high';

export function usePerformanceTier(): PerformanceTier {
  const [tier, setTier] = useState<PerformanceTier>('high');

  useEffect(() => {
    const cores = navigator.hardwareConcurrency ?? 4;
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
    const coarse = window.matchMedia('(pointer: coarse)').matches;

    if (cores <= 4 || memory <= 4) setTier('low');
    else if (cores <= 8 || coarse) setTier('medium');
    else setTier('high');
  }, []);

  return tier;
}
