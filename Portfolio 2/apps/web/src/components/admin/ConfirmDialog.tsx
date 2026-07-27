'use client';

import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { ease } from '@/lib/motion';
import { Button } from './ui';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Modal confirmation with focus trapping and Escape-to-cancel. */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const restore = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;

    restore.current = document.activeElement;
    const timer = window.setTimeout(() => confirmRef.current?.focus(), 40);

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !loading) onCancel();
    };

    window.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', onKey);
      (restore.current as HTMLElement | null)?.focus?.();
    };
  }, [open, loading, onCancel]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[140] grid place-items-center px-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
        >
          <button
            type="button"
            aria-label="Cancel"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => !loading && onCancel()}
          />

          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby={description ? 'confirm-description' : undefined}
            className="relative w-full max-w-md rounded-2xl border border-white/10 bg-graphite-300 p-6 shadow-elevated"
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.32, ease: ease.expo }}
          >
            {destructive ? (
              <span className="mb-4 grid h-11 w-11 place-items-center rounded-xl border border-red-500/25 bg-red-500/10 text-red-400">
                <AlertTriangle size={19} />
              </span>
            ) : null}

            <h2 id="confirm-title" className="text-base font-medium text-white">
              {title}
            </h2>
            {description ? (
              <p id="confirm-description" className="mt-2 text-[13px] leading-relaxed text-white/45">
                {description}
              </p>
            ) : null}

            <div className="mt-6 flex justify-end gap-2">
              <Button onClick={onCancel} disabled={loading}>
                {cancelLabel}
              </Button>
              <Button
                ref={confirmRef}
                variant={destructive ? 'danger' : 'primary'}
                onClick={onConfirm}
                loading={loading}
              >
                {confirmLabel}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
