'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowDown, ArrowUp, ImagePlus, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useAdminAuth } from './AuthProvider';
import { PageHeader } from './AdminShell';
import { Button, EmptyState, Field, Input, Panel, Select, Spinner, Switch, Textarea } from './ui';
import { StringListInput } from './RepeatableList';
import { ConfirmDialog } from './ConfirmDialog';
import { MediaPicker } from './MediaPicker';
import type { MediaAsset, MediaRef } from '@/lib/types';
import { cn } from '@/lib/utils';

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'color'
  | 'url'
  | 'switch'
  | 'list'
  | 'media'
  | 'select';

export interface CollectionField {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  hint?: string;
  required?: boolean;
  full?: boolean;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
}

export interface CollectionConfig {
  /** REST segment under /api/admin. */
  resource: string;
  title: string;
  description: string;
  singular: string;
  fields: CollectionField[];
  defaults: Record<string, unknown>;
  /** Row heading + subtitle keys. */
  primaryKey: string;
  secondaryKey?: string;
  /** Enables the up/down reorder controls. */
  orderable?: boolean;
  /** Key holding a related media object, rendered as a thumbnail. */
  mediaKey?: string;
  /** Key holding a hex colour, rendered as a chip. */
  colorKey?: string;
}

type Row = Record<string, unknown> & { id: string };

function emptyForm(config: CollectionConfig): Record<string, unknown> {
  return { ...config.defaults };
}

/** Strips read-only relations and counts before writing back to the API. */
function toPayload(config: CollectionConfig, form: Record<string, unknown>) {
  const payload: Record<string, unknown> = {};
  for (const field of config.fields) {
    const value = form[field.key];
    if (field.type === 'media') {
      payload[field.key] = (value as MediaRef | null)?.id ?? null;
      continue;
    }
    if (field.type === 'number') {
      payload[field.key] = value === '' || value === null ? null : Number(value);
      continue;
    }
    if (field.type === 'url' || field.type === 'text' || field.type === 'textarea') {
      const text = typeof value === 'string' ? value.trim() : '';
      payload[field.key] = text ? text : field.required ? text : null;
      continue;
    }
    payload[field.key] = value;
  }
  if ('order' in config.defaults) payload.order = Number(form.order ?? 0);
  return payload;
}

