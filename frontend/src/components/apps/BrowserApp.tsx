'use client';

/**
 * BrowserApp - a minimal browser inside devOS, in the monochrome editorial
 * register.
 *
 * Single clean view (no tab strip): back / forward / reload, one hairline-
 * underline address field with a lock glyph, a thin monochrome progress line,
 * and a start page of hairline rows.
 *
 * What it shows in the window: pages from this site (/writing, /projects,
 * /resume, /about) in a same-origin iframe, which the site's
 * `X-Frame-Options: SAMEORIGIN` header allows. Other sites block framing, so
 * their start rows are plain links that open a new tab, and an address typed
 * for one gets an "opens in a new tab" card. The decision lives in
 * lib/browser.ts.
 *
 * Layout keys off the window (container queries on .app-content), never the
 * viewport. On the phone (variant="mobile") the toolbar is dropped: the phone
 * already has a browser, so every row opens a real tab.
 *
 * Motion: back / forward / reload are high-frequency, so they never animate
 * an entrance, only a reduced-motion-gated :active press. The start rows
 * stagger in once on mount. The loading line is linear, ink only.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, RotateCw, Lock, Globe, ExternalLink, Compass } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMono } from '@/hooks/usePalette';
import { Hairline } from '@/components/editorial';
import { Dither } from '@/components/signature';
import { reveal } from '@/lib/motion';
import {
  START_URL,
  SITE_LINKS,
  EXTERNAL_LINKS,
  normalizeUrl,
  hostOf,
  isEmbeddableUrl,
  isSecure,
  type StartLink,
} from '@/lib/browser';

/* Strong ease-out (Emil): "starts fast, feels responsive" for press feedback. */
const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];

/** History entry for input that is not a site address (a search phrase). */
const INVALID_PREFIX = 'about:invalid#';

function currentOrigin(): string | undefined {
  return typeof window === 'undefined' ? undefined : window.location.origin;
}

/** What the address bar shows for an entry. */
function displayUrl(url: string): string {
  if (url === START_URL) return '';
  if (url.startsWith(INVALID_PREFIX)) return decodeURIComponent(url.slice(INVALID_PREFIX.length));
  return url;
}

