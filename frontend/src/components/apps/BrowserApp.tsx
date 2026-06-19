'use client';

/**
 * BrowserApp — a minimal browser inside devOS.
 *
 * Single clean view (no tab strip): back / forward / reload, one pill address
 * bar with a lock glyph, a thin top loading line, and a quiet start-page grid.
 *
 * Hybrid content: allow-listed sites (Devanshu's own) render live in a
 * sandboxed iframe; everything else gets a graceful "open in new tab" card so a
 * frame is never blank. The decision lives in lib/browser.ts.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, RotateCw, Lock, Globe, ExternalLink, Compass } from 'lucide-react';
import { useTheme } from '@/store/themeStore';
import { cn } from '@/lib/utils';
import {
  START_URL,
  START_LINKS,
  normalizeUrl,
  hostOf,
  isEmbeddableUrl,
  isSecure,
} from '@/lib/browser';

export default function BrowserApp() {
  const { mode } = useTheme();
  const isDark = mode === 'dark';
  const reduced = useReducedMotion();

  // History stack with a cursor, so back/forward are pure index moves.
  const [history, setHistory] = useState<string[]>([START_URL]);
  const [cursor, setCursor] = useState(0);
  const [inputUrl, setInputUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const url = history[cursor];
  const canBack = cursor > 0;
  const canForward = cursor < history.length - 1;
  const onStart = url === START_URL;
  const embeddable = !onStart && isEmbeddableUrl(url);

  // Keep the address bar in sync with the active page (blank on the start page).
  useEffect(() => {
    setInputUrl(onStart ? '' : url);
  }, [url, onStart]);

  const go = useCallback((raw: string) => {
    const next = normalizeUrl(raw);
    setHistory((h) => [...h.slice(0, cursorRef.current + 1), next]);
    setCursor((c) => c + 1);
    setIsLoading(next !== START_URL && isEmbeddableUrl(next));
  }, []);

  // cursor in a ref so `go` can truncate forward history without a stale closure.
  const cursorRef = useRef(cursor);
  useEffect(() => { cursorRef.current = cursor; }, [cursor]);

  const back = useCallback(() => {
    setCursor((c) => {
      const n = Math.max(0, c - 1);
      const target = history[n];
      setIsLoading(target !== START_URL && isEmbeddableUrl(target));
      return n;
    });
  }, [history]);

  const forward = useCallback(() => {
    setCursor((c) => {
      const n = Math.min(history.length - 1, c + 1);
      const target = history[n];
      setIsLoading(target !== START_URL && isEmbeddableUrl(target));
      return n;
    });
  }, [history]);

  const reload = useCallback(() => {
    if (onStart) return;
    setReloadKey((k) => k + 1);
    if (embeddable) setIsLoading(true);
  }, [onStart, embeddable]);

  // Safety net: never let the loading line spin forever if onLoad never fires
  // (some pages, or a cross-origin block, won't report load).
  useEffect(() => {
    if (!isLoading) return;
    const t = setTimeout(() => setIsLoading(false), 3500);
    return () => clearTimeout(t);
  }, [isLoading, url, reloadKey]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputUrl.trim()) go(inputUrl);
  };

  // Theme tokens, kept close to the Window / dock glass language.
  const chrome = isDark ? 'bg-[#1c1c1e]/80 border-white/10' : 'bg-[#f6f6f7]/90 border-black/8';
  const pill = isDark ? 'bg-white/8 text-white/85' : 'bg-black/5 text-gray-800';
  const iconBtn = isDark
    ? 'text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-25 disabled:hover:bg-transparent'
    : 'text-gray-500 hover:text-gray-900 hover:bg-black/5 disabled:opacity-25 disabled:hover:bg-transparent';

  return (
    <div className={cn('flex flex-col h-full w-full', isDark ? 'bg-[#101012]' : 'bg-white')}>
      {/* Toolbar */}
      <div className={cn('flex items-center gap-1.5 px-2.5 py-2 border-b backdrop-blur-xl', chrome)}>
        <NavButton label="Back" onClick={back} disabled={!canBack} className={iconBtn}>
          <ArrowLeft size={16} />
        </NavButton>
        <NavButton label="Forward" onClick={forward} disabled={!canForward} className={iconBtn}>
          <ArrowRight size={16} />
        </NavButton>
        <NavButton label="Reload" onClick={reload} disabled={onStart} className={iconBtn}>
          <RotateCw size={15} />
        </NavButton>

        <form onSubmit={submit} className="flex-1">
          <div className={cn('flex items-center gap-2 px-3 h-8 rounded-full text-[13px] transition-colors', pill)}>
            {onStart ? (
              <Compass size={13} className="opacity-50 flex-shrink-0" />
            ) : isSecure(url) ? (
              <Lock size={12} className="opacity-50 flex-shrink-0" />
            ) : (
              <Globe size={12} className="opacity-50 flex-shrink-0" />
            )}
            <input
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              onFocus={(e) => e.currentTarget.select()}
              placeholder="Search or enter a site"
              spellCheck={false}
              autoComplete="off"
              className="flex-1 bg-transparent outline-none placeholder:opacity-40 min-w-0"
            />
          </div>
        </form>
      </div>

      {/* Thin loading line */}
      <div className="relative h-0.5 w-full overflow-hidden">
        {isLoading && (
          <motion.div
            className="absolute inset-y-0 bg-accent"
            style={reduced ? { left: 0, right: 0 } : { width: '34%' }}
            animate={reduced ? undefined : { left: ['-34%', '100%'] }}
            transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 relative">
        {onStart ? (
          <StartPage isDark={isDark} reduced={!!reduced} onOpen={go} />
        ) : embeddable ? (
          <iframe
            key={`${url}#${reloadKey}`}
            src={url}
            title={hostOf(url) ?? 'Browser'}
            onLoad={() => setIsLoading(false)}
            loading="lazy"
            referrerPolicy="no-referrer"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            className="w-full h-full border-0 bg-white"
          />
        ) : (
          <BlockedCard url={url} isDark={isDark} reduced={!!reduced} />
        )}
      </div>
    </div>
  );
}

