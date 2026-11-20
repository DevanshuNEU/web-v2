'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Crown, X } from 'lucide-react';
import { OverlayButton } from '../shared/chrome';
import { sfx, buzz } from '../shared/sound';
import {
  checkName, clearCrown, clearName, fetchBoard, isError, saveCrown, saveName, savedCrown, savedName, submitScore,
  type ArcadeGame, type Board, type BoardEntry, type SubmitOk,
} from './api';

const GAME_NAMES: Record<ArcadeGame, string> = {
  snake: 'Sigma Snake',
  platformer: 'Baguettino Run',
  stacker: 'Aura Tower',
};

// First place: a one-shot burst of cast-coloured confetti from the card.
// Under reduced motion it stays as a still scatter.
const CONFETTI_COLORS = ['#ff5fa2', '#ffd23f', '#3ee0ff', '#8cf25a', '#a98bff', '#ff9a3c'];
function Confetti({ reduced }: { reduced: boolean }) {
  const pieces = Array.from({ length: 36 }, (_, i) => {
    const a = (i / 36) * Math.PI * 2 + (i % 3) * 0.3;
    const d = 90 + (i * 37) % 80;
    return { x: Math.cos(a) * d, y: Math.sin(a) * d - 40, r: (i * 47) % 360, c: CONFETTI_COLORS[i % CONFETTI_COLORS.length], w: 6 + (i % 3) * 2 };
  });
  return (
    <div data-testid="confetti" aria-hidden className="pointer-events-none absolute left-1/2 top-1/3 h-0 w-0">
      {pieces.map((p, i) => (
        <motion.span
          key={i}
          className="absolute block rounded-[2px]"
          style={{ width: p.w, height: p.w * 0.45, background: p.c }}
          initial={reduced ? { x: p.x, y: p.y, rotate: p.r, opacity: 1 } : { x: 0, y: 0, rotate: 0, opacity: 1 }}
          animate={reduced ? undefined : { x: p.x, y: [0, p.y, p.y + 160], rotate: p.r + 360, opacity: [1, 1, 0] }}
          transition={reduced ? undefined : { duration: 1.8, ease: 'easeOut', times: [0, 0.35, 1] }}
        />
      ))}
    </div>
  );
}

function fmt(n: number) { return n.toLocaleString('en-US'); }

function ordinalRank(n: number) { return `#${n}`; }

// ─────────────────────────────────────────────────────────────────────────────
// Board list
// ─────────────────────────────────────────────────────────────────────────────

function Row({ e, me }: { e: BoardEntry; me: boolean }) {
  return (
    <li
      className={`flex items-center gap-3 px-3 min-h-11 text-[15px] ${me ? 'bg-white/[0.08] text-text' : 'text-text-secondary'}`}
      aria-current={me ? 'true' : undefined}
    >
      <span className="w-8 shrink-0 tabular-nums text-text-tertiary">{e.rank}</span>
      <span className="flex-1 min-w-0 truncate text-text">
        {e.name}
        {e.crown && <Crown size={14} className="ml-1.5 inline -mt-0.5 text-[#ffd23f]" aria-label="Crowned" />}
      </span>
      <span className="tabular-nums text-text">{fmt(e.score)}</span>
    </li>
  );
}

export function BoardView({ game, name, refreshKey = 0 }: { game: ArcadeGame; name: string | null; refreshKey?: number }) {
  const [tab, setTab] = useState<'week' | 'all'>('week');
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [slow, setSlow] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    const r = await fetchBoard(game, name);
    if (isError(r)) setError(r.error.message); else setBoard(r);
    setLoading(false);
  }, [game, name]);

  useEffect(() => { void load(); }, [load, refreshKey]);
  // Only show the loading line if the fetch is slow, so fast loads don't flash.
  useEffect(() => {
    if (!loading) { setSlow(false); return; }
    const t = setTimeout(() => setSlow(true), 250);
    return () => clearTimeout(t);
  }, [loading]);

  const list = board ? board[tab] : [];
  const mine = board?.me?.[tab] ?? null;
  const meLower = name?.toLowerCase();
  const meInList = !!meLower && list.some(e => e.name.toLowerCase() === meLower);

  return (
    <div className="flex flex-col gap-2 w-full">
      <div role="tablist" aria-label="Leaderboard period" className="flex border border-border self-start">
        {(['week', 'all'] as const).map(t => (
          <button
            key={t}
            role="tab"
            type="button"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`min-h-11 px-4 text-sm transition-colors duration-150 ${tab === t ? 'bg-text text-bg' : 'text-text-secondary hover:text-text'}`}
          >
            {t === 'week' ? 'This week' : 'All time'}
          </button>
        ))}
      </div>

      {loading && !board && slow && <p className="px-1 py-3 text-sm text-text-secondary">Loading the board</p>}
      {error && !loading && (
        <div className="flex flex-col items-start gap-2 py-2">
          <p className="text-sm text-text-secondary">{error}</p>
          <button type="button" onClick={() => void load()} className="min-h-11 text-sm text-text underline underline-offset-4">Load again</button>
        </div>
      )}
      {board && !error && list.length === 0 && (
        <div className="py-3">
          <p className="text-[15px] text-text">{tab === 'week' ? 'No scores this week yet.' : 'No scores yet.'}</p>
          <p className="text-sm text-text-secondary">Finish a round to take first place.</p>
        </div>
      )}
      {board && !error && list.length > 0 && (
        <ol className="flex flex-col divide-y divide-border border-y border-border" aria-label={`${GAME_NAMES[game]}, ${tab === 'week' ? 'this week' : 'all time'}`}>
          {list.map(e => <Row key={`${e.rank}-${e.name}`} e={e} me={!!meLower && e.name.toLowerCase() === meLower} />)}
          {mine && !meInList && board.me && (
            <Row e={{ rank: mine.rank, name: board.me.name, score: mine.score, crown: false }} me />
          )}
        </ol>
      )}
    </div>
  );
}

