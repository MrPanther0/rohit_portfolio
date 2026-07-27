'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAdminAuth } from '@/components/admin/AuthProvider';
import { PageHeader } from '@/components/admin/AdminShell';
import { Panel, Select, Spinner, StatTile } from '@/components/admin/ui';
import type { AnalyticsBreakdown, AnalyticsOverview, AnalyticsPoint } from '@/lib/types';
import { formatNumber } from '@/lib/utils';

const RANGES = [7, 14, 30, 90, 180, 365];

/** Sparkline-style area chart drawn as a single SVG path — no chart library. */
function TrendChart({ points }: { points: AnalyticsPoint[] }) {
  const { path, area, peak } = useMemo(() => {
    if (points.length < 2) return { path: '', area: '', peak: 0 };

    const width = 1000;
    const height = 260;
    const max = Math.max(...points.map((point) => point.views), 1);

    const coords = points.map((point, index) => {
      const x = (index / (points.length - 1)) * width;
      const y = height - (point.views / max) * (height - 20) - 10;
      return [x, y] as const;
    });

    // Catmull-Rom-ish smoothing via midpoint quadratics.
    let d = `M ${coords[0]![0]} ${coords[0]![1]}`;
    for (let i = 1; i < coords.length; i += 1) {
      const [px, py] = coords[i - 1]!;
      const [cx, cy] = coords[i]!;
      const mx = (px + cx) / 2;
      d += ` Q ${px} ${py} ${mx} ${(py + cy) / 2} T ${cx} ${cy}`;
    }

    return {
      path: d,
      area: `${d} L ${width} ${height} L 0 ${height} Z`,
      peak: max,
    };
  }, [points]);

  if (!path) {
    return <p className="py-12 text-center text-[13px] text-white/30">Not enough data yet.</p>;
  }

  return (
    <figure>
      <svg viewBox="0 0 1000 260" className="h-56 w-full" role="img" aria-label="Views over time">
        <defs>
          <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="trend-stroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#22D3EE" />
          </linearGradient>
        </defs>

        {[0.25, 0.5, 0.75].map((ratio) => (
          <line
            key={ratio}
            x1="0"
            x2="1000"
            y1={260 * ratio}
            y2={260 * ratio}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="1"
          />
        ))}

        <path d={area} fill="url(#trend-fill)" />
        <path d={path} fill="none" stroke="url(#trend-stroke)" strokeWidth="2.5" strokeLinecap="round" />
      </svg>

      <figcaption className="mt-3 flex justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-white/25">
        <span>{points[0]?.date}</span>
        <span>peak {formatNumber(peak)} views/day</span>
        <span>{points[points.length - 1]?.date}</span>
      </figcaption>
    </figure>
  );
}

function BarList({
  items,
  emptyLabel,
}: {
  items: { label: string; value: number; colour?: string }[];
  emptyLabel: string;
}) {
  const max = Math.max(...items.map((item) => item.value), 1);

  if (!items.length) return <p className="py-8 text-center text-[13px] text-white/30">{emptyLabel}</p>;

  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <li key={item.label} className="relative overflow-hidden rounded-lg">
          <span
            aria-hidden
            className="absolute inset-y-0 left-0 rounded-lg opacity-25"
            style={{
              width: `${(item.value / max) * 100}%`,
              background: item.colour ?? 'linear-gradient(90deg,#8B5CF6,#22D3EE)',
            }}
          />
          <span className="relative flex items-center justify-between gap-3 px-3 py-2">
            <span className="truncate text-[13px] text-white/80">{item.label}</span>
            <span className="shrink-0 font-mono text-[12px] tabular-nums text-white/45">
              {formatNumber(item.value)}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function AdminAnalyticsPage() {
  const { request } = useAdminAuth();
  const [days, setDays] = useState(30);

  const overview = useQuery({
    queryKey: ['admin', 'analytics', 'overview', days],
    queryFn: async () =>
      (await request<AnalyticsOverview>(`/api/admin/analytics/overview?days=${days}`)).data,
  });

  const series = useQuery({
    queryKey: ['admin', 'analytics', 'timeseries', days],
    queryFn: async () =>
      (await request<AnalyticsPoint[]>(`/api/admin/analytics/timeseries?days=${days}`)).data,
  });

  const breakdown = useQuery({
    queryKey: ['admin', 'analytics', 'breakdown', days],
    queryFn: async () =>
      (await request<AnalyticsBreakdown>(`/api/admin/analytics/breakdown?days=${days}`)).data,
  });

  return (
    <>
      <PageHeader
        title="Analytics"
        description="First-party traffic, collected without cookies or third-party trackers."
        actions={
          <Select
            value={String(days)}
            onChange={(event) => setDays(Number(event.target.value))}
            className="w-auto"
            aria-label="Date range"
          >
            {RANGES.map((range) => (
              <option key={range} value={range}>
                Last {range} days
              </option>
            ))}
          </Select>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Page views"
          value={overview.data ? formatNumber(overview.data.views) : '—'}
          delta={overview.data?.changePercent}
        />
        <StatTile
          label="Unique visitors"
          value={overview.data ? formatNumber(overview.data.visitors) : '—'}
          accent="#22D3EE"
        />
        <StatTile
          label="Enquiries"
          value={overview.data ? formatNumber(overview.data.contactRequests) : '—'}
          accent="#F472B6"
        />
        <StatTile
          label="Published projects"
          value={overview.data?.publishedProjects ?? '—'}
          accent="#34D399"
        />
      </div>

      <Panel title="Traffic" className="mt-6">
        {series.isLoading ? <Spinner /> : <TrendChart points={series.data ?? []} />}
      </Panel>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Most viewed projects">
          {breakdown.isLoading ? (
            <Spinner />
          ) : (
            <BarList
              emptyLabel="No project views recorded yet."
              items={(breakdown.data?.topProjects ?? []).map((project) => ({
                label: project.title,
                value: project.views,
                colour: project.accentColor,
              }))}
            />
          )}
        </Panel>

        <Panel title="Top pages">
          {breakdown.isLoading ? (
            <Spinner />
          ) : (
            <BarList
              emptyLabel="No page views recorded yet."
              items={(breakdown.data?.topPages ?? []).map((page) => ({
                label: page.path,
                value: page.views,
              }))}
            />
          )}
        </Panel>

        <Panel title="Referrers">
          {breakdown.isLoading ? (
            <Spinner />
          ) : (
            <BarList
              emptyLabel="No referrers recorded yet."
              items={(breakdown.data?.referrers ?? []).map((referrer) => ({
                label: referrer.source,
                value: referrer.views,
              }))}
            />
          )}
        </Panel>

        <Panel title="Devices & interactions">
          {breakdown.isLoading ? (
            <Spinner />
          ) : (
            <div className="space-y-6">
              <BarList
                emptyLabel="No device data yet."
                items={(breakdown.data?.devices ?? []).map((device) => ({
                  label: device.device,
                  value: device.views,
                }))}
              />
              <div>
                <h3 className="mb-3 font-mono text-[10px] uppercase tracking-[0.16em] text-white/30">
                  Tracked events
                </h3>
                <BarList
                  emptyLabel="No events recorded yet."
                  items={(breakdown.data?.events ?? []).map((event) => ({
                    label: event.type,
                    value: event.count,
                  }))}
                />
              </div>
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
