'use client';

import { Fragment, useMemo, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * A small, dependency-free Markdown renderer.
 *
 * It emits React elements rather than HTML strings, so there is no
 * `dangerouslySetInnerHTML` anywhere in the content pipeline and authored copy
 * can never inject markup. Supported: headings, paragraphs, ordered and
 * unordered lists, blockquotes, fenced code, rules, and the inline set
 * (bold, italic, inline code, links).
 */

type Block =
  | { type: 'heading'; level: 1 | 2 | 3 | 4; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'quote'; text: string }
  | { type: 'code'; language: string; code: string }
  | { type: 'rule' };

function parseBlocks(source: string): Block[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? '';

    if (!line.trim()) {
      index += 1;
      continue;
    }

    // Fenced code
    if (line.startsWith('```')) {
      const language = line.slice(3).trim();
      const body: string[] = [];
      index += 1;
      while (index < lines.length && !(lines[index] ?? '').startsWith('```')) {
        body.push(lines[index] ?? '');
        index += 1;
      }
      index += 1;
      blocks.push({ type: 'code', language, code: body.join('\n') });
      continue;
    }

    if (/^ {0,3}(---|\*\*\*|___)\s*$/.test(line)) {
      blocks.push({ type: 'rule' });
      index += 1;
      continue;
    }

    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      blocks.push({
        type: 'heading',
        level: heading[1]!.length as 1 | 2 | 3 | 4,
        text: heading[2]!.trim(),
      });
      index += 1;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const body: string[] = [];
      while (index < lines.length && /^>\s?/.test(lines[index] ?? '')) {
        body.push((lines[index] ?? '').replace(/^>\s?/, ''));
        index += 1;
      }
      blocks.push({ type: 'quote', text: body.join(' ') });
      continue;
    }

    const bullet = /^\s*[-*+]\s+(.*)$/;
    const numbered = /^\s*\d+[.)]\s+(.*)$/;

    if (bullet.test(line) || numbered.test(line)) {
      const ordered = numbered.test(line);
      const pattern = ordered ? numbered : bullet;
      const items: string[] = [];
      while (index < lines.length && pattern.test(lines[index] ?? '')) {
        items.push(pattern.exec(lines[index] ?? '')![1]!.trim());
        index += 1;
      }
      blocks.push({ type: 'list', ordered, items });
      continue;
    }

    const paragraph: string[] = [];
    while (
      index < lines.length &&
      (lines[index] ?? '').trim() &&
      !/^(#{1,4}\s|>|```|\s*[-*+]\s|\s*\d+[.)]\s)/.test(lines[index] ?? '')
    ) {
      paragraph.push((lines[index] ?? '').trim());
      index += 1;
    }
    if (paragraph.length) blocks.push({ type: 'paragraph', text: paragraph.join(' ') });
  }

  return blocks;
}

const INLINE = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g;

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const parts = text.split(INLINE).filter(Boolean);

  return parts.map((part, index) => {
    const key = `${keyPrefix}-${index}`;

    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={key} className="font-semibold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return (
        <em key={key} className="italic">
          {part.slice(1, -1)}
        </em>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={key} className="rounded bg-white/[0.07] px-1.5 py-0.5 font-mono text-[0.85em] text-signal">
          {part.slice(1, -1)}
        </code>
      );
    }

    const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);
    if (link) {
      const href = link[2]!;
      const external = /^https?:\/\//.test(href);
      return (
        <a
          key={key}
          href={href}
          {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          className="underline decoration-white/30 underline-offset-4 transition-colors hover:decoration-signal hover:text-signal"
        >
          {link[1]}
        </a>
      );
    }

    return <Fragment key={key}>{part}</Fragment>;
  });
}

export function Markdown({ content, className }: { content: string; className?: string }) {
  const blocks = useMemo(() => parseBlocks(content ?? ''), [content]);

  return (
    <div className={cn('space-y-6 text-fluid-base leading-relaxed text-white/65', className)}>
      {blocks.map((block, index) => {
        const key = `block-${index}`;

        switch (block.type) {
          case 'heading': {
            const sizes = {
              1: 'text-fluid-2xl display text-white',
              2: 'text-fluid-xl font-semibold tracking-tight text-white',
              3: 'text-fluid-lg font-semibold tracking-tight text-white',
              4: 'text-fluid-base font-semibold uppercase tracking-[0.14em] text-white/80',
            } as const;
            const Tag = (['h2', 'h3', 'h4', 'h5'] as const)[block.level - 1]!;
            return (
              <Tag key={key} className={cn('mt-10 first:mt-0', sizes[block.level])}>
                {renderInline(block.text, key)}
              </Tag>
            );
          }

          case 'paragraph':
            return <p key={key}>{renderInline(block.text, key)}</p>;

          case 'list':
            return block.ordered ? (
              <ol key={key} className="ml-5 list-decimal space-y-2 marker:text-white/30">
                {block.items.map((item, i) => (
                  <li key={i} className="pl-1.5">
                    {renderInline(item, `${key}-${i}`)}
                  </li>
                ))}
              </ol>
            ) : (
              <ul key={key} className="ml-5 list-disc space-y-2 marker:text-ultraviolet">
                {block.items.map((item, i) => (
                  <li key={i} className="pl-1.5">
                    {renderInline(item, `${key}-${i}`)}
                  </li>
                ))}
              </ul>
            );

          case 'quote':
            return (
              <blockquote
                key={key}
                className="border-l-2 border-ultraviolet/60 pl-6 text-fluid-lg font-light italic text-white/80"
              >
                {renderInline(block.text, key)}
              </blockquote>
            );

          case 'code':
            return (
              <pre
                key={key}
                className="overflow-x-auto rounded-2xl border border-white/8 bg-black/60 p-5 font-mono text-[13px] leading-relaxed text-white/75"
              >
                <code data-language={block.language || undefined}>{block.code}</code>
              </pre>
            );

          case 'rule':
            return <hr key={key} className="border-white/10" />;

          default:
            return null;
        }
      })}
    </div>
  );
}
