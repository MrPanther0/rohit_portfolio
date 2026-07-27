'use client';

import { useCallback, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ImagePlus, Search, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAdminAuth } from './AuthProvider';
import { Button, Input, Spinner } from './ui';
import { cn, formatBytes } from '@/lib/utils';
import { ease } from '@/lib/motion';
import type { MediaAsset } from '@/lib/types';

interface MediaPickerProps {
  open: boolean;
  multiple?: boolean;
  /** Restrict the grid to a single asset class. */
  kind?: MediaAsset['kind'];
  onClose: () => void;
  onSelect: (assets: MediaAsset[]) => void;
}

/**
 * Modal asset browser with drag-and-drop upload. Uploads go straight to the
 * media endpoint, which handles compression and thumbnail generation server-side.
 */
export function MediaPicker({ open, multiple = false, kind, onClose, onSelect }: MediaPickerProps) {
  const { request } = useAdminAuth();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Record<string, MediaAsset>>({});
  const [dragging, setDragging] = useState(false);

  const query = useQuery({
    queryKey: ['admin', 'media', { search, kind }],
    queryFn: async () => {
      const params = new URLSearchParams({
        perPage: '60',
        ...(kind ? { kind } : {}),
        ...(search ? { search } : {}),
      });
      return (await request<MediaAsset[]>(`/api/admin/media?${params}`)).data;
    },
    enabled: open,
  });

  const uploadMutation = useMutation({
    mutationFn: async (files: FileList | File[]) => {
      const formData = new FormData();
      Array.from(files).forEach((file) => formData.append('files', file));
      return (await request<MediaAsset[]>('/api/admin/media/upload', { method: 'POST', formData })).data;
    },
    onSuccess: (assets) => {
      toast.success(`${assets.length} file${assets.length === 1 ? '' : 's'} uploaded`);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'media'] });
      if (!multiple && assets[0]) {
        onSelect([assets[0]]);
        onClose();
      }
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const toggle = useCallback(
    (asset: MediaAsset) => {
      setSelected((current) => {
        if (multiple) {
          const next = { ...current };
          if (next[asset.id]) delete next[asset.id];
          else next[asset.id] = asset;
          return next;
        }
        return { [asset.id]: asset };
      });
    },
    [multiple],
  );

  const confirm = () => {
    const assets = Object.values(selected);
    if (!assets.length) return;
    onSelect(assets);
    setSelected({});
    onClose();
  };

  const count = Object.keys(selected).length;

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[130] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            aria-label="Close media picker"
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Media library"
            className="relative flex h-[80vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-graphite-300 shadow-elevated"
            initial={{ opacity: 0, scale: 0.97, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.35, ease: ease.expo }}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              if (event.dataTransfer.files.length) uploadMutation.mutate(event.dataTransfer.files);
            }}
          >
            <header className="flex items-center gap-3 border-b border-white/8 px-5 py-4">
              <div className="relative flex-1">
                <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search the library…"
                  className="pl-10"
                  aria-label="Search media"
                />
              </div>

              <Button
                icon={<Upload size={15} />}
                loading={uploadMutation.isPending}
                onClick={() => inputRef.current?.click()}
              >
                Upload
              </Button>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="grid h-9 w-9 place-items-center rounded-lg text-white/45 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                <X size={17} />
              </button>

              <input
                ref={inputRef}
                type="file"
                multiple
                hidden
                accept="image/*,video/*,application/pdf"
                onChange={(event) => {
                  if (event.target.files?.length) uploadMutation.mutate(event.target.files);
                  event.target.value = '';
                }}
              />
            </header>

            <div className="relative flex-1 overflow-y-auto p-5">
              {dragging ? (
                <div className="pointer-events-none absolute inset-3 z-10 grid place-items-center rounded-xl border-2 border-dashed border-ultraviolet/60 bg-ultraviolet/10">
                  <p className="text-sm text-white">Drop to upload</p>
                </div>
              ) : null}

              {query.isLoading ? (
                <Spinner label="Loading library" />
              ) : query.data?.length ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {query.data.map((asset) => {
                    const isSelected = Boolean(selected[asset.id]);
                    return (
                      <button
                        key={asset.id}
                        type="button"
                        onClick={() => toggle(asset)}
                        aria-pressed={isSelected}
                        className={cn(
                          'group relative aspect-square overflow-hidden rounded-xl border transition-all duration-300',
                          isSelected
                            ? 'border-ultraviolet ring-2 ring-ultraviolet/40'
                            : 'border-white/8 hover:border-white/25',
                        )}
                      >
                        {asset.kind === 'IMAGE' ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={asset.thumbnailUrl ?? asset.url}
                            alt={asset.alt ?? asset.filename}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <span className="grid h-full w-full place-items-center bg-white/[0.03] font-mono text-[10px] uppercase tracking-[0.14em] text-white/40">
                            {asset.kind}
                          </span>
                        )}

                        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-2 text-left">
                          <span className="block truncate text-[11px] text-white/85">{asset.filename}</span>
                          <span className="block text-[10px] text-white/40">{formatBytes(asset.size)}</span>
                        </span>

                        {isSelected ? (
                          <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-ultraviolet text-void">
                            <Check size={13} />
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="grid h-full place-items-center text-center">
                  <div>
                    <ImagePlus size={32} className="mx-auto text-white/20" />
                    <p className="mt-4 text-sm text-white/70">Nothing in the library yet</p>
                    <p className="mt-1.5 text-[13px] text-white/35">
                      Drop files here, or use the upload button.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <footer className="flex items-center justify-between border-t border-white/8 px-5 py-4">
              <p className="text-[13px] text-white/35">
                {count ? `${count} selected` : multiple ? 'Select one or more assets' : 'Select an asset'}
              </p>
              <div className="flex gap-2">
                <Button onClick={onClose}>Cancel</Button>
                <Button variant="primary" onClick={confirm} disabled={!count}>
                  {multiple ? `Add ${count || ''}`.trim() : 'Use asset'}
                </Button>
              </div>
            </footer>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
