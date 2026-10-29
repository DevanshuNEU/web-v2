/**
 * Pure logic for the devOS Browser app: no React, no DOM, so it's unit-testable.
 *
 * Pages from this site (/writing, /projects, /resume, /about) render live in
 * an iframe: the site sends `X-Frame-Options: SAMEORIGIN` (next.config.ts),
 * which allows a same-origin frame. Other sites send X-Frame-Options or
 * frame-ancestors and cannot be embedded, so they get an "opens in a new tab"
 * card instead of a blank frame.
 *
 * The site root "/" is the desktop itself, so it is never embedded (that would
 * put devOS inside devOS).
 */

export const START_URL = 'about:home';

/** The production hosts of this site; their URLs map to same-origin paths. */
export const SITE_HOSTS = ['devanshuchicholikar.com', 'www.devanshuchicholikar.com'] as const;

export interface StartLink {
  label: string;
  /** A same-origin path ("/writing") for pages shown here, or a full https URL. */
  url: string;
  note: string;
}

/** Pages from this site, shown inside the Browser window. */
export const SITE_LINKS: StartLink[] = [
  { label: 'Writing',  url: '/writing',  note: 'Notes on retrieval, evals and building OpenCodeIntel' },
  { label: 'Projects', url: '/projects', note: 'Every project as a plain page'           },
  { label: 'Resume',   url: '/resume',   note: 'One page, with a PDF download' },
  { label: 'About',    url: '/about',    note: 'Who I am and what I work on' },
];

/** Other sites. They block framing, so they open in a new tab. */
export const EXTERNAL_LINKS: StartLink[] = [
  { label: 'OpenCodeIntel', url: 'https://opencodeintel.com',      note: 'Code search for AI coding agents' },
  { label: 'Saar',          url: 'https://getsaar.com',            note: 'Claude.ai token and cost meter' },
  { label: 'GitHub',        url: 'https://github.com/DevanshuNEU', note: 'The code' },
];

/** Every start-page link, site pages first. */
export const START_LINKS: StartLink[] = [...SITE_LINKS, ...EXTERNAL_LINKS];

/** Whether a string looks like a site address rather than a search phrase. */
function looksLikeAddress(s: string): boolean {
  if (/\s/.test(s)) return false;
  if (/^https?:\/\//i.test(s)) return true;
  if (s.startsWith('/')) return true;
  if (/^localhost(:\d+)?(\/|$)/i.test(s)) return true;
  return /^[^/]+\.[a-z]{2,}(:\d+)?(\/.*)?$/i.test(s);
}

/**
 * Turn whatever the user typed into a navigable URL, resolved against the
 * current origin. Paths ("/writing") and this site's own production URLs
 * become same-origin URLs so they can be framed. Returns null for input that
 * is not a site address (a search phrase like "react hooks").
 */
export function normalizeUrl(input: string, origin?: string): string | null {
  const s = input.trim();
  if (!s || s === START_URL) return START_URL;
  if (!looksLikeAddress(s)) return null;

  if (s.startsWith('/')) {
    return origin ? new URL(s, origin).href : s;
  }

  const withScheme = /^https?:\/\//i.test(s)
    ? s
    : `${/^localhost/i.test(s) ? 'http' : 'https'}://${s}`;

  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    return null;
  }

  if (origin && (SITE_HOSTS as readonly string[]).includes(parsed.hostname.toLowerCase())) {
    return new URL(parsed.pathname + parsed.search + parsed.hash, origin).href;
  }
  return withScheme;
}

/** Hostname without a leading www., or null if the URL is unparseable. */
export function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

/**
 * Whether a URL may be shown in the in-window iframe: same origin as the
 * desktop, and not the desktop itself ("/").
 */
export function isEmbeddableUrl(url: string, origin?: string): boolean {
  if (!origin) return false;
  try {
    const u = new URL(url, origin);
    if (u.origin !== new URL(origin).origin) return false;
    return u.pathname !== '/' && u.pathname !== '';
  } catch {
    return false;
  }
}

/** Whether a start link is a page from this site (a same-origin path). */
export function isSitePath(url: string): boolean {
  return url.startsWith('/');
}

/** Whether a URL is https (drives the lock glyph). */
export function isSecure(url: string): boolean {
  return /^https:\/\//i.test(url);
}
