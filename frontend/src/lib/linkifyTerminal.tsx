/**
 * linkifyTerminal — turn plain terminal output lines into rendered nodes with
 * clickable, keyboard-focusable links, while preserving every space exactly so
 * the surrounding `whitespace-pre` alignment (ASCII boxes, neofetch columns)
 * is never disturbed.
 *
 * The matcher is deliberately conservative: it anchors on URL schemes, a small
 * set of known bare hosts, and emails. Box-drawing glyphs (║ │ ╔ ╚ └ ┌ ─) are
 * never matched because none of the alternatives can start on one.
 */

import React from 'react';

/**
 * One regex, three alternatives:
 *   1. Full URL:    https?://...
 *   2. Bare host:   one of a fixed set of known domains, plus any trailing path
 *   3. Email:       local@domain.tld
 * Global + case-insensitive so we can walk every match on a line.
 */
const LINK_RE = new RegExp(
  [
    'https?:\\/\\/\\S+',
    '(?:opencodeintel\\.com|getsaar\\.com|devanshuchicholikar\\.com|github\\.com\\/\\S+|linkedin\\.com\\/\\S+)\\S*',
    '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}',
  ].join('|'),
  'gi',
);

/** Trailing punctuation that should not be part of a link target. */
const TRAILING_PUNCT = /[.,;:!?)\]}'"]+$/;

const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

function hrefFor(match: string): { href: string; external: boolean } {
  if (EMAIL_RE.test(match)) {
    return { href: `mailto:${match}`, external: false };
  }
  if (/^https?:\/\//i.test(match)) {
    return { href: match, external: true };
  }
  // Bare domain → assume https.
  return { href: `https://${match}`, external: true };
}

/**
 * Render a single plain output line. Splits on URLs/emails and returns the text
 * with anchor elements for the links and plain strings between them, so the
 * spacing of the original line is preserved byte-for-byte.
 */
export function renderLine(line: string, mono: boolean): React.ReactNode {
  const linkClass = mono
    ? 'underline decoration-white/25 underline-offset-2 hover:decoration-white/70 hover:text-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-white/60 transition-colors duration-150 rounded-[1px]'
    : 'text-green-300 hover:text-green-200 underline decoration-green-300/30 underline-offset-2 focus-visible:outline focus-visible:outline-1 focus-visible:outline-green-300/60 transition-colors duration-150 rounded-[1px]';

  const segments: React.ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;

  LINK_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = LINK_RE.exec(line)) !== null) {
    const raw = m[0];
    const start = m.index;

    // Trim trailing punctuation off the match, leaving it as plain text.
    const trimmed = raw.replace(TRAILING_PUNCT, '');
    if (trimmed === '') {
      // Pure-punctuation match (shouldn't happen given the regex) — skip.
      continue;
    }

    // Text before the link.
    if (start > lastIndex) {
      segments.push(line.slice(lastIndex, start));
    }

    const { href, external } = hrefFor(trimmed);
    segments.push(
      <a
        key={`lnk-${key++}`}
        href={href}
        className={linkClass}
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      >
        {trimmed}
      </a>,
    );

    // The trailing punctuation we trimmed stays as plain text.
    const punct = raw.slice(trimmed.length);
    if (punct) segments.push(punct);

    lastIndex = start + raw.length;
  }

  // Remaining tail after the last link.
  if (lastIndex < line.length) {
    segments.push(line.slice(lastIndex));
  }

  // No links found → return the original string untouched.
  if (segments.length === 0) return line;

  return <>{segments.map((seg, i) => <React.Fragment key={i}>{seg}</React.Fragment>)}</>;
}
