'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowDown,
  ArrowUp,
  Copy,
  ExternalLink,
  Eye,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
} from 'lucide-react';
import { useAdminAuth } from '@/components/admin/AuthProvider';
import { PageHeader } from '@/components/admin/AdminShell';
import { Button, EmptyState, Input, Select, Spinner } from '@/components/admin/ui';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import type { PageMeta, Project, ProjectStatus } from '@/lib/types';
import { cn, formatDate, formatNumber } from '@/lib/utils';

type StatusFilter = ProjectStatus | 'ALL';

export default function AdminProjectsPage() {
  const { request, can } = useAdminAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [page, setPage] = useState(1);
  const [pendingDelete, setPendingDelete] = useState<Project | null>(null);

  const query = useQuery({
    queryKey: ['admin', 'projects', { search, status, page }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        perPage: '20',
        status,
        sort: 'order',
        ...(search ? { search } : {}),
      });
      const response = await request<Project[]>(`/api/admin/projects?${params}`);
      return { items: response.data, meta: response.meta as PageMeta };
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'projects'] });

  const setStatusMutation = useMutation({
    mutationFn: async ({ id, next }: { id: string; next: ProjectStatus }) =>
      request(`/api/admin/projects/${id}/status`, { method: 'POST', body: { status: next } }),
    onSuccess: () => {
      toast.success('Status updated');
      void invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const featureMutation = useMutation({
    mutationFn: async ({ id, featured }: { id: string; featured: boolean }) =>
      request(`/api/admin/projects/${id}`, { method: 'PATCH', body: { featured } }),
    onSuccess: () => void invalidate(),
    onError: (error: Error) => toast.error(error.message),
  });

  const duplicateMutation = useMutation({
    mutationFn: async (id: string) => request(`/api/admin/projects/${id}/duplicate`, { method: 'POST' }),
    onSuccess: () => {
      toast.success('Project duplicated as a draft');
      void invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => request(`/api/admin/projects/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Project deleted');
      setPendingDelete(null);
      void invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const reorderMutation = useMutation({
    mutationFn: async (items: { id: string; order: number }[]) =>
      request('/api/admin/projects/reorder', { method: 'PATCH', body: { items } }),
    onSuccess: () => void invalidate(),
    onError: (error: Error) => toast.error(error.message),
  });

  /** Swaps a project with its neighbour and persists both new positions. */
  const move = (index: number, direction: -1 | 1) => {
    const items = query.data?.items;
    if (!items) return;
    const target = index + direction;
    if (target < 0 || target >= items.length) return;

    const a = items[index]!;
    const b = items[target]!;
    reorderMutation.mutate([
      { id: a.id, order: b.order },
      { id: b.id, order: a.order },
    ]);
  };

  const items = query.data?.items ?? [];
  const meta = query.data?.meta;

  return (
    <>
      <PageHeader
        title="Projects"
        description="Case studies shown on the site. Drag order controls the sequence in the work gallery."
        actions={
          can('EDITOR') ? (
            <Link href="/admin/projects/new">
              <Button variant="primary" icon={<Plus size={15} />}>
                New project
              </Button>
            </Link>
          ) : null
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25" />
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search by title, client or subtitle…"
            className="pl-10"
            aria-label="Search projects"
          />
        </div>

        <Select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as StatusFilter);
            setPage(1);
          }}
          className="w-auto min-w-[150px]"
          aria-label="Filter by status"
        >
          <option value="ALL">All statuses</option>
          <option value="PUBLISHED">Published</option>
          <option value="DRAFT">Draft</option>
          <option value="ARCHIVED">Archived</option>
        </Select>
      </div>

      {query.isLoading ? (
        <Spinner label="Loading projects" />
      ) : items.length === 0 ? (
        <EmptyState
          title={search || status !== 'ALL' ? 'No projects match those filters' : 'No projects yet'}
          description={
            search || status !== 'ALL'
              ? 'Try clearing the search or switching the status filter.'
              : 'Create your first case study — it will appear on the site as soon as you publish it.'
          }
          action={
            can('EDITOR') ? (
              <Link href="/admin/projects/new">
                <Button variant="primary" icon={<Plus size={15} />}>
                  New project
                </Button>
              </Link>
            ) : null
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/8">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-white/8 bg-white/[0.02]">
                {['', 'Project', 'Category', 'Status', 'Views', 'Updated', ''].map((heading, index) => (
                  <th
                    key={index}
                    scope="col"
                    className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-white/30"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/6">
              {items.map((project, index) => (
                <tr key={project.id} className="group transition-colors hover:bg-white/[0.02]">
                  <td className="w-12 px-2 py-3">
                    <div className="flex flex-col items-center">
                      <button
                        type="button"
                        onClick={() => move(index, -1)}
                        disabled={index === 0 || !can('EDITOR')}
                        aria-label={`Move ${project.title} up`}
                        className="text-white/25 transition-colors hover:text-white disabled:opacity-20"
                      >
                        <ArrowUp size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => move(index, 1)}
                        disabled={index === items.length - 1 || !can('EDITOR')}
                        aria-label={`Move ${project.title} down`}
                        className="text-white/25 transition-colors hover:text-white disabled:opacity-20"
                      >
                        <ArrowDown size={13} />
                      </button>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span
                        className="h-9 w-9 shrink-0 rounded-lg border border-white/8"
                        style={{
                          background: `linear-gradient(135deg, ${project.accentColor}, ${project.secondaryColor})`,
                        }}
                        aria-hidden
                      />
                      <div className="min-w-0">
                        <Link
                          href={`/admin/projects/${project.id}`}
                          className="flex items-center gap-1.5 truncate text-[13px] font-medium text-white hover:text-ultraviolet-soft"
                        >
                          {project.title}
                          {project.featured ? (
                            <Star size={12} className="shrink-0 fill-amber-400 text-amber-400" />
                          ) : null}
                        </Link>
                        <span className="block truncate text-xs text-white/30">/{project.slug}</span>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    {project.category ? (
                      <span
                        className="text-[13px]"
                        style={{ color: project.category.color }}
                      >
                        {project.category.name}
                      </span>
                    ) : (
                      <span className="text-[13px] text-white/25">—</span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <Select
                      value={project.status}
                      disabled={!can('EDITOR')}
                      onChange={(event) =>
                        setStatusMutation.mutate({
                          id: project.id,
                          next: event.target.value as ProjectStatus,
                        })
                      }
                      className={cn(
                        'h-8 w-auto min-w-[124px] py-0 text-xs',
                        project.status === 'PUBLISHED' && 'text-emerald-300',
                        project.status === 'DRAFT' && 'text-amber-300',
                      )}
                      aria-label={`Status for ${project.title}`}
                    >
                      <option value="DRAFT">Draft</option>
                      <option value="PUBLISHED">Published</option>
                      <option value="ARCHIVED">Archived</option>
                    </Select>
                  </td>

                  <td className="px-4 py-3 text-[13px] tabular-nums text-white/50">
                    {formatNumber(project.views)}
                  </td>

                  <td className="whitespace-nowrap px-4 py-3 text-[13px] text-white/40">
                    {formatDate(project.updatedAt)}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-0.5 opacity-60 transition-opacity group-hover:opacity-100">
                      {project.status === 'PUBLISHED' ? (
                        <Link
                          href={`/work/${project.slug}`}
                          target="_blank"
                          aria-label={`Preview ${project.title}`}
                          className="grid h-8 w-8 place-items-center rounded-lg text-white/45 transition-colors hover:bg-white/[0.06] hover:text-white"
                        >
                          <ExternalLink size={14} />
                        </Link>
                      ) : null}

                      {can('EDITOR') ? (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              featureMutation.mutate({ id: project.id, featured: !project.featured })
                            }
                            aria-label={project.featured ? 'Remove from featured' : 'Mark as featured'}
                            className={cn(
                              'grid h-8 w-8 place-items-center rounded-lg transition-colors hover:bg-white/[0.06]',
                              project.featured ? 'text-amber-400' : 'text-white/45 hover:text-white',
                            )}
                          >
                            <Star size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => duplicateMutation.mutate(project.id)}
                            aria-label={`Duplicate ${project.title}`}
                            className="grid h-8 w-8 place-items-center rounded-lg text-white/45 transition-colors hover:bg-white/[0.06] hover:text-white"
                          >
                            <Copy size={14} />
                          </button>
                          <Link
                            href={`/admin/projects/${project.id}`}
                            aria-label={`Edit ${project.title}`}
                            className="grid h-8 w-8 place-items-center rounded-lg text-white/45 transition-colors hover:bg-white/[0.06] hover:text-white"
                          >
                            <Pencil size={14} />
                          </Link>
                        </>
                      ) : (
                        <Link
                          href={`/admin/projects/${project.id}`}
                          aria-label={`View ${project.title}`}
                          className="grid h-8 w-8 place-items-center rounded-lg text-white/45 transition-colors hover:bg-white/[0.06] hover:text-white"
                        >
                          <Eye size={14} />
                        </Link>
                      )}

                      {can('ADMIN') ? (
                        <button
                          type="button"
                          onClick={() => setPendingDelete(project)}
                          aria-label={`Delete ${project.title}`}
                          className="grid h-8 w-8 place-items-center rounded-lg text-white/45 transition-colors hover:bg-red-500/15 hover:text-red-400"
                        >
                          <Trash2 size={14} />
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {meta && meta.pageCount > 1 ? (
        <nav className="mt-5 flex items-center justify-between" aria-label="Pagination">
          <p className="text-[13px] text-white/35">
            Page {meta.page} of {meta.pageCount} · {meta.total} projects
          </p>
          <div className="flex gap-2">
            <Button size="sm" disabled={!meta.hasPrev} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button size="sm" disabled={!meta.hasNext} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </nav>
      ) : null}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={`Delete “${pendingDelete?.title}”?`}
        description="This removes the project, its gallery links and its analytics association. Uploaded media stays in the library. This cannot be undone."
        confirmLabel="Delete project"
        destructive
        loading={deleteMutation.isPending}
        onConfirm={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
