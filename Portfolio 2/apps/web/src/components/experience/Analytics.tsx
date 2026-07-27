'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { API_URL } from '@/lib/api';
import { sessionId } from '@/lib/utils';

/**
 * First-party page-view beacon. Uses `sendBeacon` where available so the
 * request survives the unload that ends a visit, and never blocks navigation.
 */
export function Analytics({ projectSlug }: { projectSlug?: string }) {
  const pathname = usePathname();
  const enteredAt = useRef<number>(Date.now());
  const sent = useRef<string>('');

  useEffect(() => {
    if (sent.current === pathname) return;
    sent.current = pathname;
    enteredAt.current = Date.now();

    const payload = JSON.stringify({
      path: pathname,
      sessionId: sessionId(),
      projectSlug: projectSlug ?? null,
      referrer: document.referrer || null,
    });

    void fetch(`${API_URL}/api/analytics/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => {
      /* analytics must never surface an error to the visitor */
    });

    // Increment the project's own counter for the "most viewed" ranking.
    if (projectSlug) {
      void fetch(`${API_URL}/api/projects/${encodeURIComponent(projectSlug)}/view`, {
        method: 'POST',
        keepalive: true,
      }).catch(() => undefined);
    }
  }, [pathname, projectSlug]);

  // Report dwell time when the visitor leaves the page.
  useEffect(() => {
    const report = () => {
      const duration = Math.round((Date.now() - enteredAt.current) / 1000);
      if (duration < 2) return;

      const body = JSON.stringify({
        type: 'dwell',
        label: pathname,
        path: pathname,
        sessionId: sessionId(),
        meta: { seconds: duration },
      });

      if (navigator.sendBeacon) {
        navigator.sendBeacon(`${API_URL}/api/analytics/event`, new Blob([body], { type: 'application/json' }));
      }
    };

    window.addEventListener('pagehide', report);
    return () => {
      window.removeEventListener('pagehide', report);
      report();
    };
  }, [pathname]);

  return null;
}

/** Fire-and-forget custom event, used by outbound links and downloads. */
export function trackEvent(type: string, label?: string, meta?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  void fetch(`${API_URL}/api/analytics/event`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type,
      label: label ?? null,
      path: window.location.pathname,
      sessionId: sessionId(),
      meta: meta ?? null,
    }),
    keepalive: true,
  }).catch(() => undefined);
}
