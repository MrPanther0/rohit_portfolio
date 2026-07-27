import type { Bootstrap, PageMeta, Project, ProjectNeighbour } from './types';

/** Server components talk to the API over the internal network; the browser uses the public URL. */
export const API_URL =
  (typeof window === 'undefined'
    ? (process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL)
    : process.env.NEXT_PUBLIC_API_URL) ?? 'http://localhost:4000';

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code = 'request_failed',
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface Envelope<T> {
  success: boolean;
  data: T;
  meta?: PageMeta;
  error?: { code: string; message: string; details?: unknown };
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** ISR window in seconds for server-side calls. `0` disables caching. */
  revalidate?: number;
  token?: string | null;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<{ data: T; meta?: PageMeta }> {
  const { body, revalidate, token, headers, ...rest } = options;

  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  const response = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    ...(body !== undefined ? { body: isFormData ? (body as FormData) : JSON.stringify(body) } : {}),
    ...(typeof window === 'undefined' && revalidate !== undefined
      ? { next: { revalidate } }
      : revalidate === 0
        ? { cache: 'no-store' as RequestCache }
        : {}),
    credentials: 'include',
  });

  if (response.status === 204) return { data: undefined as T };

  let payload: Envelope<T>;
  try {
    payload = (await response.json()) as Envelope<T>;
  } catch {
    throw new ApiError(`Unexpected response from ${path}`, response.status);
  }

  if (!response.ok || payload.success === false) {
    throw new ApiError(
      payload.error?.message ?? `Request failed (${response.status})`,
      response.status,
      payload.error?.code,
      payload.error?.details,
    );
  }

  return { data: payload.data, meta: payload.meta };
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: 'DELETE' }),
};

// ── Server-side content loaders ──────────────────────────────────────────────

const REVALIDATE = 300;

/**
 * Fetches everything the landing page needs in a single round-trip.
 * Returns `null` when the API is unreachable so the caller can fall back to
 * bundled content rather than rendering an error page.
 */
export async function fetchBootstrap(): Promise<Bootstrap | null> {
  try {
    const { data } = await api.get<Bootstrap>('/api/bootstrap', { revalidate: REVALIDATE });
    return data;
  } catch {
    return null;
  }
}

export async function fetchProject(slug: string): Promise<Project | null> {
  try {
    const { data } = await api.get<Project>(`/api/projects/${encodeURIComponent(slug)}`, {
      revalidate: REVALIDATE,
    });
    return data;
  } catch {
    return null;
  }
}

export async function fetchNeighbours(
  slug: string,
): Promise<{ previous: ProjectNeighbour | null; next: ProjectNeighbour | null }> {
  try {
    const { data } = await api.get<{ previous: ProjectNeighbour | null; next: ProjectNeighbour | null }>(
      `/api/projects/${encodeURIComponent(slug)}/neighbours`,
      { revalidate: REVALIDATE },
    );
    return data;
  } catch {
    return { previous: null, next: null };
  }
}

export async function fetchSitemapEntries(): Promise<{ slug: string; updatedAt: string }[]> {
  try {
    const { data } = await api.get<{ projects: { slug: string; updatedAt: string }[] }>(
      '/api/seo/sitemap',
      { revalidate: 3600 },
    );
    return data.projects;
  } catch {
    return [];
  }
}
