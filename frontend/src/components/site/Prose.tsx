/**
 * Renders a parsed /writing post body (lib/markdown.ts). Server component,
 * no motion. External links open in place, like every other link on the
 * plain pages.
 */

import type { Block, Inline } from '@/lib/markdown';

function InlineNodes({ nodes }: { nodes: Inline[] }) {
  return (
    <>
      {nodes.map((n, i) => {
        if (n.type === 'code') {
          return <code key={i} className="font-mono text-[0.9em] px-1 py-px border border-border">{n.text}</code>;
        }
        if (n.type === 'link') {
          return <a key={i} href={n.href} className="text-text underline underline-offset-4">{n.text}</a>;
        }
        return <span key={i}>{n.text}</span>;
      })}
    </>
  );
}

export default function Prose({ blocks }: { blocks: Block[] }) {
  return (
    <div className="flex flex-col gap-5 text-[17px] leading-relaxed">
      {blocks.map((b, i) => {
        if (b.type === 'heading') {
          return (
            <h2 key={i} id={b.id} className="mt-8 font-display text-[26px] leading-tight text-text scroll-mt-8">
              {b.text}
            </h2>
          );
        }
        if (b.type === 'list') {
          return (
            <ul key={i} className="flex flex-col gap-2 pl-5 list-disc marker:text-text-secondary">
              {b.items.map((item, j) => <li key={j}><InlineNodes nodes={item} /></li>)}
            </ul>
          );
        }
        return <p key={i}><InlineNodes nodes={b.content} /></p>;
      })}
    </div>
  );
}