function NavButton({
  children, label, onClick, disabled, className,
}: {
  children: React.ReactNode; label: string; onClick: () => void; disabled?: boolean; className: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={cn('grid place-items-center w-8 h-8 rounded-lg transition-colors', className)}
    >
      {children}
    </button>
  );
}

function StartPage({
  isDark, reduced, onOpen,
}: {
  isDark: boolean; reduced: boolean; onOpen: (url: string) => void;
}) {
  return (
    <div className="h-full w-full overflow-auto grid place-items-center p-8">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="inline-grid place-items-center w-12 h-12 rounded-2xl bg-accent/12 mb-3">
            <Compass size={22} className="text-accent" />
          </div>
          <h2 className={cn('text-base font-semibold', isDark ? 'text-white/90' : 'text-gray-900')}>
            devOS Browser
          </h2>
          <p className={cn('text-[13px] mt-1', isDark ? 'text-white/45' : 'text-gray-500')}>
            My work, live. Anything else opens in a new tab.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {START_LINKS.map((link, i) => (
            <motion.button
              key={link.url}
              type="button"
              onClick={() => onOpen(link.url)}
              initial={reduced ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: reduced ? 0 : i * 0.04, ease: 'easeOut' }}
              className={cn(
                'text-left rounded-xl border p-4 transition-colors',
                isDark
                  ? 'border-white/8 hover:border-white/16 hover:bg-white/[0.04]'
                  : 'border-black/8 hover:border-black/16 hover:bg-black/[0.02]'
              )}
            >
              <div className={cn('text-sm font-medium', isDark ? 'text-white/90' : 'text-gray-900')}>
                {link.label}
              </div>
              <div className={cn('text-[12px] mt-0.5', isDark ? 'text-white/45' : 'text-gray-500')}>
                {link.note}
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}

function BlockedCard({ url, isDark, reduced }: { url: string; isDark: boolean; reduced: boolean }) {
  const host = hostOf(url) ?? url;
  return (
    <div className="h-full w-full grid place-items-center p-8">
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className={cn(
          'w-full max-w-sm text-center rounded-2xl border p-7',
          isDark ? 'border-white/10 bg-white/[0.03]' : 'border-black/8 bg-black/[0.015]'
        )}
      >
        <div className="inline-grid place-items-center w-12 h-12 rounded-2xl bg-accent/12 mb-4">
          <Globe size={22} className="text-accent" />
        </div>
        <div className={cn('text-sm font-medium', isDark ? 'text-white/90' : 'text-gray-900')}>
          {host} can&apos;t be embedded
        </div>
        <p className={cn('text-[13px] mt-1.5 leading-relaxed', isDark ? 'text-white/50' : 'text-gray-500')}>
          Most sites block being shown inside another page. Open it in a real tab instead.
        </p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 mt-5 px-3.5 py-2 rounded-lg text-[13px] font-medium
                     bg-accent text-white hover:opacity-90 active:scale-[0.98] transition"
        >
          Open in new tab <ExternalLink size={14} />
        </a>
      </motion.div>
    </div>
  );
}