/** Full-height sheet over a game board, used from the HUD and the game-over card. */
export function BoardSheet({ game, onClose }: { game: ArcadeGame; onClose: () => void }) {
  const reduced = useReducedMotion();
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { closeRef.current?.focus({ preventScroll: true }); }, []);
  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={`${GAME_NAMES[game]} leaderboard`}
      initial={reduced ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
      onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } }}
      className="dark absolute inset-0 z-20 flex flex-col bg-[#0c0a12]/95 backdrop-blur-sm text-text"
    >
      <div className="flex items-center gap-3 px-4 pt-3 pb-2">
        <h2 className="flex-1 font-display text-[22px] leading-tight">{GAME_NAMES[game]}</h2>
        <button ref={closeRef} type="button" onClick={onClose} aria-label="Close leaderboard" className="min-h-11 min-w-11 flex items-center justify-center text-text-secondary hover:text-text">
          <X size={20} />
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 pb-4">
        <BoardView game={game} name={savedName()} />
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Game-over card: post the score, show the rank, celebrate first place
// ─────────────────────────────────────────────────────────────────────────────

type Phase =
  | { kind: 'idle' }
  | { kind: 'name' }
  | { kind: 'rename'; previous: SubmitOk }
  | { kind: 'posting' }
  | { kind: 'done'; result: SubmitOk }
  | { kind: 'error'; message: string; retryable: boolean };

