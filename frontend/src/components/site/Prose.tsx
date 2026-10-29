/**
 * Renders a parsed /writing post body (lib/markdown.ts). Server component,
 * no motion. External links open in place, like every other link on the
 * plain pages.
 *
 * Type scale: 17px body at 1.7 line height in a column capped near 68
 * characters, serif h2 section heads (26 to 30px) with room above them, serif
 * h3 sub-heads at 21px, and code blocks at 14px Geist Mono that scroll sideways
 * inside their own box instead of widening the page.
 */

import type { Block, Inline } from '@/lib/markdown';

function InlineNodes({ nodes }: { nodes: Inline[] }) {
  return (
    <>
      {nodes.map((n, i) => {
        if (n.type === 'code') {
          return <code key={i} className="font-mono text-[0.88em] px-1 py-px border border-border break-words">{n.text}</code>;
        }
        if (n.type === 'strong') {
          return <strong key={i} className="font-semibold text-text">{n.text}</strong>;
        }
        if (n.type === 'link') {
          return <a key={i} href={n.href} className="text-text underline underline-offset-4 decoration-text-secondary hover:decoration-text">{n.text}</a>;
        }
        return <span key={i}>{n.text}</span>;
      })}
    </>
  );
}

export default function Prose({ blocks }: { blocks: Block[] }) {
  return (
    <div className="flex flex-col gap-5 text-[17px] leading-[1.7] text-text">
      {blocks.map((b, i) => {
        if (b.type === 'heading') {
          return b.level === 2 ? (
            <h2
              key={i}
              id={b.id}
              className="mt-9 font-display text-[clamp(1.625rem,1.2rem+1vw,1.875rem)] leading-[1.15] text-text text-balance scroll-mt-8"
            >
              {b.text}
            </h2>
          ) : (
            <h3 key={i} id={b.id} className="mt-4 font-display text-[21px] leading-snug text-text text-balance scroll-mt-8">
              {b.text}
            </h3>
          );
        }
        if (b.type === 'code') {
          return (
            <pre
              key={i}
              tabIndex={0}
              aria-label={b.lang ? `${b.lang} code` : 'Code'}
              className="overflow-x-auto border border-border bg-surface/60 p-4 font-mono text-[14px] leading-[1.6]"
            >
              <code>{b.text}</code>
            </pre>
          );
        }
        if (b.type === 'list') {
          const ListTag = b.ordered ? 'ol' : 'ul';
          return (
            <ListTag
              key={i}
              className={`flex flex-col gap-2 pl-6 marker:text-text-secondary ${b.ordered ? 'list-decimal' : 'list-disc'}`}
            >
              {b.items.map((item, j) => <li key={j} className="pl-1"><InlineNodes nodes={item} /></li>)}
            </ListTag>
          );
        }
        return <p key={i}><InlineNodes nodes={b.content} /></p>;
      })}
    </div>
  );
}
