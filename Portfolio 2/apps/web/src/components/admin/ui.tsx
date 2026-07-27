'use client';

import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Buttons ──────────────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-bone text-void hover:bg-white',
  secondary: 'bg-white/[0.06] text-bone border border-white/10 hover:bg-white/[0.1]',
  ghost: 'text-white/60 hover:text-white hover:bg-white/[0.06]',
  danger: 'bg-red-500/15 text-red-300 border border-red-500/25 hover:bg-red-500/25',
  subtle: 'bg-transparent text-white/45 hover:text-white',
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[13px] rounded-lg gap-1.5',
  md: 'h-10 px-4 text-sm rounded-xl gap-2',
  lg: 'h-12 px-6 text-sm rounded-xl gap-2',
  icon: 'h-9 w-9 rounded-lg',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', loading, icon, className, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex select-none items-center justify-center font-medium transition-all duration-300 ease-expo disabled:pointer-events-none disabled:opacity-45',
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 size={15} className="animate-spin" /> : icon}
      {children}
    </button>
  );
});

// ── Form controls ────────────────────────────────────────────────────────────

const controlStyles =
  'w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-bone outline-none transition-colors duration-300 placeholder:text-white/25 focus:border-ultraviolet/60 focus:bg-white/[0.05] disabled:opacity-50';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={cn(controlStyles, className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={cn(controlStyles, 'resize-y', className)} {...props} />;
  },
);

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(controlStyles, 'appearance-none pr-9', className)} {...props}>
      {children}
    </select>
  );
}

export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label className="text-[13px] font-medium text-white/75">
          {label}
          {required ? <span className="ml-1 text-ultraviolet">*</span> : null}
        </label>
        {hint ? <span className="text-[11px] text-white/30">{hint}</span> : null}
      </div>
      {children}
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-white/8 bg-white/[0.02] p-4 transition-colors hover:border-white/15">
      <span className="min-w-0">
        <span className="block text-[13px] font-medium text-white/85">{label}</span>
        {description ? <span className="mt-0.5 block text-xs text-white/40">{description}</span> : null}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors duration-400',
          checked ? 'bg-ultraviolet' : 'bg-white/12',
        )}
      >
        <span
          className={cn(
            'absolute top-1 h-4 w-4 rounded-full bg-white transition-transform duration-400 ease-expo',
            checked ? 'translate-x-6' : 'translate-x-1',
          )}
        />
      </button>
    </label>
  );
}

// ── Surfaces ─────────────────────────────────────────────────────────────────

export function Panel({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('rounded-2xl border border-white/8 bg-white/[0.015] p-5 md:p-6', className)}>
      {title || actions ? (
        <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title ? <h2 className="text-[15px] font-medium text-white">{title}</h2> : null}
            {description ? <p className="mt-1 text-[13px] text-white/40">{description}</p> : null}
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'accent';
  className?: string;
}) {
  const tones = {
    neutral: 'border-white/12 bg-white/[0.04] text-white/60',
    success: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
    warning: 'border-amber-500/25 bg-amber-500/10 text-amber-300',
    danger: 'border-red-500/25 bg-red-500/10 text-red-300',
    accent: 'border-ultraviolet/30 bg-ultraviolet/10 text-ultraviolet-soft',
  } as const;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em]',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 px-6 py-16 text-center">
      {icon ? <div className="mb-4 text-white/25">{icon}</div> : null}
      <h3 className="text-sm font-medium text-white/80">{title}</h3>
      {description ? <p className="mt-2 max-w-sm text-[13px] text-white/40">{description}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2.5 py-14 text-white/40" role="status">
      <Loader2 size={16} className="animate-spin" />
      <span className="text-[13px]">{label}…</span>
    </div>
  );
}

export function StatTile({
  label,
  value,
  delta,
  accent = '#8B5CF6',
}: {
  label: string;
  value: string | number;
  delta?: number;
  accent?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/8 bg-white/[0.015] p-5">
      <span
        aria-hidden
        className="absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-25 blur-2xl"
        style={{ background: accent }}
      />
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/35">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-white tabular-nums">{value}</p>
      {delta !== undefined ? (
        <p
          className={cn(
            'mt-2 font-mono text-[11px]',
            delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-red-400' : 'text-white/35',
          )}
        >
          {delta > 0 ? '▲' : delta < 0 ? '▼' : '—'} {Math.abs(delta).toFixed(1)}% vs previous period
        </p>
      ) : null}
    </div>
  );
}
