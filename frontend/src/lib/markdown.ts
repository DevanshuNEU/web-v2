/**
 * The small markdown subset the /writing posts use, parsed into plain data so
 * a server component can render it without a markdown dependency.
 *
 * Fenced code blocks (``` with an optional language) are lifted out first, so
 * blank lines inside them survive. Everything else is split into blocks on
 * blank lines: "## " and "### " start headings, a block whose lines all start
 * with "- " is a bulleted list, one whose lines all start with "1. " (any
 * number) is a numbered list, anything else is a paragraph (its lines joined
 * with spaces). Inline, `code`, **bold** and [text](https://url) are
 * recognised; everything else is literal text. A single "#" is not supported:
 * the page owns the h1.
 */

export type Inline =
  | { type: 'text'; text: string }
  | { type: 'code'; text: string }
  | { type: 'strong'; text: string }
  | { type: 'link'; text: string; href: string };

export type Block =
  | { type: 'heading'; level: 2 | 3; id: string; text: string }
  | { type: 'paragraph'; content: Inline[] }
  | { type: 'list'; ordered: boolean; items: Inline[][] }
  | { type: 'code'; lang: string | null; text: string };

const INLINE = /`([^`]+)`|\*\*([^*]+)\*\*|\[([^\]]+)\]\((https:\/\/[^)\s]+)\)/g;
const FENCE = /^```([\w+-]*)[ \t]*\n([\s\S]*?)\n```[ \t]*$/gm;
const ORDERED_ITEM = /^\d+\.\s+/;

export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  for (const m of text.matchAll(INLINE)) {
    const at = m.index ?? 0;
    if (at > last) out.push({ type: 'text', text: text.slice(last, at) });
    if (m[1] !== undefined) out.push({ type: 'code', text: m[1] });
    else if (m[2] !== undefined) out.push({ type: 'strong', text: m[2] });
    else out.push({ type: 'link', text: m[3], href: m[4] });
    last = at + m[0].length;
  }
  if (last < text.length) out.push({ type: 'text', text: text.slice(last) });
  return out;
}

/** Heading text to a URL fragment: "About those labels" to "about-those-labels". */
export function headingId(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function parseTextBlock(block: string): Block {
  for (const [marker, level] of [['### ', 3], ['## ', 2]] as const) {
    if (block.startsWith(marker)) {
      const text = block.slice(marker.length).trim();
      return { type: 'heading', level, id: headingId(text), text };
    }
  }
  const lines = block.split('\n').map(l => l.trim());
  if (lines.every(l => l.startsWith('- '))) {
    return { type: 'list', ordered: false, items: lines.map(l => parseInline(l.slice(2))) };
  }
  if (lines.every(l => ORDERED_ITEM.test(l))) {
    return { type: 'list', ordered: true, items: lines.map(l => parseInline(l.replace(ORDERED_ITEM, ''))) };
  }
  return { type: 'paragraph', content: parseInline(lines.join(' ')) };
}

function parseTextBlocks(md: string): Block[] {
  return md
    .split(/\n\s*\n/)
    .map(b => b.trim())
    .filter(Boolean)
    .map(parseTextBlock);
}

export function parseMarkdown(md: string): Block[] {
  const src = md.replace(/\r\n/g, '\n');
  const out: Block[] = [];
  let last = 0;
  for (const m of src.matchAll(FENCE)) {
    const at = m.index ?? 0;
    out.push(...parseTextBlocks(src.slice(last, at)));
    out.push({ type: 'code', lang: m[1] || null, text: m[2] });
    last = at + m[0].length;
  }
  out.push(...parseTextBlocks(src.slice(last)));
  return out;
}

/** Word count of the rendered text, for JSON-LD and reading time. */
export function wordCount(md: string): number {
  return md
    .replace(/^```.*$/gm, ' ')
    .replace(/\]\(https:\/\/[^)\s]+\)/g, ' ')
    .replace(/^\s*(###|##|-|\d+\.)\s+/gm, '')
    .replace(/[`[\]*]/g, '')
    .split(/\s+/)
    .filter(Boolean).length;
}

/** Minutes to read at about 200 words a minute, never less than one. */
export function readingMinutes(md: string): number {
  return Math.max(1, Math.round(wordCount(md) / 200));
}
