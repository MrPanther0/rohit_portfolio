'use client';

import { ChevronDown, ChevronUp, GripVertical, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button, Input, Textarea } from './ui';

export interface RepeatableField<T> {
  key: keyof T & string;
  label: string;
  type?: 'text' | 'textarea' | 'number' | 'color' | 'url';
  placeholder?: string;
  /** Grid span out of 12 columns. */
  span?: number;
  min?: number;
  max?: number;
}

interface RepeatableListProps<T extends Record<string, unknown>> {
  items: T[];
  fields: RepeatableField<T>[];
  onChange: (items: T[]) => void;
  template: () => T;
  addLabel?: string;
  emptyLabel?: string;
  max?: number;
  disabled?: boolean;
  /** Field used as the collapsed row summary. */
  titleKey?: keyof T & string;
}

/**
 * Ordered editor for repeating structures — palettes, process steps, timeline
 * entries and so on. Rows can be reordered, removed, and typed individually.
 */
export function RepeatableList<T extends Record<string, unknown>>({
  items,
  fields,
  onChange,
  template,
  addLabel = 'Add item',
  emptyLabel = 'Nothing here yet.',
  max = 30,
  disabled = false,
  titleKey,
}: RepeatableListProps<T>) {
  const update = (index: number, key: string, value: unknown) => {
    const next = [...items];
    next[index] = { ...(next[index] as T), [key]: value };
    onChange(next);
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const [row] = next.splice(index, 1);
    next.splice(target, 0, row!);
    onChange(next);
  };

  const remove = (index: number) => onChange(items.filter((_, i) => i !== index));

  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-[13px] text-white/30">
          {emptyLabel}
        </p>
      ) : null}

      {items.map((item, index) => (
        <div
          key={index}
          className="rounded-xl border border-white/8 bg-white/[0.015] p-3.5 transition-colors hover:border-white/15"
        >
          <div className="mb-3 flex items-center gap-2">
            <GripVertical size={14} className="text-white/20" aria-hidden />
            <span className="flex-1 truncate text-[12px] font-medium text-white/60">
              {titleKey && item[titleKey] ? String(item[titleKey]) : `Item ${index + 1}`}
            </span>

            <button
              type="button"
              onClick={() => move(index, -1)}
              disabled={index === 0 || disabled}
              aria-label="Move up"
              className="grid h-7 w-7 place-items-center rounded-md text-white/35 transition-colors hover:bg-white/[0.06] hover:text-white disabled:opacity-20"
            >
              <ChevronUp size={13} />
            </button>
            <button
              type="button"
              onClick={() => move(index, 1)}
              disabled={index === items.length - 1 || disabled}
              aria-label="Move down"
              className="grid h-7 w-7 place-items-center rounded-md text-white/35 transition-colors hover:bg-white/[0.06] hover:text-white disabled:opacity-20"
            >
              <ChevronDown size={13} />
            </button>
            <button
              type="button"
              onClick={() => remove(index)}
              disabled={disabled}
              aria-label="Remove"
              className="grid h-7 w-7 place-items-center rounded-md text-white/35 transition-colors hover:bg-red-500/15 hover:text-red-400 disabled:opacity-20"
            >
              <Trash2 size={13} />
            </button>
          </div>

          <div className="grid grid-cols-12 gap-3">
            {fields.map((field) => {
              const raw = item[field.key];
              const value = raw === null || raw === undefined ? '' : String(raw);

              return (
                <label
                  key={field.key}
                  className={cn('col-span-12 space-y-1.5', field.span ? `md:col-span-${field.span}` : 'md:col-span-6')}
                  style={field.span ? { gridColumn: `span ${field.span} / span ${field.span}` } : undefined}
                >
                  <span className="block text-[11px] font-medium text-white/45">{field.label}</span>

                  {field.type === 'textarea' ? (
                    <Textarea
                      rows={3}
                      value={value}
                      disabled={disabled}
                      placeholder={field.placeholder}
                      onChange={(event) => update(index, field.key, event.target.value)}
                      className="text-[13px]"
                    />
                  ) : field.type === 'color' ? (
                    <span className="flex items-center gap-2">
                      <input
                        type="color"
                        value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : '#8B5CF6'}
                        disabled={disabled}
                        onChange={(event) => update(index, field.key, event.target.value.toUpperCase())}
                        className="h-9 w-10 shrink-0 cursor-pointer rounded-lg border border-white/10 bg-transparent p-1"
                        aria-label={`${field.label} colour picker`}
                      />
                      <Input
                        value={value}
                        disabled={disabled}
                        placeholder="#8B5CF6"
                        onChange={(event) => update(index, field.key, event.target.value.toUpperCase())}
                        className="text-[13px] font-mono"
                      />
                    </span>
                  ) : (
                    <Input
                      type={field.type === 'number' ? 'number' : field.type === 'url' ? 'url' : 'text'}
                      value={value}
                      disabled={disabled}
                      min={field.min}
                      max={field.max}
                      placeholder={field.placeholder}
                      onChange={(event) =>
                        update(
                          index,
                          field.key,
                          field.type === 'number' ? Number(event.target.value) : event.target.value,
                        )
                      }
                      className="text-[13px]"
                    />
                  )}
                </label>
              );
            })}
          </div>
        </div>
      ))}

      <Button
        type="button"
        size="sm"
        icon={<Plus size={14} />}
        disabled={disabled || items.length >= max}
        onClick={() => onChange([...items, template()])}
      >
        {addLabel}
      </Button>
    </div>
  );
}

/** Comma-or-newline separated string list, used for tags, features, deliverables. */
export function StringListInput({
  value,
  onChange,
  placeholder,
  disabled,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Textarea
        rows={3}
        disabled={disabled}
        value={value.join('\n')}
        placeholder={placeholder}
        onChange={(event) =>
          onChange(
            event.target.value
              .split('\n')
              .map((line) => line.trim())
              .filter(Boolean),
          )
        }
        className="text-[13px]"
      />
      <p className="text-[11px] text-white/25">One item per line.</p>
    </div>
  );
}
