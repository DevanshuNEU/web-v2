/**
 * Pure logic for the devOS Browser app — no React, no DOM, so it's unit-testable.
 *
 * The browser is a curated minimal hybrid: sites on the allow-list render live
 * in a sandboxed iframe; everything else gets a graceful "open in new tab"
 * card, so a frame is never blank. The allow-list is the security + UX boundary.
 *
 * Only sites verified to permit framing belong here. Most of the web sends
 * X-Frame-Options / frame-ancestors and cannot be embedded; that is by design
 * the fallback path, not a bug.
 */

/**
 * Domains verified to permit framing. Only the portfolio allows it; OpenCodeIntel
 * and Saar send X-Frame-Options / frame-ancestors, so they intentionally fall to
 * the "open in new tab" card rather than rendering a blank/refused iframe. (To
 * embed them too, allow framing in those sites' own response headers, then add
 * them back here.)
 */
export const EMBEDDABLE_HOSTS = [
  'devanshuchicholikar.com',
] as const;

export const START_URL = 'about:home';

export interface StartLink {
  label: string;
  url: string;
  note: string;
}

/** The start-page grid: Devanshu's properties first, then the code. */
export const START_LINKS: StartLink[] = [
  { label: 'OpenCodeIntel', url: 'https://opencodeintel.com', note: 'Production MCP code-intelligence server' },
  { label: 'Saar',          url: 'https://getsaar.com',       note: 'Context-rot coaching for Claude.ai' },
  { label: 'Portfolio',     url: 'https://devanshuchicholikar.com', note: 'This, on the open web' },
  { label: 'GitHub',        url: 'https://github.com/DevanshuNEU', note: 'The code' },
];

/** Turn whatever the user typed into a navigable URL. */
export function normalizeUrl(input: string): string {
  const s = input.trim();
  if (!s) return START_URL;
  if (s === START_URL) return START_URL;
  if (/^https?:\/\//i.test(s)) return s;
  return `https://${s}`;
}

/** Hostname without a leading www., or null if the URL is unparseable. */
export function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

/** Whether a URL may be shown in a live iframe (allow-list match). */
export function isEmbeddableUrl(url: string): boolean {
  const host = hostOf(url);
  if (!host) return false;
  return EMBEDDABLE_HOSTS.some((d) => host === d || host.endsWith(`.${d}`));
}

/** Whether a URL is https (drives the lock glyph). */
export function isSecure(url: string): boolean {
  return /^https:\/\//i.test(url);
}
