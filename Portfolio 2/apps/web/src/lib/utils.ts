import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function mapRange(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  if (inMax - inMin === 0) return outMin;
  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
}

/** Formats an integer with locale grouping, guarding against SSR/CSR drift. */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

export function formatDate(value: string | Date | null | undefined, withTime = false): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(date);
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** #8B5CF6 → "139 92 246", ready for `rgb(var(--token) / <alpha>)`. */
export function hexToRgbChannels(hex: string): string {
  const normalised = hex.replace('#', '');
  const full =
    normalised.length === 3
      ? normalised
          .split('')
          .map((c) => c + c)
          .join('')
      : normalised;
  const int = Number.parseInt(full, 16);
  if (Number.isNaN(int)) return '139 92 246';
  return `${(int >> 16) & 255} ${(int >> 8) & 255} ${int & 255}`;
}

export function withAlpha(hex: string, alpha: number): string {
  return `rgb(${hexToRgbChannels(hex).split(' ').join(', ')} / ${alpha})`;
}

/** Stable per-visit identifier used to count unique visitors without cookies. */
export function sessionId(): string {
  if (typeof window === 'undefined') return 'server';
  const KEY = 'portfolio.sid';
  let id = window.sessionStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID().replace(/-/g, '').slice(0, 32);
    window.sessionStorage.setItem(KEY, id);
  }
  return id;
}

export function debounce<T extends (...args: never[]) => void>(fn: T, wait = 200) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
