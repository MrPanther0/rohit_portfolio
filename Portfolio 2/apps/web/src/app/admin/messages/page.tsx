'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Mail, Reply, Search, Trash2 } from 'lucide-react';
import { useAdminAuth } from '@/components/admin/AuthProvider';
import { PageHeader } from '@/components/admin/AdminShell';
import { Badge, Button, EmptyState, Input, Select, Spinner, Textarea } from '@/components/admin/ui';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import type { ContactRequest, ContactStatus, PageMeta } from '@/lib/types';
import { cn, formatDate } from '@/lib/utils';

const STATUSES: (ContactStatus | 'ALL')[] = ['ALL', 'NEW', 'READ', 'REPLIED', 'ARCHIVED', 'SPAM'];

const TONE: Record<ContactStatus, 'accent' | 'neutral' | 'success' | 'warning' | 'danger'> = {
  NEW: 'accent',
  READ: 'neutral',
  REPLIED: 'success',
  ARCHIVED: 'neutral',
  SPAM: 'danger',
};

export default function AdminMessagesPage() {
  const { request, can } = useAdminAuth();
  const queryClient = useQueryClient();

  const [status, setStatus] = useState<ContactStatus | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [pendingDelete, setPendingDelete] = useState<ContactRequest | null>(null);

  const query = useQuery({
    queryKey: ['admin', 'contact', { status, search, page }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        perPage: '25',
        status,
        ...(search ? { search } : {}),
      });
      const response = await request<ContactRequest[]>(`/api/admin/contact?${params}`);
      return { items: response.data, meta: response.meta as PageMeta };
    },
  });

  const items = query.data?.items ?? [];
  const meta = query.data?.meta;
  const selected = items.find((item) => item.id === selectedId) ?? null;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'contact'] });

  const updateMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<ContactRequest> }) =>
      request(`/api/admin/contact/${id}`, { method: 'PATCH', body: patch }),
    onSuccess: () => void invalidate(),
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => request(`/api/admin/contact/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Message deleted');
      setPendingDelete(null);
      setSelectedId(null);
      void invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Opening a NEW message marks it as read.
  useEffect(() => {
    if (selected && selected.status === 'NEW' && can('EDITOR')) {
      updateMutation.mutate({ id: selected.id, patch: { status: 'READ' } });
    }
    setNotes(selected?.notes ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  return (
    <>
      <PageHeader
        title="Messages"
        description={
          meta?.unread ? `${meta.unread} unread enquir${meta.unread === 1 ? 'y' : 'ies'}.` : 'Enquiries from the contact form.'
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
            placeholder="Search name, email or message…"
            className="pl-10"
            aria-label="Search messages"
          />
        </div>
        <Select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as ContactStatus | 'ALL');
            setPage(1);
          }}
          className="w-auto min-w-[150px]"
          aria-label="Filter by status"
        >
          {STATUSES.map((option) => (
            <option key={option} value={option}>
              {option === 'ALL' ? 'All messages' : option}
            </option>
          ))}
        </Select>
      </div>

      {query.isLoading ? (
        <Spinner label="Loading inbox" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Mail size={30} />}
          title="No messages"
          description="Enquiries submitted through the contact form land here."
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,360px)_1fr]">
          <ul className="space-y-2 lg:max-h-[70vh] lg:overflow-y-auto lg:pr-1">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={cn(
                    'w-full rounded-xl border p-3.5 text-left transition-colors',
                    selectedId === item.id
                      ? 'border-ultraviolet/50 bg-ultraviolet/[0.07]'
                      : 'border-white/8 bg-white/[0.015] hover:border-white/20',
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-[13px] font-medium text-white">{item.name}</span>
                    <Badge tone={TONE[item.status]}>{item.status}</Badge>
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-white/35">{item.email}</span>
                  <span className="mt-2 block line-clamp-2 text-[13px] text-white/50">{item.message}</span>
                  <span className="mt-2 block font-mono text-[10px] uppercase tracking-[0.14em] text-white/25">
                    {formatDate(item.createdAt, true)}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <div className="rounded-2xl border border-white/8 bg-white/[0.015] p-5 md:p-6">
            {selected ? (
              <>
                <header className="flex flex-wrap items-start justify-between gap-3 border-b border-white/8 pb-5">
                  <div>
                    <h2 className="text-base font-medium text-white">
                      {selected.subject || 'Project enquiry'}
                    </h2>
                    <p className="mt-1 text-[13px] text-white/45">
                      {selected.name} · {selected.email}
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-white/25">
                      {formatDate(selected.createdAt, true)}
                      {selected.budget ? ` · budget ${selected.budget}` : ''}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={`mailto:${selected.email}?subject=${encodeURIComponent(`Re: ${selected.subject || 'Your enquiry'}`)}`}
                      onClick={() =>
                        can('EDITOR') &&
                        updateMutation.mutate({ id: selected.id, patch: { status: 'REPLIED' } })
                      }
                    >
                      <Button variant="primary" size="sm" icon={<Reply size={14} />}>
                        Reply
                      </Button>
                    </a>

                    {can('EDITOR') ? (
                      <Select
                        value={selected.status}
                        onChange={(event) =>
                          updateMutation.mutate({
                            id: selected.id,
                            patch: { status: event.target.value as ContactStatus },
                          })
                        }
                        className="h-8 w-auto py-0 text-xs"
                        aria-label="Message status"
                      >
                        {STATUSES.filter((option) => option !== 'ALL').map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </Select>
                    ) : null}

                    {can('ADMIN') ? (
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Delete message"
                        icon={<Trash2 size={14} />}
                        onClick={() => setPendingDelete(selected)}
                      />
                    ) : null}
                  </div>
                </header>

                <p className="whitespace-pre-wrap py-6 text-[14px] leading-relaxed text-white/75">
                  {selected.message}
                </p>

                {can('EDITOR') ? (
                  <div className="border-t border-white/8 pt-5">
                    <label className="mb-2 block text-[13px] font-medium text-white/70">
                      Private notes
                    </label>
                    <Textarea
                      rows={3}
                      value={notes}
                      placeholder="Context, follow-up dates, anything worth remembering."
                      onChange={(event) => setNotes(event.target.value)}
                      onBlur={() =>
                        notes !== (selected.notes ?? '') &&
                        updateMutation.mutate({ id: selected.id, patch: { notes } })
                      }
                    />
                    <p className="mt-2 text-[11px] text-white/25">Saved when you click away.</p>
                  </div>
                ) : null}
              </>
            ) : (
              <EmptyState title="Select a message" description="Choose an enquiry from the list to read it." />
            )}
          </div>
        </div>
      )}

      {meta && meta.pageCount > 1 ? (
        <nav className="mt-5 flex items-center justify-between" aria-label="Pagination">
          <p className="text-[13px] text-white/35">
            Page {meta.page} of {meta.pageCount} · {meta.total} messages
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
        title="Delete this message?"
        description="The enquiry is removed permanently."
        confirmLabel="Delete"
        destructive
        loading={deleteMutation.isPending}
        onConfirm={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
