'use client';

import { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { Hairline, MetaLabel } from '@/components/editorial';
import { Plotter } from '@/components/signature';
import { strokeSet } from '@/lib/signature/plotter';
import { reveal } from '@/lib/motion';
import { bestScore } from './shared/chrome';
import { GAMES, type GameCard, type GameId } from './registry';

// Editorial numbered index: serif game names, a quiet caption line, the best
// score on this device on the right. The games themselves go loud; this list
// stays in the portfolio's voice.

function SelectorEntry({
  card,
  reduced,
  isMobile,
  autoFocus,
  featured,
  onSelect,
}: {
  card: GameCard;
  /** The first game: spans the full width and gets larger type in a wide window. */
  featured: boolean;
  reduced: boolean | null;
  isMobile: boolean;
  /** Focus this row on mount (the game the visitor just left). */
  autoFocus: boolean;
  onSelect: () => void;
}) {
  const best = bestScore(card.hsKey);
  const controls = isMobile ? card.controlsMobile : card.controls;
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (autoFocus) ref.current?.focus({ preventScroll: true }); }, [autoFocus]);
  return (
    <button
      ref={ref}
      type="button"
      onClick={onSelect}
      data-testid="index-row"
      data-featured={featured}
      className={`group relative flex h-full w-full items-baseline gap-4 px-3 py-4 text-left
                  transition-[transform,background-color] duration-150 ease-out
                  hover:bg-black/[0.035] dark:hover:bg-white/[0.05]
                  active:scale-[0.985]`}
    >
      <span className="flex-1 min-w-0">
        <span
          className={`block font-display leading-tight truncate text-text
                      transition-transform duration-150 ease-out
                      ${featured ? 'text-[clamp(1.5rem,4.2cqi,2.6rem)]' : 'text-[clamp(1.25rem,3.4cqi,1.9rem)]'}
                      ${reduced ? '' : 'group-hover:translate-x-0.5'}`}
        >
          {card.title}
        </span>
        <span className="mt-1 block text-sm leading-snug text-text-secondary">{card.subtitle}</span>
        <MetaLabel as="p" className="mt-1.5 text-text-tertiary">{controls}</MetaLabel>
      </span>

      {best > 0 && (
        <span className="shrink-0 self-center flex flex-col items-end gap-0.5">
          <MetaLabel className="text-text tabular-nums">{best}</MetaLabel>
          <MetaLabel className="text-text-tertiary">{`Best ${card.hsLabel}`}</MetaLabel>
        </span>
      )}
    </button>
  );
}

// Masthead button to every leaderboard, so "where do I stand" is answered on
// the first screen instead of below the fold.
function BoardsButton({ autoFocus, onSelect }: { autoFocus: boolean; onSelect: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (autoFocus) ref.current?.focus({ preventScroll: true }); }, [autoFocus]);
  return (
    <button
      ref={ref}
      type="button"
      onClick={onSelect}
      className="inline-flex min-h-11 shrink-0 items-center gap-2 border border-border px-3 text-sm text-text
                 transition-[transform,border-color] duration-150 ease-out hover:border-text/45 active:scale-[0.97]"
    >
      <Trophy size={16} aria-hidden />
      Leaderboards
    </button>
  );
}

export default function Launcher({ onSelect, isMobile, lastGame }: { onSelect: (id: GameId) => void; isMobile: boolean; lastGame: GameId | null }) {
  const reduced = useReducedMotion();

  return (
    <div className="relative h-full flex flex-col overflow-hidden bg-surface/20">
      {/* Faint signature line-mark on the backdrop - hard-gated on the mono
          palette + reduced motion inside Plotter. Decorative, behind content. */}
      <div aria-hidden className="pointer-events-none absolute -right-10 -bottom-16 w-[min(60cqi,28rem)] opacity-[0.06]">
        <Plotter generator={(s) => strokeSet(s, 6)} seed={0xA12C} strokeWidth={1} />
      </div>

      {/* ── Masthead ── serif title + mono spec line ── */}
      {/* One width for the masthead, the rule and the grid, so their edges
          line up; it grows with the window up to about 72rem. */}
      <div className="relative z-10 w-full max-w-3xl [@container(min-width:900px)]:mx-auto [@container(min-width:900px)]:max-w-[72rem] px-6 pt-6 pb-4 flex flex-col gap-3">
        <MetaLabel as="p">Arcade</MetaLabel>
        <div className="flex items-end justify-between gap-4">
          <h1 className="editorial-head text-text leading-[1.05] text-[clamp(1.75rem,7cqi,3.25rem)] [overflow-wrap:normal] [text-wrap:balance]">
            {isMobile ? 'Five small games.' : 'Five games, one window.'}
          </h1>
          <BoardsButton autoFocus={lastGame === 'boards'} onSelect={() => onSelect('boards')} />
        </div>
      </div>

      {/* Rules sit 12px in, the text 24px in, on both the masthead and the list. */}
      <div className="relative z-10 w-full max-w-3xl [@container(min-width:900px)]:mx-auto [@container(min-width:900px)]:max-w-[72rem] px-3">
        <Hairline />
      </div>

      {/* ── Index ── staggers in ONCE on mount (never on scroll) ── */}
      <div className="relative z-10 flex-1 overflow-y-auto px-2 py-1">
        <motion.div
          variants={reveal.container(reduced)}
          initial="hidden"
          animate="show"
          // One column in a narrow window; in a wide one the featured game
          // spans the top and the rest sit in two columns, so the window is
          // used instead of leaving its right half empty.
          className="grid w-full max-w-3xl grid-cols-1 [@container(min-width:900px)]:mx-auto [@container(min-width:900px)]:max-w-[calc(72rem-1rem)] [@container(min-width:900px)]:grid-cols-2 [@container(min-width:900px)]:gap-x-6"
        >
          {GAMES.map((card, i) => (
            <motion.div
              key={card.id}
              variants={reveal.item(reduced)}
              className={`mx-1 border-b border-border ${i === 0 ? '[@container(min-width:900px)]:col-span-2' : ''}`}
            >
              <SelectorEntry
                card={card}
                reduced={reduced}
                isMobile={isMobile}
                featured={i === 0}
                autoFocus={lastGame === card.id}
                onSelect={() => onSelect(card.id)}
              />
            </motion.div>
          ))}

        </motion.div>
      </div>
    </div>
  );
}
