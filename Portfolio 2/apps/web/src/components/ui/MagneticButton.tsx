'use client';

import Link from 'next/link';
import { forwardRef, useCallback, useRef, type ReactNode } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { cn } from '@/lib/utils';
import { spring } from '@/lib/motion';
import { useCursor } from '@/components/experience/CursorProvider';
import { usePrefersReducedMotion } from '@/hooks/useEnvironment';

type Variant = 'primary' | 'ghost' | 'outline' | 'bare';
type Size = 'sm' | 'md' | 'lg';

interface BaseProps {
  children: ReactNode;
  className?: string;
  variant?: Variant;
  size?: Size;
  /** How far the element is allowed to travel toward the pointer, in px. */
  strength?: number;
  cursorLabel?: string;
  icon?: ReactNode;
}

interface ButtonProps extends BaseProps {
  href?: undefined;
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
  ariaLabel?: string;
}

interface AnchorProps extends BaseProps {
  href: string;
  external?: boolean;
  onClick?: () => void;
  ariaLabel?: string;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-bone text-void hover:bg-white shadow-[0_18px_60px_-25px_rgba(255,255,255,0.55)] border border-transparent',
  ghost: 'bg-white/[0.04] text-bone border border-white/10 hover:bg-white/[0.08]',
  outline: 'bg-transparent text-bone border border-white/25 hover:border-white/50',
  bare: 'bg-transparent text-bone border border-transparent',
};

const SIZES: Record<Size, string> = {
  sm: 'h-10 px-5 text-[13px]',
  md: 'h-12 px-7 text-sm',
  lg: 'h-14 px-9 text-[15px]',
};

/**
 * Physical hover: the control tracks the pointer within its own bounds and
 * springs back on exit. The label tracks at a lower gain so the button reads as
 * having mass rather than sliding as one flat block.
 */
function useMagnetic(strength: number, disabled: boolean) {
  const ref = useRef<HTMLElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springX = useSpring(x, spring.magnetic);
  const springY = useSpring(y, spring.magnetic);
  const labelX = useTransform(springX, (value) => value * 0.35);
  const labelY = useTransform(springY, (value) => value * 0.35);

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (disabled) return;
      const element = ref.current;
      if (!element) return;
      const bounds = element.getBoundingClientRect();
      const offsetX = event.clientX - (bounds.left + bounds.width / 2);
      const offsetY = event.clientY - (bounds.top + bounds.height / 2);
      x.set((offsetX / (bounds.width / 2)) * strength);
      y.set((offsetY / (bounds.height / 2)) * strength);
    },
    [disabled, strength, x, y],
  );

  const reset = useCallback(() => {
    x.set(0);
    y.set(0);
  }, [x, y]);

  return { ref, springX, springY, labelX, labelY, onPointerMove, reset };
}

const shell =
  'group relative inline-flex select-none items-center justify-center gap-2.5 overflow-hidden rounded-full font-medium tracking-tight transition-colors duration-500 ease-expo disabled:pointer-events-none disabled:opacity-40';

export const MagneticButton = forwardRef<HTMLElement, ButtonProps | AnchorProps>(
  function MagneticButton(props, _forwardedRef) {
    const {
      children,
      className,
      variant = 'primary',
      size = 'md',
      strength = 14,
      cursorLabel,
      icon,
      ariaLabel,
    } = props;

    const reduced = usePrefersReducedMotion();
    const cursor = useCursor();
    const disabled = 'disabled' in props ? Boolean(props.disabled) : false;
    const magnetic = useMagnetic(reduced ? 0 : strength, disabled);

    const bind = cursor.bind(cursorLabel ? 'view' : 'link', cursorLabel ?? '');

    const inner = (
      <>
        {/* Sheen sweep on hover */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 -translate-x-full bg-sheen transition-transform duration-900 ease-expo group-hover:translate-x-full"
        />
        <motion.span
          style={{ x: magnetic.labelX, y: magnetic.labelY }}
          className="relative z-10 inline-flex items-center gap-2.5"
        >
          {children}
          {icon ? <span className="transition-transform duration-500 ease-expo group-hover:translate-x-1">{icon}</span> : null}
        </motion.span>
      </>
    );

    const style = { x: magnetic.springX, y: magnetic.springY };
    const classes = cn(shell, VARIANTS[variant], SIZES[size], className);

    if ('href' in props && props.href) {
      const external = props.external ?? /^https?:\/\//.test(props.href);
      const MotionLink = motion(Link);

      if (external) {
        return (
          <motion.a
            ref={magnetic.ref as React.Ref<HTMLAnchorElement>}
            href={props.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={ariaLabel}
            className={classes}
            style={style}
            onPointerMove={magnetic.onPointerMove}
            onPointerLeave={(event) => {
              magnetic.reset();
              bind.onPointerLeave();
              void event;
            }}
            onPointerEnter={bind.onPointerEnter}
            onFocus={bind.onFocus}
            onBlur={bind.onBlur}
            onClick={props.onClick}
          >
            {inner}
          </motion.a>
        );
      }

      return (
        <MotionLink
          ref={magnetic.ref as React.Ref<HTMLAnchorElement>}
          href={props.href}
          aria-label={ariaLabel}
          className={classes}
          style={style}
          onPointerMove={magnetic.onPointerMove}
          onPointerLeave={() => {
            magnetic.reset();
            bind.onPointerLeave();
          }}
          onPointerEnter={bind.onPointerEnter}
          onFocus={bind.onFocus}
          onBlur={bind.onBlur}
          onClick={props.onClick}
        >
          {inner}
        </MotionLink>
      );
    }

    const buttonProps = props as ButtonProps;

    return (
      <motion.button
        ref={magnetic.ref as React.Ref<HTMLButtonElement>}
        type={buttonProps.type ?? 'button'}
        disabled={disabled}
        aria-label={ariaLabel}
        className={classes}
        style={style}
        onPointerMove={magnetic.onPointerMove}
        onPointerLeave={() => {
          magnetic.reset();
          bind.onPointerLeave();
        }}
        onPointerEnter={bind.onPointerEnter}
        onFocus={bind.onFocus}
        onBlur={bind.onBlur}
        onClick={buttonProps.onClick}
      >
        {inner}
      </motion.button>
    );
  },
);