export default function BrowserApp({ variant = 'desktop' }: { variant?: 'desktop' | 'mobile' } = {}) {
  const mono = useIsMono();
  const reduced = useReducedMotion();
  const origin = currentOrigin();

  // History stack with a cursor, so back/forward are pure index moves.
  const [history, setHistory] = useState<string[]>([START_URL]);
  const [cursor, setCursor] = useState(0);
  const [inputUrl, setInputUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const frameRef = useRef<HTMLIFrameElement>(null);

  const url = history[cursor];
  const canBack = cursor > 0;
  const canForward = cursor < history.length - 1;
  const onStart = url === START_URL;
  const invalid = url.startsWith(INVALID_PREFIX);
  const embeddable = !onStart && !invalid && isEmbeddableUrl(url, origin);

  // Keep the address bar in sync with the active page (blank on the start page).
  useEffect(() => {
    setInputUrl(displayUrl(url));
  }, [url]);

  const willLoad = useCallback(
    (target: string) => target !== START_URL && isEmbeddableUrl(target, currentOrigin()),
    [],
  );

  const go = useCallback((raw: string) => {
    const next = normalizeUrl(raw, currentOrigin()) ?? `${INVALID_PREFIX}${encodeURIComponent(raw.trim())}`;
    setHistory((h) => [...h.slice(0, cursor + 1), next]);
    setCursor(cursor + 1);
    setIsLoading(willLoad(next));
  }, [cursor, willLoad]);

  const back = useCallback(() => {
    const n = Math.max(0, cursor - 1);
    setCursor(n);
    setIsLoading(willLoad(history[n]));
  }, [cursor, history, willLoad]);

  const forward = useCallback(() => {
    const n = Math.min(history.length - 1, cursor + 1);
    setCursor(n);
    setIsLoading(willLoad(history[n]));
  }, [cursor, history, willLoad]);

  const reload = useCallback(() => {
    if (!embeddable) return;
    setReloadKey((k) => k + 1);
    setIsLoading(true);
  }, [embeddable]);

  // Safety net: never let the loading line spin forever if onLoad never fires.
  useEffect(() => {
    if (!isLoading) return;
    const t = setTimeout(() => setIsLoading(false), 3500);
    return () => clearTimeout(t);
  }, [isLoading, url, reloadKey]);

  // A link clicked inside the frame navigates the frame. Read where it went
  // (same origin, so readable) and keep the address bar honest. A link back to
  // the desktop ("/") would nest devOS in itself, so it returns to the start page.
  const onFrameLoad = useCallback(() => {
    setIsLoading(false);
    let loc: Location | undefined;
    try {
      loc = frameRef.current?.contentWindow?.location;
    } catch {
      return;
    }
    if (!loc || loc.href === 'about:blank') return;
    const here = loc.pathname === '/' ? START_URL : loc.href;
    setHistory((h) => {
      if (h[cursor] === here) return h;
      const copy = [...h];
      copy[cursor] = here;
      return copy;
    });
  }, [cursor]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputUrl.trim()) go(inputUrl);
  };

  if (variant === 'mobile') {
    return (
      <div className="h-full w-full overflow-y-auto bg-bg">
        <StartPage reduced={reduced} onOpen={go} openSiteInNewTab />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col bg-bg">
      {/* ── Toolbar ── hairline-bounded editorial chrome. ── */}
      <div className="flex items-center gap-1 border-b border-border px-2.5 py-2">
        <NavButton label="Back" onClick={back} disabled={!canBack} reduced={reduced}>
          <ArrowLeft size={16} />
        </NavButton>
        <NavButton label="Forward" onClick={forward} disabled={!canForward} reduced={reduced}>
          <ArrowRight size={16} />
        </NavButton>
        <NavButton label="Reload" onClick={reload} disabled={!embeddable} reduced={reduced}>
          <RotateCw size={15} />
        </NavButton>

        {/* Address bar: a clean field on a hairline underline that thickens on focus. */}
        <form onSubmit={submit} className="ml-1.5 min-w-0 flex-1">
          <div
            className="flex items-center gap-2 border-b border-border px-1 py-1.5 transition-[border-color,box-shadow]
                       focus-within:border-text focus-within:shadow-[0_1px_0_0_rgb(var(--color-text))]"
          >
            {onStart || invalid ? (
              <Compass size={13} className="shrink-0 text-text-secondary" aria-hidden />
            ) : isSecure(url) ? (
              <Lock size={12} className="shrink-0 text-text-secondary" aria-hidden />
            ) : (
              <Globe size={12} className="shrink-0 text-text-secondary" aria-hidden />
            )}
            <input
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              onFocus={(e) => e.currentTarget.select()}
              placeholder="Enter a site address"
              spellCheck={false}
              autoComplete="off"
              aria-label="Address"
              className="min-w-0 flex-1 bg-transparent font-mono text-[0.8125rem] text-text
                         outline-none placeholder:text-text-tertiary"
            />
          </div>
        </form>
      </div>

      {/* ── Progress line ── monochrome ink, opacity-only, calm, never accent. ── */}
      <div className="relative h-px w-full overflow-hidden bg-transparent" aria-hidden>
        {isLoading && (
          <motion.div
            className="absolute inset-y-0 left-0 bg-text"
            style={reduced ? { left: 0, right: 0, opacity: 0.35 } : { width: '32%', opacity: 0.55 }}
            animate={reduced ? undefined : { transform: ['translateX(-100%)', 'translateX(312.5%)'] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }}
          />
        )}
      </div>

      {/* ── Content ── */}
      <div className="relative min-h-0 flex-1" aria-busy={isLoading}>
        {onStart ? (
          <div className="h-full w-full overflow-y-auto">
            <StartPage reduced={reduced} onOpen={go} />
          </div>
        ) : invalid ? (
          <NotAnAddressCard query={displayUrl(url)} reduced={reduced} />
        ) : embeddable ? (
          <iframe
            ref={frameRef}
            key={`${url}#${reloadKey}`}
            src={url}
            title={new URL(url).pathname.replace(/^\//, '') || 'Page'}
            onLoad={onFrameLoad}
            className="h-full w-full border-0 bg-bg"
          />
        ) : (
          <BlockedCard url={url} mono={mono} reduced={reduced} />
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */
/* Nav button - high-frequency action: instant, press-only feedback     */
/* ─────────────────────────────────────────────────────────────────── */

function NavButton({
  children, label, onClick, disabled, reduced,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  reduced: boolean | null;
}) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      whileTap={reduced ? undefined : { scale: 0.97 }}
      transition={{ duration: 0.1, ease: EASE_OUT }}
      className="grid h-8 w-8 place-items-center text-text-secondary transition-colors
                 hover:text-text disabled:opacity-40 disabled:hover:text-text-secondary"
    >
      {children}
    </motion.button>
  );
}

/* ─────────────────────────────────────────────────────────────────── */
/* Start page - two hairline lists: pages shown here, sites in a new tab */
/* ─────────────────────────────────────────────────────────────────── */

function StartPage({
  reduced, onOpen, openSiteInNewTab = false,
}: {
  reduced: boolean | null;
  onOpen: (url: string) => void;
  /** Phone: the site pages open a real tab too (no in-app frame). */
  openSiteInNewTab?: boolean;
}) {
  return (
    <motion.div
      variants={reveal.container(reduced)}
      initial="hidden"
      animate="show"
      className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-5 py-6 [@container(min-width:640px)]:px-8 [@container(min-width:640px)]:py-8"
    >
      <motion.p variants={reveal.item(reduced)} className="max-w-[60ch] text-sm leading-relaxed text-text-secondary">
        {openSiteInNewTab
          ? 'Pages from this site and my other sites. Each opens in a new tab.'
          : 'Pages from this site open here. Other sites open in a new tab.'}
      </motion.p>

      <div className="grid grid-cols-1 gap-8 [@container(min-width:820px)]:grid-cols-2 [@container(min-width:820px)]:gap-10">
        <LinkGroup title="On this site" reduced={reduced}>
          {SITE_LINKS.map((link) =>
            openSiteInNewTab ? (
              <ExternalRow key={link.url} link={link} reduced={reduced} />
            ) : (
              <SiteRow key={link.url} link={link} reduced={reduced} onOpen={() => onOpen(link.url)} />
            ),
          )}
        </LinkGroup>
        <LinkGroup title="Elsewhere" reduced={reduced}>
          {EXTERNAL_LINKS.map((link) => (
            <ExternalRow key={link.url} link={link} reduced={reduced} />
          ))}
        </LinkGroup>
      </div>
    </motion.div>
  );
}

function LinkGroup({ title, reduced, children }: { title: string; reduced: boolean | null; children: React.ReactNode }) {
  return (
    <motion.section variants={reveal.item(reduced)} className="flex flex-col">
      <h2 className="font-mono-meta pb-3 text-text-secondary">{title}</h2>
      <Hairline />
      <div className="flex flex-col">{children}</div>
    </motion.section>
  );
}

const ROW_CLASS =
  'group flex min-h-[56px] w-full items-center gap-4 border-b border-border py-3.5 text-left transition-colors';

/** Serif name with a hairline that grows on hover, over a one-line note. */
function RowText({ link, reduced }: { link: StartLink; reduced: boolean | null }) {
  return (
    <span className="flex min-w-0 flex-1 flex-col gap-1">
      <span className="relative inline-block max-w-full self-start">
        <span className="block truncate font-display text-lg leading-tight text-text">{link.label}</span>
        <span
          aria-hidden
          className={cn(
            'block h-px origin-left scale-x-0 bg-text/50 transition-transform duration-200',
            reduced ? '' : '[@media(hover:hover)and(pointer:fine)]:group-hover:scale-x-100',
          )}
        />
      </span>
      <span className="text-sm leading-snug text-text-secondary">{link.note}</span>
    </span>
  );
}

/** A page from this site: opens inside the Browser window. */
function SiteRow({ link, reduced, onOpen }: { link: StartLink; reduced: boolean | null; onOpen: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={onOpen}
      whileTap={reduced ? undefined : { scale: 0.99 }}
      transition={{ duration: 0.12, ease: EASE_OUT }}
      data-testid="start-tile"
      className={ROW_CLASS}
    >
      <RowText link={link} reduced={reduced} />
      <span className="hidden shrink-0 font-mono text-xs text-text-secondary [@container(min-width:480px)]:block">
        {link.url}
      </span>
    </motion.button>
  );
}

/** Another site: a real link that opens a new tab, labeled as such. */
function ExternalRow({ link, reduced }: { link: StartLink; reduced: boolean | null }) {
  const href = link.url;
  const host = hostOf(href) ?? href.replace(/^\//, '');
  return (
    <motion.a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      whileTap={reduced ? undefined : { scale: 0.99 }}
      transition={{ duration: 0.12, ease: EASE_OUT }}
      data-testid="start-tile"
      className={ROW_CLASS}
    >
      <RowText link={link} reduced={reduced} />
      <span className="flex shrink-0 items-center gap-1.5 text-text-secondary transition-colors group-hover:text-text">
        <span className="hidden font-mono text-xs [@container(min-width:480px)]:inline">{host}</span>
        <ExternalLink size={13} aria-hidden />
        <span className="sr-only">(opens in a new tab)</span>
      </span>
    </motion.a>
  );
}

/* ─────────────────────────────────────────────────────────────────── */
/* Cards - an outside site (opens in a new tab) and input that is not    */
/* a site address                                                        */
/* ─────────────────────────────────────────────────────────────────── */

function CardShell({ reduced, children }: { reduced: boolean | null; children: React.ReactNode }) {
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, transform: 'translateY(8px)' }}
      animate={{ opacity: 1, transform: 'translateY(0px)' }}
      transition={{ duration: 0.25, ease: EASE_OUT }}
      className="relative w-full max-w-sm border border-border bg-bg/80 p-7 text-center backdrop-blur-sm"
    >
      <div className="mb-4 inline-grid h-11 w-11 place-items-center border border-border">
        <Globe size={20} className="text-text-secondary" aria-hidden />
      </div>
      {children}
    </motion.div>
  );
}

const CARD_BUTTON =
  'mt-5 inline-flex items-center gap-1.5 border border-text px-3.5 py-2 font-mono text-xs uppercase tracking-wider text-text ' +
  'transition-[transform,background-color,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] ' +
  'hover:bg-text hover:text-bg motion-safe:active:scale-[0.97]';

function BlockedCard({ url, mono, reduced }: { url: string; mono: boolean; reduced: boolean | null }) {
  const host = hostOf(url) ?? url;
  return (
    <div className="relative grid h-full w-full place-items-center overflow-hidden p-8">
      {/* Faint dithered field, mono palette only. Decorative, no animation. */}
      {mono && (
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.06]">
          <Dither
            src="/wallpapers/dark-abstract.png"
            alt=""
            size={140}
            matrix={4}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      <CardShell reduced={reduced}>
        <h2 className="font-display text-lg text-text [overflow-wrap:anywhere]">{host} opens in a new tab</h2>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">
          This site does not allow being shown inside another page.
        </p>
        <a href={url} target="_blank" rel="noopener noreferrer" className={CARD_BUTTON}>
          Open in new tab <ExternalLink size={13} aria-hidden />
        </a>
      </CardShell>
    </div>
  );
}

function NotAnAddressCard({ query, reduced }: { query: string; reduced: boolean | null }) {
  return (
    <div className="relative grid h-full w-full place-items-center overflow-hidden p-8">
      <CardShell reduced={reduced}>
        <h2 className="font-display text-lg text-text">That is not a site address</h2>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">
          Enter one like opencodeintel.com, or a page on this site like /writing.
        </p>
        <a
          href={`https://duckduckgo.com/?q=${encodeURIComponent(query)}`}
          target="_blank"
          rel="noopener noreferrer"
          className={CARD_BUTTON}
        >
          Search the web in a new tab <ExternalLink size={13} aria-hidden />
        </a>
      </CardShell>
    </div>
  );
}
