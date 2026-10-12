/**
 * The small markdown subset the /writing posts use, parsed into plain data so
 * a server component can render it without a markdown dependency.
 *
 * Blocks are separated by blank lines. A block starting with "## " is a
 * heading, a block whose lines all start with "- " is a list, anything else is
 * a paragraph (its lines joined with spaces). Inline, `code` and
 * [text](https://url) are recognised; everything else is literal text.
 */

export type Inline =
  | { type: 'text'; text: string }
  | { type: 'code'; text: string }
  | { type: 'link'; text: string; href: string };

export type Block =
  | { type: 'heading'; id: string; text: string }
  | { type: 'paragraph'; content: Inline[] }
  | { type: 'list'; items: Inline[][] };

const INLINE = /`([^`]+)`|\[([^\]]+)\]\((https:\/\/[^)\s]+)\)/g;

export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  for (const m of text.matchAll(INLINE)) {
    const at = m.index ?? 0;
    if (at > last) out.push({ type: 'text', text: text.slice(last, at) });
    if (m[1] !== undefined) out.push({ type: 'code', text: m[1] });
    else out.push({ type: 'link', text: m[2], href: m[3] });
    last = at + m[0].length;
  }
  if (last < text.length) out.push({ type: 'text', text: text.slice(last) });
  return out;
}

/** Heading text to a URL fragment: "About those labels" to "about-those-labels". */
export function headingId(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function parseMarkdown(md: string): Block[] {
  return md
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map(b => b.trim())
    .filter(Boolean)
    .map((block): Block => {
      if (block.startsWith('## ')) {
        const text = block.slice(3).trim();
        return { type: 'heading', id: headingId(text), text };
      }
      const lines = block.split('\n').map(l => l.trim());
      if (lines.every(l => l.startsWith('- '))) {
        return { type: 'list', items: lines.map(l => parseInline(l.slice(2))) };
      }
      return { type: 'paragraph', content: parseInline(lines.join(' ')) };
    });
}

/** Word count of the rendered text, for JSON-LD. */
export function wordCount(md: string): number {
  return md
    .replace(/\]\(https:\/\/[^)\s]+\)/g, ' ')
    .replace(/^\s*(##|-)\s+/gm, '')
    .replace(/[`[\]]/g, '')
    .split(/\s+/)
    .filter(Boolean).length;
}
