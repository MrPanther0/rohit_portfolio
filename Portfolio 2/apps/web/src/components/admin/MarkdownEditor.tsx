'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bold,
  Code,
  Eye,
  Heading2,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Undo2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Markdown } from '@/components/ui/Markdown';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  /** Called on a debounce whenever the value settles — used for autosave. */
  onAutosave?: (value: string) => void;
  autosaveDelay?: number;
}

interface HistoryEntry {
  value: string;
  selection: number;
}

/**
 * Markdown editing with a formatting toolbar, live preview, an independent
 * undo/redo stack, and debounced autosave.
 */
export function MarkdownEditor({
  value,
  onChange,
  placeholder = 'Write the case study…',
  rows = 16,
  onAutosave,
  autosaveDelay = 2500,
}: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [preview, setPreview] = useState(false);

  const history = useRef<HistoryEntry[]>([{ value, selection: 0 }]);
  const pointer = useRef(0);
  const skipHistory = useRef(false);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [, forceRender] = useState(0);

  // Record history at word boundaries rather than per keystroke.
  useEffect(() => {
    if (skipHistory.current) {
      skipHistory.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      const current = history.current[pointer.current];
      if (current?.value === value) return;
      history.current = history.current.slice(0, pointer.current + 1);
      history.current.push({ value, selection: textareaRef.current?.selectionStart ?? value.length });
      if (history.current.length > 120) history.current.shift();
      pointer.current = history.current.length - 1;
      forceRender((n) => n + 1);
    }, 420);
    return () => window.clearTimeout(timer);
  }, [value]);

  useEffect(() => {
    if (!onAutosave) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => onAutosave(value), autosaveDelay);
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [value, onAutosave, autosaveDelay]);

  const restore = useCallback(
    (entry: HistoryEntry | undefined) => {
      if (!entry) return;
      skipHistory.current = true;
      onChange(entry.value);
      window.requestAnimationFrame(() => {
        textareaRef.current?.focus();
        textareaRef.current?.setSelectionRange(entry.selection, entry.selection);
      });
      forceRender((n) => n + 1);
    },
    [onChange],
  );

  const undo = useCallback(() => {
    if (pointer.current <= 0) return;
    pointer.current -= 1;
    restore(history.current[pointer.current]);
  }, [restore]);

  const redo = useCallback(() => {
    if (pointer.current >= history.current.length - 1) return;
    pointer.current += 1;
    restore(history.current[pointer.current]);
  }, [restore]);

  /** Wraps or prefixes the current selection with Markdown syntax. */
  const apply = useCallback(
    (before: string, after = '', block = false) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selected = value.slice(start, end);

      let next: string;
      let caret: number;

      if (block) {
        const lineStart = value.lastIndexOf('\n', start - 1) + 1;
        const body = selected || 'text';
        next = `${value.slice(0, lineStart)}${before}${value.slice(lineStart, start)}${body}${value.slice(end)}`;
        caret = lineStart + before.length + (start - lineStart) + body.length;
      } else {
        const body = selected || 'text';
        next = `${value.slice(0, start)}${before}${body}${after}${value.slice(end)}`;
        caret = start + before.length + body.length;
      }

      onChange(next);
      window.requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(caret, caret);
      });
    },
    [value, onChange],
  );

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const meta = event.metaKey || event.ctrlKey;
    if (!meta) return;

    switch (event.key.toLowerCase()) {
      case 'b':
        event.preventDefault();
        apply('**', '**');
        break;
      case 'i':
        event.preventDefault();
        apply('*', '*');
        break;
      case 'k':
        event.preventDefault();
        apply('[', '](https://)');
        break;
      case 'z':
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        break;
      case 'y':
        event.preventDefault();
        redo();
        break;
      default:
        break;
    }
  };

  const tools = [
    { icon: Bold, label: 'Bold (Ctrl+B)', run: () => apply('**', '**') },
    { icon: Italic, label: 'Italic (Ctrl+I)', run: () => apply('*', '*') },
    { icon: Heading2, label: 'Heading', run: () => apply('## ', '', true) },
    { icon: List, label: 'Bullet list', run: () => apply('- ', '', true) },
    { icon: ListOrdered, label: 'Numbered list', run: () => apply('1. ', '', true) },
    { icon: Quote, label: 'Quote', run: () => apply('> ', '', true) },
    { icon: Code, label: 'Inline code', run: () => apply('`', '`') },
    { icon: Link2, label: 'Link (Ctrl+K)', run: () => apply('[', '](https://)') },
  ];

  const words = value.trim() ? value.trim().split(/\s+/).length : 0;

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-white/8 px-2 py-1.5">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <button
              key={tool.label}
              type="button"
              onClick={tool.run}
              title={tool.label}
              aria-label={tool.label}
              className="grid h-8 w-8 place-items-center rounded-lg text-white/45 transition-colors hover:bg-white/[0.07] hover:text-white"
            >
              <Icon size={14} />
            </button>
          );
        })}

        <span className="mx-1 h-5 w-px bg-white/10" />

        <button
          type="button"
          onClick={undo}
          disabled={pointer.current <= 0}
          title="Undo (Ctrl+Z)"
          aria-label="Undo"
          className="grid h-8 w-8 place-items-center rounded-lg text-white/45 transition-colors hover:bg-white/[0.07] hover:text-white disabled:opacity-25"
        >
          <Undo2 size={14} />
        </button>
        <button
          type="button"
          onClick={redo}
          disabled={pointer.current >= history.current.length - 1}
          title="Redo (Ctrl+Shift+Z)"
          aria-label="Redo"
          className="grid h-8 w-8 place-items-center rounded-lg text-white/45 transition-colors hover:bg-white/[0.07] hover:text-white disabled:opacity-25"
        >
          <Redo2 size={14} />
        </button>

        <button
          type="button"
          onClick={() => setPreview((p) => !p)}
          aria-pressed={preview}
          className={cn(
            'ml-auto flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12px] transition-colors',
            preview ? 'bg-white/[0.1] text-white' : 'text-white/45 hover:bg-white/[0.07] hover:text-white',
          )}
        >
          <Eye size={13} />
          Preview
        </button>
      </div>

      {preview ? (
        <div className="max-h-[560px] overflow-y-auto p-5">
          {value.trim() ? (
            <Markdown content={value} className="text-[14px]" />
          ) : (
            <p className="text-[13px] text-white/30">Nothing to preview yet.</p>
          )}
        </div>
      ) : (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          rows={rows}
          placeholder={placeholder}
          spellCheck
          className="w-full resize-y bg-transparent px-4 py-3.5 font-mono text-[13px] leading-relaxed text-bone outline-none placeholder:text-white/25"
        />
      )}

      <div className="flex items-center justify-between border-t border-white/8 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-white/25">
        <span>Markdown supported</span>
        <span>
          {words} words · {value.length} characters
        </span>
      </div>
    </div>
  );
}