export function CollectionManager({ config }: { config: CollectionConfig }) {
  const { request, can } = useAdminAuth();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>(emptyForm(config));
  const [open, setOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Row | null>(null);
  const [mediaField, setMediaField] = useState<string | null>(null);

  const key = ['admin', config.resource];

  const query = useQuery({
    queryKey: key,
    queryFn: async () => (await request<Row[]>(`/api/admin/${config.resource}`)).data,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = toPayload(config, form);
      return editing
        ? request(`/api/admin/${config.resource}/${editing.id}`, { method: 'PATCH', body: payload })
        : request(`/api/admin/${config.resource}`, { method: 'POST', body: payload });
    },
    onSuccess: () => {
      toast.success(editing ? `${config.singular} updated` : `${config.singular} created`);
      setOpen(false);
      setEditing(null);
      setForm(emptyForm(config));
      void invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => request(`/api/admin/${config.resource}/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success(`${config.singular} deleted`);
      setPendingDelete(null);
      void invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const reorderMutation = useMutation({
    mutationFn: async (items: { id: string; order: number }[]) =>
      request(`/api/admin/${config.resource}/reorder`, { method: 'PATCH', body: { items } }),
    onSuccess: () => void invalidate(),
    onError: (error: Error) => toast.error(error.message),
  });

  const rows = query.data ?? [];

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= rows.length) return;
    const a = rows[index]!;
    const b = rows[target]!;
    reorderMutation.mutate([
      { id: a.id, order: Number(b.order ?? target) },
      { id: b.id, order: Number(a.order ?? index) },
    ]);
  };

  const startCreate = () => {
    setEditing(null);
    setForm(emptyForm(config));
    setOpen(true);
  };

  const startEdit = (row: Row) => {
    setEditing(row);
    const next: Record<string, unknown> = {};
    for (const field of config.fields) {
      next[field.key] = row[field.key] ?? config.defaults[field.key] ?? '';
    }
    next.order = row.order ?? 0;
    setForm(next);
    setOpen(true);
  };

  return (
    <>
      <PageHeader
        title={config.title}
        description={config.description}
        actions={
          can('EDITOR') ? (
            <Button variant="primary" icon={<Plus size={15} />} onClick={startCreate}>
              New {config.singular.toLowerCase()}
            </Button>
          ) : null
        }
      />

      {query.isLoading ? (
        <Spinner label={`Loading ${config.title.toLowerCase()}`} />
      ) : rows.length === 0 ? (
        <EmptyState
          title={`No ${config.title.toLowerCase()} yet`}
          description={config.description}
          action={
            can('EDITOR') ? (
              <Button variant="primary" icon={<Plus size={15} />} onClick={startCreate}>
                New {config.singular.toLowerCase()}
              </Button>
            ) : null
          }
        />
      ) : (
        <ul className="space-y-2">
          {rows.map((row, index) => {
            const media = config.mediaKey ? (row[config.mediaKey] as MediaRef | null) : null;
            const colour = config.colorKey ? String(row[config.colorKey] ?? '') : '';
            const published = 'published' in row ? Boolean(row.published) : true;

            return (
              <li
                key={row.id}
                className={cn(
                  'flex flex-wrap items-center gap-3 rounded-xl border border-white/8 bg-white/[0.015] p-3.5 transition-colors hover:border-white/15',
                  !published && 'opacity-55',
                )}
              >
                {config.orderable && can('EDITOR') ? (
                  <div className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      aria-label="Move up"
                      className="text-white/25 transition-colors hover:text-white disabled:opacity-20"
                    >
                      <ArrowUp size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(index, 1)}
                      disabled={index === rows.length - 1}
                      aria-label="Move down"
                      className="text-white/25 transition-colors hover:text-white disabled:opacity-20"
                    >
                      <ArrowDown size={13} />
                    </button>
                  </div>
                ) : null}

                {media?.url ? (
                  <span className="h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-white/8">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={media.thumbnailUrl ?? media.url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </span>
                ) : colour ? (
                  <span
                    className="h-11 w-11 shrink-0 rounded-lg border border-white/10"
                    style={{ background: colour }}
                    aria-hidden
                  />
                ) : null}

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-white">
                    {String(row[config.primaryKey] ?? '—')}
                  </p>
                  {config.secondaryKey ? (
                    <p className="truncate text-xs text-white/35">
                      {String(row[config.secondaryKey] ?? '')}
                    </p>
                  ) : null}
                </div>

                {'_count' in row && row._count ? (
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/25">
                    {(row._count as { projects?: number }).projects ?? 0} projects
                  </span>
                ) : null}

                <div className="flex items-center gap-0.5">
                  {can('EDITOR') ? (
                    <button
                      type="button"
                      onClick={() => startEdit(row)}
                      aria-label="Edit"
                      className="grid h-8 w-8 place-items-center rounded-lg text-white/45 transition-colors hover:bg-white/[0.06] hover:text-white"
                    >
                      <Pencil size={14} />
                    </button>
                  ) : null}
                  {can('ADMIN') ? (
                    <button
                      type="button"
                      onClick={() => setPendingDelete(row)}
                      aria-label="Delete"
                      className="grid h-8 w-8 place-items-center rounded-lg text-white/45 transition-colors hover:bg-red-500/15 hover:text-red-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Editor drawer */}
      {open ? (
        <div className="fixed inset-0 z-[130] flex justify-end">
          <button
            type="button"
            aria-label="Close editor"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="relative flex h-full w-full max-w-lg flex-col border-l border-white/10 bg-graphite-300">
            <header className="flex items-center justify-between border-b border-white/8 px-5 py-4">
              <h2 className="text-sm font-medium text-white">
                {editing ? `Edit ${config.singular.toLowerCase()}` : `New ${config.singular.toLowerCase()}`}
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="text-white/40 hover:text-white"
              >
                <X size={17} />
              </button>
            </header>

            <form
              className="flex-1 space-y-5 overflow-y-auto p-5"
              onSubmit={(event) => {
                event.preventDefault();
                saveMutation.mutate();
              }}
            >
              {config.fields.map((field) => {
                const value = form[field.key];

                if (field.type === 'switch') {
                  return (
                    <Switch
                      key={field.key}
                      checked={Boolean(value)}
                      onChange={(next) => setForm((current) => ({ ...current, [field.key]: next }))}
                      label={field.label}
                      description={field.hint}
                    />
                  );
                }

                if (field.type === 'media') {
                  const media = value as MediaRef | null;
                  return (
                    <Field key={field.key} label={field.label} hint={field.hint}>
                      {media?.url ? (
                        <div className="flex items-center gap-3">
                          <span className="h-16 w-16 overflow-hidden rounded-lg border border-white/8">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={media.thumbnailUrl ?? media.url}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          </span>
                          <Button size="sm" type="button" onClick={() => setMediaField(field.key)}>
                            Replace
                          </Button>
                          <Button
                            size="sm"
                            type="button"
                            variant="danger"
                            onClick={() => setForm((current) => ({ ...current, [field.key]: null }))}
                          >
                            Remove
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          type="button"
                          icon={<ImagePlus size={14} />}
                          onClick={() => setMediaField(field.key)}
                        >
                          Choose image
                        </Button>
                      )}
                    </Field>
                  );
                }

                return (
                  <Field key={field.key} label={field.label} hint={field.hint} required={field.required}>
                    {field.type === 'textarea' ? (
                      <Textarea
                        rows={4}
                        value={String(value ?? '')}
                        placeholder={field.placeholder}
                        required={field.required}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, [field.key]: event.target.value }))
                        }
                      />
                    ) : field.type === 'list' ? (
                      <StringListInput
                        value={Array.isArray(value) ? (value as string[]) : []}
                        onChange={(next) => setForm((current) => ({ ...current, [field.key]: next }))}
                        placeholder={field.placeholder}
                      />
                    ) : field.type === 'select' ? (
                      <Select
                        value={String(value ?? '')}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, [field.key]: event.target.value }))
                        }
                      >
                        {field.options?.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Select>
                    ) : field.type === 'color' ? (
                      <div className="flex items-center gap-2.5">
                        <input
                          type="color"
                          value={/^#[0-9a-fA-F]{6}$/.test(String(value)) ? String(value) : '#8B5CF6'}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              [field.key]: event.target.value.toUpperCase(),
                            }))
                          }
                          className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-white/10 bg-transparent p-1"
                          aria-label={`${field.label} picker`}
                        />
                        <Input
                          value={String(value ?? '')}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              [field.key]: event.target.value.toUpperCase(),
                            }))
                          }
                          className="font-mono text-[13px]"
                        />
                      </div>
                    ) : (
                      <Input
                        type={field.type === 'number' ? 'number' : field.type === 'url' ? 'url' : 'text'}
                        value={String(value ?? '')}
                        min={field.min}
                        max={field.max}
                        placeholder={field.placeholder}
                        required={field.required}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, [field.key]: event.target.value }))
                        }
                      />
                    )}
                  </Field>
                );
              })}
            </form>

            <footer className="flex justify-end gap-2 border-t border-white/8 px-5 py-4">
              <Button type="button" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                loading={saveMutation.isPending}
                onClick={() => saveMutation.mutate()}
              >
                {editing ? 'Save changes' : `Create ${config.singular.toLowerCase()}`}
              </Button>
            </footer>
          </div>
        </div>
      ) : null}

      <MediaPicker
        open={mediaField !== null}
        onClose={() => setMediaField(null)}
        onSelect={(assets: MediaAsset[]) => {
          if (mediaField && assets[0]) {
            setForm((current) => ({ ...current, [mediaField]: assets[0] }));
          }
          setMediaField(null);
        }}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={`Delete this ${config.singular.toLowerCase()}?`}
        description="This cannot be undone."
        confirmLabel="Delete"
        destructive
        loading={deleteMutation.isPending}
        onConfirm={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
