'use client';

import { Lock } from 'lucide-react';
import { STORY, type StoryEntry } from '../sim/story';
import { storyText } from '../story/text';
import type { Progress } from './progress';
import { PixelButton, PixelPanel } from './pixelUi';
import { RELEASED_CHAPTERS, released } from './release';

/** mm:ss for a best time. */
export function clock(s: number | null): string {
  if (s == null) return '';
  const m = Math.floor(s / 60), r = Math.floor(s % 60);
  return `${m}:${String(r).padStart(2, '0')}`;
}

/** The short tag on a level tile: its number, or Boss and Finale for the fights. */
export function levelTag(id: string): string {
  if (id === 'season-boss') return 'Finale';
  if (id.endsWith('-boss')) return 'Boss';
  return id;
}

/** A level is open once it is released and the one before it is cleared (the first always). */
export function levelOpen(p: Progress, e: StoryEntry, order: readonly StoryEntry[]): boolean {
  if (!released(e)) return false;
  const i = order.indexOf(e);
  return i <= 0 || !!p.levels[order[i - 1].id];
}

/**
 * The chapter map: each chapter with its levels, memories found (0 to 3)
 * and the best time. Levels not reached are locked silhouettes; chapters
 * not released yet say Coming soon and tease their level names.
 */
export function StoryMap({ progress, onPlay, onBack, overrides }: {
  progress: Progress; onPlay: (id: string) => void; onBack: () => void; overrides?: Record<string, string>;
}) {
  const chapters = [...new Set(STORY.filter(e => e.id !== 'secret').map(e => e.world))];
  return (
    <div className="pointer-events-auto absolute inset-0 z-10 flex flex-col items-center gap-3 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-14">
      <h2 className="font-mono text-[15px] uppercase tracking-[0.3em] text-[#fff4e8]">Chapters</h2>
      <div className="flex w-full max-w-[34rem] flex-col gap-3">
        {chapters.map(ch => (
          <PixelPanel key={ch} className="p-3" data-testid={`chapter-${ch}`}>
            <div className="mb-2 flex items-center justify-between gap-2 font-mono text-[11px] uppercase tracking-[0.25em] text-[#9d8fd6]">
              <span>Chapter {ch}{storyText(`chapter-${ch}`, overrides) ? `, ${storyText(`chapter-${ch}`, overrides)}` : ''}</span>
              {ch > RELEASED_CHAPTERS && (
                <span className="shrink-0 border border-[#ffcf7a]/60 px-1.5 py-0.5 text-[9px] tracking-[0.2em] text-[#ffcf7a]">Coming soon</span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {STORY.filter(e => e.world === ch && e.id !== 'secret').map(e => {
                const open = levelOpen(progress, e, STORY);
                const lp = progress.levels[e.id];
                const found = lp ? lp.memories.length : 0;
                return open ? (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => onPlay(e.id)}
                    aria-label={`Level ${e.id}, ${e.name}${lp ? `, ${found} of 3 memories, best ${clock(lp.best)}` : ''}`}
                    className="flex min-h-[4.5rem] flex-col items-start gap-1 border-2 border-[#ff3d9a]/70 bg-[#1a0a18]/80 p-2 text-left transition-transform duration-100 active:scale-[0.97] focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_#3df2ff]"
                  >
                    <span className="font-mono text-[13px] uppercase text-[#ffe0ef]">{levelTag(e.id)}</span>
                    <span className="line-clamp-2 font-mono text-[10px] uppercase leading-tight tracking-wider text-[#d8c8e8]">{e.name}</span>
                    <span className="mt-auto flex w-full items-center justify-between font-mono text-[10px] text-[#ffcf7a]">
                      <span aria-hidden>{[0, 1, 2].map(i => (i < found ? '■' : '□')).join(' ')}</span>
                      <span>{clock(lp?.best ?? null)}</span>
                    </span>
                  </button>
                ) : (
                  <div key={e.id} aria-label={`Level ${e.id}, ${ch > RELEASED_CHAPTERS ? `${e.name}, coming soon` : 'locked'}`} className="flex min-h-[4.5rem] flex-col items-start gap-1 border-2 border-[#2a2448] bg-[#0a0816]/80 p-2 text-[#3a3460]">
                    <span className="font-mono text-[13px] uppercase">{levelTag(e.id)}</span>
                    {ch > RELEASED_CHAPTERS && <span className="line-clamp-2 font-mono text-[10px] uppercase leading-tight tracking-wider text-[#5a5288]">{e.name}</span>}
                    <Lock size={14} aria-hidden className="mt-auto" />
                  </div>
                );
              })}
            </div>
          </PixelPanel>
        ))}
      </div>
      <PixelButton onClick={onBack}>Back</PixelButton>
    </div>
  );
}