export function RunResult({
  game,
  score,
  getToken,
  onPlayAgain,
  onShowBoard,
  mono,
  accent,
  accentHover,
  playAgainLabel = 'Play again',
}: {
  game: ArcadeGame;
  score: number;
  /** Resolves to this round's start token, or null when the board is unreachable. */
  getToken: () => Promise<string | null>;
  onPlayAgain: () => void;
  onShowBoard: () => void;
  mono: boolean;
  accent?: string;
  accentHover?: string;
  playAgainLabel?: string;
}) {
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [draft, setDraft] = useState(() => savedName() ?? '');
  const [nameError, setNameError] = useState<string | null>(null);
  const tokenRef = useRef<string | null | undefined>(undefined);
  const posted = useRef(false);
  // Guards against a second post while the first is in flight (React runs
  // effects twice in development, and a double tap on Post score).
  const inFlight = useRef(false);

  const post = useCallback(async (name: string) => {
    if (posted.current || inFlight.current) return;
    inFlight.current = true;
    try { await postOnce(name); } finally { inFlight.current = false; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getToken, score]);

  async function postOnce(name: string) {
    setPhase({ kind: 'posting' });
    if (tokenRef.current === undefined) tokenRef.current = await getToken();
    const token = tokenRef.current;
    if (!token) {
      setPhase({ kind: 'error', message: 'The leaderboard did not answer. Your best is saved on this device.', retryable: false });
      return;
    }
    const r = await submitScore(token, name, score);
    if (isError(r)) {
      if (r.error.code === 'bad_name' || r.error.code === 'name_taken') {
        clearName(); clearCrown();
        setNameError(r.error.message);
        setPhase({ kind: 'name' });
        return;
      }
      setPhase({ kind: 'error', message: r.error.message, retryable: r.error.code === 'offline' || r.error.code === 'rate_limited' });
      return;
    }
    posted.current = true;
    // The server answers with the stored display name (first casing wins).
    // A crown code maps to her name: keep the code for the next post and
    // show the name the board shows.
    saveName(r.name);
    if (r.crowned) saveCrown(name); else clearCrown();
    setPhase({ kind: 'done', result: r });
    if (r.isTop) { sfx('win'); buzz([30, 50, 30, 50, 60]); }
    else if (r.rank.week !== null && r.rank.week <= 10) sfx('perfect');
  }

  // Auto-post when she already has a name; ask for one otherwise.
  useEffect(() => {
    if (score <= 0) return;
    const name = savedCrown() ?? savedName();
    if (name && !checkName(name)) void post(name);
    else setPhase({ kind: 'name' });
  }, [post, score]);

  const onSubmitName = (e: React.FormEvent) => {
    e.preventDefault();
    const err = checkName(draft);
    setNameError(err);
    if (err) return;
    if (phase.kind === 'rename') {
      // This round is already on the board; the new name applies from the next one.
      saveName(draft.trim());
      clearCrown();
      setPhase({ kind: 'done', result: phase.previous });
      return;
    }
    void post(draft.trim());
  };

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-[19rem]">
      <div aria-live="polite" className="flex flex-col items-center gap-2 text-center min-h-6">
        {phase.kind === 'posting' && <p className="text-sm text-text-secondary">Posting your score</p>}

        {phase.kind === 'done' && phase.result.isTop && (
          <motion.div
            initial={reduced ? false : { scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 420, damping: 16 }}
            className="flex flex-col items-center gap-1"
          >
            <Confetti reduced={!!reduced} />
            <Crown size={36} className="text-[#ffd23f]" aria-hidden />
            <p className="font-display text-[26px] leading-tight text-text">First place on the board.</p>
          </motion.div>
        )}

        {phase.kind === 'done' && (
          <p className="text-[15px] text-text">
            {phase.result.crowned && !phase.result.isTop && <Crown size={14} className="mr-1 inline -mt-0.5 text-[#ffd23f]" aria-label="Crowned" />}
            {phase.result.rank.week !== null ? `${ordinalRank(phase.result.rank.week)} this week` : 'Posted'}
            {phase.result.rank.all !== null && <span className="text-text-secondary">{`, ${ordinalRank(phase.result.rank.all)} all time`}</span>}
          </p>
        )}
        {phase.kind === 'done' && phase.result.best > score && (
          <p className="text-sm text-text-secondary">{`Your best stays ${fmt(phase.result.best)}.`}</p>
        )}

        {phase.kind === 'error' && (
          <>
            <p className="text-sm text-text-secondary">{phase.message}</p>
            {phase.retryable && (
              <button type="button" onClick={() => { posted.current = false; const n = savedName() ?? draft.trim(); void post(n); }} className="min-h-11 text-sm text-text underline underline-offset-4">
                Post again
              </button>
            )}
          </>
        )}
      </div>

      {phase.kind === 'rename' && (
        <p className="text-sm text-text-secondary text-center">The new name shows from your next round.</p>
      )}
      {(phase.kind === 'name' || phase.kind === 'rename') && (
        <form onSubmit={onSubmitName} className="flex w-full flex-col gap-2" noValidate>
          <label htmlFor={`arcade-name-${game}`} className="text-sm text-text-secondary text-left">Name on the board</label>
          <div className="flex gap-2">
            <input
              id={`arcade-name-${game}`}
              value={draft}
              onChange={(e) => { setDraft(e.target.value); setNameError(null); }}
              maxLength={12}
              autoComplete="nickname"
              autoCapitalize="words"
              enterKeyHint="send"
              aria-invalid={!!nameError}
              aria-describedby={nameError ? `arcade-name-err-${game}` : undefined}
              className="min-h-11 min-w-0 flex-1 border border-border bg-black/40 px-3 text-[16px] text-text outline-none focus:border-text/60"
              placeholder="2 to 12 characters"
            />
            <OverlayButton size="sm" mono={mono} accent={accent} accentHover={accentHover} onClick={() => { /* form submit */ }} type="submit">
              {phase.kind === 'rename' ? 'Save name' : 'Post score'}
            </OverlayButton>
          </div>
          {nameError && <p id={`arcade-name-err-${game}`} className="text-sm text-[#ff8a8a] text-left">{nameError}</p>}
        </form>
      )}

      <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
        <OverlayButton onClick={onPlayAgain} mono={mono} accent={accent} accentHover={accentHover}>{playAgainLabel}</OverlayButton>
        <OverlayButton onClick={onShowBoard} variant="ghost" mono={mono}>See the board</OverlayButton>
      </div>
      {phase.kind === 'done' && (
        <button
          type="button"
          onClick={() => { setDraft(''); setPhase({ kind: 'rename', previous: phase.result }); }}
          className="min-h-11 text-xs text-text-tertiary underline underline-offset-4"
        >
          Change name
        </button>
      )}
    </div>
  );
}
