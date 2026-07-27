'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

export type CursorVariant =
  | 'default'
  | 'link'
  | 'view'
  | 'drag'
  | 'text'
  | 'media'
  | 'close'
  | 'hidden';

export interface CursorState {
  variant: CursorVariant;
  label: string;
  /** Hex colour the ring adopts — lets each project tint the pointer. */
  accent: string | null;
}

interface CursorApi extends CursorState {
  set: (next: Partial<CursorState>) => void;
  reset: () => void;
  /** Spreadable props that drive the cursor from any interactive element. */
  bind: (variant: CursorVariant, label?: string, accent?: string) => {
    onPointerEnter: () => void;
    onPointerLeave: () => void;
    onFocus: () => void;
    onBlur: () => void;
  };
}

const DEFAULT_STATE: CursorState = { variant: 'default', label: '', accent: null };

const CursorContext = createContext<CursorApi | null>(null);

export function CursorProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CursorState>(DEFAULT_STATE);
  // Keeps rapid enter/leave pairs from fighting each other during fast sweeps.
  const depth = useRef(0);

  const set = useCallback((next: Partial<CursorState>) => {
    setState((current) => ({ ...current, ...next }));
  }, []);

  const reset = useCallback(() => {
    depth.current = Math.max(0, depth.current - 1);
    if (depth.current === 0) setState(DEFAULT_STATE);
  }, []);

  const bind = useCallback<CursorApi['bind']>(
    (variant, label = '', accent = '') => {
      const enter = () => {
        depth.current += 1;
        setState({ variant, label, accent: accent || null });
      };
      return {
        onPointerEnter: enter,
        onPointerLeave: reset,
        onFocus: enter,
        onBlur: reset,
      };
    },
    [reset],
  );

  const value = useMemo<CursorApi>(() => ({ ...state, set, reset, bind }), [state, set, reset, bind]);

  return <CursorContext.Provider value={value}>{children}</CursorContext.Provider>;
}

/**
 * Safe outside a provider (the admin surface does not render a custom cursor),
 * returning inert handlers so call sites need no conditionals.
 */
export function useCursor(): CursorApi {
  const context = useContext(CursorContext);
  const noop = useMemo<CursorApi>(
    () => ({
      ...DEFAULT_STATE,
      set: () => undefined,
      reset: () => undefined,
      bind: () => ({
        onPointerEnter: () => undefined,
        onPointerLeave: () => undefined,
        onFocus: () => undefined,
        onBlur: () => undefined,
      }),
    }),
    [],
  );
  return context ?? noop;
}
