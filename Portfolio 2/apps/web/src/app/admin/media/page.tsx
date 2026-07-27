'use client';

import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FolderPlus, Search, Trash2, Upload, X } from 'lucide-react';
import { useAdminAuth } from '@/components/admin/AuthProvider';
import { PageHeader } from '@/components/admin/AdminShell';
import { Badge, Button, EmptyState, Field, Input, Panel, Select, Spinner } from '@/components/admin/ui';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import type { Folder, MediaAsset, MediaKind, PageMeta } from '@/lib/types';
import { cn, formatBytes, formatDate } from '@/lib/utils';

const KINDS: (MediaKind | 'ALL')[] = ['ALL', 'IMAGE', 'VIDEO', 'DOCUMENT', 'AUDIO', 'LOTTIE'];

export default function AdminMediaPage() {
  const { request, can } = useAdminAuth();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState('');
  const [kind, setKind] = useState<MediaKind | 'ALL'>('ALL');
  const [folderId, setFolderId] = useState('');
  const [page, setPage] = useState(1);
  const [selection, setSelection] = useState<string[]>([]);
  const [inspecting, setInspecting] = useState<MediaAsset | null>(null);
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [newFolder, setNewFolder] = useState('');

  const folders = useQuery({
    queryKey: ['admin', 'folders'],
    queryFn: async () => (await request<Folder[]>('/api/admin/folders')).data,
  });

  const media = useQuery({
    queryKey: ['admin', 'media', { search, kind, folderId, page }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        perPage: '48',
        kind,
        ...(search ? { search } : {}),
        ...(folderId ? { folderId } : {}),
      });
      const response = await request<MediaAsset[]>(`/api/admin/media?${params}`);
      return { items: response.data, meta: response.meta as PageMeta };
    },
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'media'] });
    void queryClient.invalidateQueries({ queryKey: ['admin', 'folders'] });
  };

  const uploadMutation = useMutation({
    mutationFn: async (files: FileList | File[]) => {
      const formData = new FormData();
      Array.from(files).forEach((file) => formData.append('files', file));
      if (folderId) formData.append('folderId', folderId);
      return (await request<MediaAsset[]>('/api/admin/media/upload', { method: 'POST', formData })).data;
    },
    onSuccess: (assets) => {
      toast.success(`${assets.length} file${assets.length === 1 ? '' : 's'} uploaded`);
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<MediaAsset> }) =>
      request(`/api/admin/media/${id}`, { method: 'PATCH', body: patch }),
    onSuccess: () => {
      toast.success('Asset updated');
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) =>
      ids.length === 1
        ? request(`/api/admin/media/${ids[0]}`, { method: 'DELETE' })
        : request('/api/admin/media/bulk-delete', { method: 'POST', body: { ids } }),
    onSuccess: () => {
      toast.success('Assets deleted');
      setSelection([]);
      setInspecting(null);
      setConfirmBulk(false);
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const folderMutation = useMutation({
    mutationFn: async (name: string) =>
      request('/api/admin/folders', { method: 'POST', body: { name, parentId: null } }),
    onSuccess: () => {
      toast.success('Folder created');
      setNewFolder('');
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const items = media.data?.items ?? [];
  const meta = media.data?.meta;

  const toggle = (id: string) =>
    setSelection((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );

  return (
    <>
      <PageHeader
        title="Media library"
        description="Every image, video and document used across the site. Uploads are compressed and thumbnailed automatically."
        actions={
          can('EDITOR') ? (
            <>
              {selection.length ? (
                <Button variant="danger" icon={<Trash2 size={15} />} onClick={() => setConfirmBulk(true)}>
                  Delete {selection.length}
                </Button>
              ) : null}
              <Button
                variant="primary"
                icon={<Upload size={15} />}
                loading={uploadMutation.isPending}
                onClick={() => inputRef.current?.click()}
              >
                Upload
              </Button>
            </>
          ) : null
        }
      />

      <input
        ref={inputRef}
        type="file"
        multiple
        hidden
        accept="image/*,video/*,audio/*,application/pdf,application/json"
        onChange={(event) => {
          if (event.target.files?.length) uploadMutation.mutate(event.target.files);
          event.target.value = '';
        }}
      />

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="space-y-4">
          <Panel title="Folders">
            <ul className="space-y-0.5">
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setFolderId('');
                    setPage(1);
                  }}
                  className={cn(
                    'w-full rounded-lg px-3 py-2 text-left text-[13px] transition-colors',
                    !folderId ? 'bg-white/[0.07] text-white' : 'text-white/50 hover:bg-white/[0.04]',
                  )}
                >
                  All assets
                </button>
              </li>
              {folders.data?.map((folder) => (
                <li key={folder.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setFolderId(folder.id);
                      setPage(1);
                    }}
                    className={cn(
                      'flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[13px] transition-colors',
                      folderId === folder.id
                        ? 'bg-white/[0.07] text-white'
                        : 'text-white/50 hover:bg-white/[0.04]',
                    )}
                  >
                    <span className="truncate">{folder.name}</span>
                    <span className="text-[11px] text-white/25">{folder._count?.media ?? 0}</span>
                  </button>
                </li>
              ))}
            </ul>

            {can('EDITOR') ? (
              <form
                className="mt-4 flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (newFolder.trim()) folderMutation.mutate(newFolder.trim());
                }}
              >
                <Input
                  value={newFolder}
                  onChange={(event) => setNewFolder(event.target.value)}
                  placeholder="New folder"
                  className="h-9 py-0 text-[13px]"
                  aria-label="New folder name"
                />
                <Button
                  type="submit"
                  size="icon"
                  aria-label="Create folder"
                  icon={<FolderPlus size={15} />}
                  loading={folderMutation.isPending}
                />
              </form>
            ) : null}
          </Panel>
        </aside>

        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            if (can('EDITOR') && event.dataTransfer.files.length) {
              uploadMutation.mutate(event.dataTransfer.files);
            }
          }}
          className={cn(
            'rounded-2xl transition-colors',
            dragging && 'outline-dashed outline-2 outline-offset-4 outline-ultraviolet/60',
          )}
        >
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <div className="relative min-w-[200px] flex-1">
              <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25" />
              <Input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search by filename or alt text…"
                className="pl-10"
                aria-label="Search media"
              />
            </div>
            <Select
              value={kind}
              onChange={(event) => {
                setKind(event.target.value as MediaKind | 'ALL');
                setPage(1);
              }}
              className="w-auto min-w-[140px]"
              aria-label="Filter by type"
            >
              {KINDS.map((option) => (
                <option key={option} value={option}>
                  {option === 'ALL' ? 'All types' : option}
                </option>
              ))}
            </Select>
          </div>

          {media.isLoading ? (
            <Spinner label="Loading library" />
          ) : items.length === 0 ? (
            <EmptyState
              icon={<Upload size={30} />}
              title="No assets here"
              description="Drop files anywhere in this area, or use the upload button."
            />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {items.map((asset) => {
                const selected = selection.includes(asset.id);
                return (
                  <div
                    key={asset.id}
                    className={cn(
                      'group relative overflow-hidden rounded-xl border transition-all duration-300',
                      selected ? 'border-ultraviolet ring-2 ring-ultraviolet/40' : 'border-white/8',
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setInspecting(asset)}
                      className="block aspect-square w-full"
                      aria-label={`Inspect ${asset.filename}`}
                    >
                      {asset.kind === 'IMAGE' ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={asset.thumbnailUrl ?? asset.url}
                          alt={asset.alt ?? asset.filename}
                          className="h-full w-full object-cover transition-transform duration-700 ease-expo group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <span className="grid h-full w-full place-items-center bg-white/[0.03] font-mono text-[10px] uppercase tracking-[0.14em] text-white/40">
                          {asset.kind}
                        </span>
                      )}
                    </button>

                    {can('EDITOR') ? (
                      <label className="absolute left-2 top-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggle(asset.id)}
                          className="h-4 w-4 rounded border-white/30 bg-black/50 accent-[#8B5CF6]"
                          aria-label={`Select ${asset.filename}`}
                        />
                      </label>
                    ) : null}

                    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-2">
                      <p className="truncate text-[11px] text-white/85">{asset.filename}</p>
                      <p className="text-[10px] text-white/40">
                        {asset.width && asset.height ? `${asset.width}×${asset.height} · ` : ''}
                        {formatBytes(asset.size)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {meta && meta.pageCount > 1 ? (
            <nav className="mt-5 flex items-center justify-between" aria-label="Pagination">
              <p className="text-[13px] text-white/35">
                Page {meta.page} of {meta.pageCount} · {meta.total} assets
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
        </div>
      </div>

      {/* Inspector */}
      {inspecting ? (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close inspector"
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => setInspecting(null)}
          />
          <div className="relative grid max-h-[85vh] w-full max-w-4xl grid-cols-1 overflow-hidden rounded-2xl border border-white/10 bg-graphite-300 md:grid-cols-[1.4fr_1fr]">
            <div className="grid place-items-center bg-black/40 p-6">
              {inspecting.kind === 'IMAGE' ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={inspecting.url}
                  alt={inspecting.alt ?? inspecting.filename}
                  className="max-h-[60vh] w-auto object-contain"
                />
              ) : inspecting.kind === 'VIDEO' ? (
                <video src={inspecting.url} controls className="max-h-[60vh] w-full" />
              ) : (
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-white/40">
                  {inspecting.mimeType}
                </p>
              )}
            </div>

            <div className="space-y-4 overflow-y-auto p-6">
              <div className="flex items-start justify-between gap-3">
                <h2 className="min-w-0 break-words text-sm font-medium text-white">{inspecting.filename}</h2>
                <button
                  type="button"
                  onClick={() => setInspecting(null)}
                  aria-label="Close"
                  className="shrink-0 text-white/40 hover:text-white"
                >
                  <X size={17} />
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <Badge>{inspecting.kind}</Badge>
                <Badge>{formatBytes(inspecting.size)}</Badge>
                {inspecting.width && inspecting.height ? (
                  <Badge>
                    {inspecting.width}×{inspecting.height}
                  </Badge>
                ) : null}
              </div>

              <Field label="Alt text" hint="Read by screen readers">
                <Input
                  key={inspecting.id}
                  defaultValue={inspecting.alt ?? ''}
                  disabled={!can('EDITOR')}
                  onBlur={(event) =>
                    event.target.value !== (inspecting.alt ?? '') &&
                    updateMutation.mutate({ id: inspecting.id, patch: { alt: event.target.value } })
                  }
                />
              </Field>

              <Field label="Public URL">
                <Input readOnly value={inspecting.url} className="font-mono text-[11px]" />
              </Field>

              <p className="text-[12px] text-white/30">Uploaded {formatDate(inspecting.createdAt, true)}</p>

              {can('EDITOR') ? (
                <Button
                  variant="danger"
                  icon={<Trash2 size={15} />}
                  loading={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate([inspecting.id])}
                  className="w-full"
                >
                  Delete asset
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmBulk}
        title={`Delete ${selection.length} assets?`}
        description="Any project still referencing them will lose that image. This cannot be undone."
        confirmLabel="Delete assets"
        destructive
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate(selection)}
        onCancel={() => setConfirmBulk(false)}
      />
    </>
  );
}
