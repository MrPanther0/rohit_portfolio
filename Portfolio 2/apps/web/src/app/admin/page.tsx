'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, Boxes, Image as ImageIcon, Mail, Plus, Users } from 'lucide-react';
import { useAdminAuth } from '@/components/admin/AuthProvider';
import { PageHeader } from '@/components/admin/AdminShell';
import { Badge, Button, EmptyState, Panel, Spinner, StatTile } from '@/components/admin/ui';
import type { AnalyticsOverview, ContactRequest, Project } from '@/lib/types';
import { formatDate } from '@/lib/utils';

interface Overview {
  projects: {
    total: number;
    published: number;
    draft: number;
    archived: number;
    featured: number;
    totalViews: number;
  };
  media: number;
  contacts: { total: number; unread: number };
  testimonials: number;
  clients: number;
  users: number;
}

export default function AdminDashboardPage() {
  const { request, user } = useAdminAuth();

  const overview = useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: async () => (await request<Overview>('/api/admin/overview')).data,
  });

  const analytics = useQuery({
    queryKey: ['admin', 'analytics', 'overview', 30],
    queryFn: async () => (await request<AnalyticsOverview>('/api/admin/analytics/overview?days=30')).data,
  });

  const recentProjects = useQuery({
    queryKey: ['admin', 'projects', 'recent'],
    queryFn: async () =>
      (await request<Project[]>('/api/admin/projects?perPage=5&sort=recent&status=ALL')).data,
  });

  const messages = useQuery({
    queryKey: ['admin', 'messages', 'recent'],
    queryFn: async () => (await request<ContactRequest[]>('/api/admin/contact?perPage=5')).data,
  });

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <>
      <PageHeader
        title={`${greeting}, ${user?.name.split(' ')[0] ?? 'there'}`}
        description="Everything that changed since you were last here."
        actions={
          <Link href="/admin/projects/new">
            <Button variant="primary" icon={<Plus size={15} />}>
              New project
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Views · 30 days"
          value={analytics.data ? analytics.data.views.toLocaleString() : '—'}
          delta={analytics.data?.changePercent}
        />
        <StatTile
          label="Unique visitors"
          value={analytics.data ? analytics.data.visitors.toLocaleString() : '—'}
          accent="#22D3EE"
        />
        <StatTile
          label="Published projects"
          value={overview.data?.projects.published ?? '—'}
          accent="#34D399"
        />
        <StatTile label="Unread messages" value={overview.data?.contacts.unread ?? '—'} accent="#F472B6" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Panel
          title="Recent projects"
          actions={
            <Link
              href="/admin/projects"
              className="inline-flex items-center gap-1 text-[13px] text-white/45 transition-colors hover:text-white"
            >
              All projects <ArrowUpRight size={13} />
            </Link>
          }
        >
          {recentProjects.isLoading ? (
            <Spinner />
          ) : recentProjects.data?.length ? (
            <ul className="divide-y divide-white/6">
              {recentProjects.data.map((project) => (
                <li key={project.id}>
                  <Link
                    href={`/admin/projects/${project.id}`}
                    className="group flex items-center gap-4 py-3.5 transition-colors hover:bg-white/[0.02]"
                  >
                    <span
                      className="h-10 w-10 shrink-0 rounded-lg border border-white/8"
                      style={{
                        background: `linear-gradient(135deg, ${project.accentColor}, ${project.secondaryColor})`,
                      }}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-white">
                        {project.title}
                      </span>
                      <span className="block truncate text-xs text-white/35">
                        {project.category?.name ?? 'Uncategorised'} · updated {formatDate(project.updatedAt)}
                      </span>
                    </span>
                    <Badge
                      tone={
                        project.status === 'PUBLISHED'
                          ? 'success'
                          : project.status === 'DRAFT'
                            ? 'warning'
                            : 'neutral'
                      }
                    >
                      {project.status}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={<Boxes size={28} />}
              title="No projects yet"
              description="Create your first case study to populate the site."
              action={
                <Link href="/admin/projects/new">
                  <Button variant="primary" icon={<Plus size={15} />}>
                    New project
                  </Button>
                </Link>
              }
            />
          )}
        </Panel>

        <div className="space-y-6">
          <Panel
            title="Latest enquiries"
            actions={
              <Link
                href="/admin/messages"
                className="inline-flex items-center gap-1 text-[13px] text-white/45 transition-colors hover:text-white"
              >
                Inbox <ArrowUpRight size={13} />
              </Link>
            }
          >
            {messages.isLoading ? (
              <Spinner />
            ) : messages.data?.length ? (
              <ul className="space-y-3">
                {messages.data.map((message) => (
                  <li key={message.id}>
                    <Link
                      href="/admin/messages"
                      className="block rounded-xl border border-white/6 p-3.5 transition-colors hover:border-white/15"
                    >
                      <span className="flex items-center justify-between gap-3">
                        <span className="truncate text-[13px] font-medium text-white">{message.name}</span>
                        {message.status === 'NEW' ? <Badge tone="accent">new</Badge> : null}
                      </span>
                      <span className="mt-1 block truncate text-xs text-white/35">{message.email}</span>
                      <span className="mt-2 block line-clamp-2 text-[13px] text-white/50">
                        {message.message}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={<Mail size={26} />} title="Inbox is empty" />
            )}
          </Panel>

          <Panel title="Library">
            <dl className="grid grid-cols-3 gap-3">
              {[
                { label: 'Assets', value: overview.data?.media, icon: ImageIcon },
                { label: 'Clients', value: overview.data?.clients, icon: Users },
                { label: 'Quotes', value: overview.data?.testimonials, icon: Mail },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-white/6 p-3.5 text-center">
                  <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/30">
                    {item.label}
                  </dt>
                  <dd className="mt-1.5 text-xl font-semibold text-white tabular-nums">
                    {item.value ?? '—'}
                  </dd>
                </div>
              ))}
            </dl>
          </Panel>
        </div>
      </div>
    </>
  );
}
