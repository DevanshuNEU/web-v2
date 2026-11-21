'use client';

import { useState, useEffect, useRef, useCallback, useReducer } from 'react';
import { useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Pause, Play } from 'lucide-react';
import { useIsMono } from '@/hooks/usePalette';
import { Hairline, MetaLabel } from '@/components/editorial';
import { bestScore, FUN, isButtonTarget, leftRoot, HudStat, GameHeader, OverlayButton, GameOverlay, ControlsHint, GameStatus } from '../shared/chrome';
import { MONO_TETRIS } from '../shared/palette';

// ─────────────────────────────────────────────────────────────────────────────
// TETRIS - types + helpers
// ─────────────────────────────────────────────────────────────────────────────

const T_COLS = 10;
const T_ROWS = 20;

type TCell  = string | 0;
type TBoard = TCell[][];

interface TPiece { color: string; shapes: number[][][]; }

const TETROMINOES: TPiece[] = [
  { color: '#06b6d4', shapes: [ [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], [[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]] ] },
  { color: '#eab308', shapes: [ [[1,1],[1,1]] ] },
  { color: '#a855f7', shapes: [ [[0,1,0],[1,1,1],[0,0,0]], [[0,1,0],[0,1,1],[0,1,0]], [[0,0,0],[1,1,1],[0,1,0]], [[0,1,0],[1,1,0],[0,1,0]] ] },
  { color: '#22c55e', shapes: [ [[0,1,1],[1,1,0],[0,0,0]], [[0,1,0],[0,1,1],[0,0,1]] ] },
  { color: '#ef4444', shapes: [ [[1,1,0],[0,1,1],[0,0,0]], [[0,0,1],[0,1,1],[0,1,0]] ] },
  { color: '#3b82f6', shapes: [ [[1,0,0],[1,1,1],[0,0,0]], [[0,1,1],[0,1,0],[0,1,0]], [[0,0,0],[1,1,1],[0,0,1]], [[0,1,0],[0,1,0],[1,1,0]] ] },
  { color: '#f97316', shapes: [ [[0,0,1],[1,1,1],[0,0,0]], [[0,1,0],[0,1,0],[0,1,1]], [[0,0,0],[1,1,1],[1,0,0]], [[1,1,0],[0,1,0],[0,1,0]] ] },
];

interface ActivePiece { pieceIdx: number; rotation: number; x: number; y: number; }

function emptyBoard(): TBoard { return Array.from({ length: T_ROWS }, () => Array(T_COLS).fill(0)); }
function randPieceIdx() { return Math.floor(Math.random() * TETROMINOES.length); }

function getShape(ap: ActivePiece): number[][] {
  const p = TETROMINOES[ap.pieceIdx]; return p.shapes[ap.rotation % p.shapes.length];
}

function getOccupied(ap: ActivePiece): [number, number][] {
  const cells: [number, number][] = [];
  getShape(ap).forEach((row, r) => row.forEach((v, c) => { if (v) cells.push([ap.y + r, ap.x + c]); }));
  return cells;
}

function isValid(board: TBoard, ap: ActivePiece): boolean {
  for (const [r, c] of getOccupied(ap)) {
    if (c < 0 || c >= T_COLS || r >= T_ROWS) return false;
    if (r >= 0 && board[r][c] !== 0) return false;
  }
  return true;
}

function lockPiece(board: TBoard, ap: ActivePiece): TBoard {
  const nb = board.map(row => [...row]);
  const color = TETROMINOES[ap.pieceIdx].color;
  for (const [r, c] of getOccupied(ap)) if (r >= 0 && r < T_ROWS && c >= 0 && c < T_COLS) nb[r][c] = color;
  return nb;
}

function clearLines(board: TBoard): { board: TBoard; cleared: number } {
  const kept = board.filter(row => row.some(c => c === 0));
  const cleared = T_ROWS - kept.length;
  return { board: [...Array.from({ length: cleared }, () => Array(T_COLS).fill(0)), ...kept] as TBoard, cleared };
}

function spawnPiece(pieceIdx: number, board: TBoard): ActivePiece | null {
  const shape = TETROMINOES[pieceIdx].shapes[0];
  const x = Math.floor((T_COLS - shape[0].length) / 2);
  const ap: ActivePiece = { pieceIdx, rotation: 0, x, y: 0 };
  return isValid(board, ap) ? ap : null;
}

function ghostOf(board: TBoard, ap: ActivePiece): ActivePiece {
  let g = { ...ap };
  while (isValid(board, { ...g, y: g.y + 1 })) g = { ...g, y: g.y + 1 };
  return g;
}

const LINE_PTS = [0, 100, 300, 500, 800];

interface TetrisState {
  board: TBoard; active: ActivePiece | null; nextIdx: number;
  score: number; level: number; lines: number;
  status: 'idle' | 'playing' | 'paused' | 'over'; best: number;
}

type TetrisAction =
  | { type: 'START' } | { type: 'TICK' } | { type: 'MOVE'; dx: number }
  | { type: 'ROTATE' } | { type: 'SOFT_DROP' } | { type: 'HARD_DROP' }
  | { type: 'TOGGLE_PAUSE' } | { type: 'RESET' };

function freshTetris(best: number): TetrisState {
  return { board: emptyBoard(), active: null, nextIdx: randPieceIdx(), score: 0, level: 1, lines: 0, status: 'idle', best };
}

function afterLock(state: TetrisState, board: TBoard): TetrisState {
  const { board: cleared, cleared: n } = clearLines(board);
  const newLines = state.lines + n, newLevel = Math.floor(newLines / 10) + 1;
  const newScore = state.score + LINE_PTS[n] * state.level;
  const newBest  = Math.max(state.best, newScore);
  if (newBest > state.best) localStorage.setItem('devos-tetris-hs', newBest.toString());
  const next = spawnPiece(state.nextIdx, cleared);
  if (!next) return { ...state, board: cleared, active: null, score: newScore, lines: newLines, level: newLevel, best: newBest, status: 'over' };
  return { ...state, board: cleared, active: next, nextIdx: randPieceIdx(), score: newScore, lines: newLines, level: newLevel, best: newBest };
}

function tetrisReducer(state: TetrisState, action: TetrisAction): TetrisState {
  if (action.type === 'RESET') return freshTetris(state.best);
  if (action.type === 'START') {
    const b = emptyBoard(), ni = randPieceIdx();
    return { ...freshTetris(state.best), board: b, active: spawnPiece(ni, b), nextIdx: randPieceIdx(), status: 'playing' };
  }
  if (action.type === 'TOGGLE_PAUSE') {
    if (state.status === 'playing') return { ...state, status: 'paused' };
    if (state.status === 'paused')  return { ...state, status: 'playing' };
    return state;
  }
  if (state.status !== 'playing' || !state.active) return state;
  if (action.type === 'MOVE') {
    const moved = { ...state.active, x: state.active.x + action.dx };
    return isValid(state.board, moved) ? { ...state, active: moved } : state;
  }
  if (action.type === 'ROTATE') {
    const p = TETROMINOES[state.active.pieceIdx];
    const rot = (state.active.rotation + 1) % p.shapes.length;
    for (const dx of [0, -1, 1, -2, 2]) {
      const kicked = { ...state.active, rotation: rot, x: state.active.x + dx };
      if (isValid(state.board, kicked)) return { ...state, active: kicked };
    }
    return state;
  }
  if (action.type === 'TICK' || action.type === 'SOFT_DROP') {
    const down = { ...state.active, y: state.active.y + 1 };
    if (isValid(state.board, down)) return { ...state, active: down };
    return afterLock(state, lockPiece(state.board, state.active));
  }
  if (action.type === 'HARD_DROP') {
    const ghost = ghostOf(state.board, state.active);
    const bonus = (ghost.y - state.active.y) * 2;
    const next  = afterLock(state, lockPiece(state.board, ghost));
    return { ...next, score: next.score + bonus };
  }
  return state;
}

function gravityDelay(level: number) { return Math.max(80, 800 - (level - 1) * 80); }

// Map a stored piece color (the Fun hue) to its grayscale tone in mono.
// Built from TETROMINOES order so each of the 7 pieces keeps a distinct lightness.
const TETRIS_MONO_BY_HUE: Record<string, string> = Object.fromEntries(
  TETROMINOES.map((p, i) => [p.color, MONO_TETRIS[i]])
);
function tetrisCellColor(stored: string, mono: boolean): string {
  return mono ? (TETRIS_MONO_BY_HUE[stored] ?? '#a1a1aa') : stored;
}

function drawTetCell(ctx: CanvasRenderingContext2D, c: number, r: number, color: string, cs: number, alpha: number) {
  const x = c * cs, y = r * cs, pad = 1, rad = 3;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x + pad, y + pad, cs - pad * 2, cs - pad * 2, rad);
  else ctx.rect(x + pad, y + pad, cs - pad * 2, cs - pad * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.32)';
  ctx.fillRect(x + pad + 1, y + pad + 1, cs - pad * 2 - 2, 3);
  ctx.fillStyle = 'rgba(0,0,0,0.32)';
  ctx.fillRect(x + pad + 1, y + cs - pad - 4, cs - pad * 2 - 2, 3);
  ctx.globalAlpha = 1;
}

// ─────────────────────────────────────────────────────────────────────────────
// TETRIS GAME - responsive canvas + focus-based keyboard + button controls
// ─────────────────────────────────────────────────────────────────────────────

export default function TetrisGame({ onBack, isMobile }: { onBack: () => void; isMobile: boolean }) {
  const mono = useIsMono();
  const reduced = useReducedMotion();
  const [state, dispatch] = useReducer(
    tetrisReducer,
    freshTetris(bestScore('devos-tetris-hs'))
  );

  // Responsive cell size - recalculates whenever the game area resizes
  const [cs, setCs] = useState(20);
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null); // for focus
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const previewRef   = useRef<HTMLCanvasElement>(null);
  const intervalRef  = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  // Auto-focus container so keyboard events are captured
  useEffect(() => { containerRef.current?.focus({ preventScroll: true }); }, []);
  const refocus = useCallback(() => containerRef.current?.focus({ preventScroll: true }), []);
  const start = useCallback(() => { dispatch({ type: 'START' }); refocus(); }, [refocus]);
  const resume = useCallback(() => { dispatch({ type: 'TOGGLE_PAUSE' }); refocus(); }, [refocus]);

  // Responsive cell size
  useEffect(() => {
    const update = () => {
      if (!gameAreaRef.current) return;
      const h = gameAreaRef.current.clientHeight;
      const w = gameAreaRef.current.clientWidth;
      // Reserve ~96px for side panel + gap; 8px padding
      const boardMaxW = w - 104;
      const csH = Math.floor((h - 8) / T_ROWS);
      const csW = Math.floor(boardMaxW / T_COLS);
      setCs(Math.max(14, Math.min(csH, csW, 28)));
    };
    const obs = new ResizeObserver(update);
    if (gameAreaRef.current) obs.observe(gameAreaRef.current);
    update();
    return () => obs.disconnect();
  }, []);

  // Gravity loop
  useEffect(() => {
    clearInterval(intervalRef.current);
    if (state.status === 'playing') {
      intervalRef.current = setInterval(() => dispatch({ type: 'TICK' }), gravityDelay(state.level));
    }
    return () => clearInterval(intervalRef.current);
  }, [state.status, state.level]);

  // Keyboard handler on the focused container div - fixes arrow key issue in small windows
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // On a focused button, Space and Enter press that button.
    if ((e.key === ' ' || e.key === 'Enter') && isButtonTarget(e)) return;
    switch (e.key) {
      case 'ArrowLeft':  case 'a': case 'A': e.preventDefault(); dispatch({ type: 'MOVE', dx: -1 }); break;
      case 'ArrowRight': case 'd': case 'D': e.preventDefault(); dispatch({ type: 'MOVE', dx: 1 }); break;
      case 'ArrowUp':    case 'w': case 'W': case 'z': case 'Z': e.preventDefault(); dispatch({ type: 'ROTATE' }); break;
      case 'ArrowDown':  case 's': case 'S': e.preventDefault(); dispatch({ type: 'SOFT_DROP' }); break;
      case ' ':
        e.preventDefault();
        if (state.status === 'idle') dispatch({ type: 'START' });
        else if (state.status === 'playing') dispatch({ type: 'HARD_DROP' });
        else if (state.status === 'paused')  dispatch({ type: 'TOGGLE_PAUSE' });
        break;
      case 'p': case 'P': e.preventDefault(); dispatch({ type: 'TOGGLE_PAUSE' }); break;
    }
  }, [state.status]);

  // Leaving the game (title bar click, another window) pauses it, so the
  // piece never keeps falling while the keys go somewhere else.
  const statusRef = useRef(state.status);
  useEffect(() => { statusRef.current = state.status; }, [state.status]);
  const handleBlur = useCallback((e: React.FocusEvent) => {
    if (leftRoot(e) && statusRef.current === 'playing') dispatch({ type: 'TOGGLE_PAUSE' });
  }, []);

  // Draw main board
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const W = T_COLS * cs, H = T_ROWS * cs;
    ctx.fillStyle = '#080808'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(255,255,255,0.03)'; ctx.lineWidth = 0.5;
    for (let c = 0; c <= T_COLS; c++) { ctx.beginPath(); ctx.moveTo(c * cs, 0); ctx.lineTo(c * cs, H); ctx.stroke(); }
    for (let r = 0; r <= T_ROWS; r++) { ctx.beginPath(); ctx.moveTo(0, r * cs); ctx.lineTo(W, r * cs); ctx.stroke(); }
    state.board.forEach((row, r) => row.forEach((cell, c) => { if (cell) drawTetCell(ctx, c, r, tetrisCellColor(cell as string, mono), cs, 1); }));
    if (state.active && state.status === 'playing') {
      const ghost = ghostOf(state.board, state.active);
      if (ghost.y !== state.active.y) {
        const col = tetrisCellColor(TETROMINOES[state.active.pieceIdx].color, mono);
        for (const [r, c] of getOccupied(ghost)) if (r >= 0) drawTetCell(ctx, c, r, col, cs, 0.18);
      }
    }
    if (state.active) {
      const col = tetrisCellColor(TETROMINOES[state.active.pieceIdx].color, mono);
      for (const [r, c] of getOccupied(state.active)) if (r >= 0) drawTetCell(ctx, c, r, col, cs, 1);
    }
  }, [state, cs, mono]);

  // Draw next piece preview
  useEffect(() => {
    const canvas = previewRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const PC = Math.max(10, Math.round(cs * 0.75));
    const W = 4 * PC, H = 4 * PC;
    ctx.fillStyle = '#080808'; ctx.fillRect(0, 0, W, H);
    const piece = TETROMINOES[state.nextIdx];
    const shape = piece.shapes[0];
    const ox = Math.floor((4 - shape[0].length) / 2);
    const oy = Math.floor((4 - shape.length) / 2);
    shape.forEach((row, r) => row.forEach((v, c) => { if (v) drawTetCell(ctx, c + ox, r + oy, tetrisCellColor(piece.color, mono), PC, 1); }));
  }, [state.nextIdx, cs, mono]);

  const previewSize = Math.max(40, Math.round(cs * 0.75) * 4);

  // Shared button style for on-screen controls - editorial mono, pressable.
  const ctrlBtn = "w-9 h-9 flex items-center justify-center border border-border text-text-secondary hover:text-text hover:border-text/40 active:scale-95 transition-[color,border-color,transform] duration-150 ease-out cursor-pointer select-none";

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      aria-label="Tetris"
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      data-testid="tetris-root"
      className="h-full flex flex-col overflow-hidden focus-visible:[outline-offset:-2px]"
    >
      <GameStatus>
        {state.status === 'playing' ? 'Tetris started.' : state.status === 'paused' ? 'Paused.' : state.status === 'over' ? `Game over. ${state.score} points.` : ''}
      </GameStatus>
      <GameHeader title="Tetris" score={state.score} best={state.best} bestNarrowHidden onBack={onBack} onReset={() => dispatch({ type: 'RESET' })}>
        <HudStat label="Lines" value={state.lines} narrowHidden />
        <HudStat label="Level" value={state.level} />
      </GameHeader>

      <div ref={gameAreaRef} className="flex-1 flex items-center justify-center gap-3 p-3 bg-surface/20 overflow-hidden">
        {/* Board */}
        <div className="relative flex-shrink-0">
          <canvas
            ref={canvasRef}
            width={T_COLS * cs}
            height={T_ROWS * cs}
            role="img"
            aria-label="Tetris board"
            className="border border-border block"
          />
          {state.status !== 'playing' && (
            <GameOverlay reduced={reduced} key={state.status}>
              {state.status === 'idle' ? (
                <>
                  <h2 className="font-display text-text leading-none text-[clamp(1.5rem,4.5cqi,2.25rem)]">Tetris</h2>
                  <MetaLabel className="text-text-secondary">{isMobile ? 'Tap Start to begin' : 'Press Space to start'}</MetaLabel>
                  <OverlayButton onClick={start} mono={mono} accent={FUN.tetris.fill} accentHover={FUN.tetris.hover}>Start</OverlayButton>
                </>
              ) : state.status === 'paused' ? (
                <>
                  <h2 className="font-display text-text leading-none text-[clamp(1.5rem,4.5cqi,2.25rem)]">Paused</h2>
                  {!isMobile && <MetaLabel className="text-text-secondary">P or Space to resume</MetaLabel>}
                  <OverlayButton onClick={resume} mono={mono} accent={FUN.tetris.fill} accentHover={FUN.tetris.hover}>Resume</OverlayButton>
                </>
              ) : (
                <>
                  <h2 className="font-display text-text leading-none text-[clamp(1.5rem,4.5cqi,2.25rem)]">Game over</h2>
                  <div className="flex flex-col items-center gap-1">
                    <span className="font-mono-meta tabular-nums text-text text-[clamp(1.1rem,3cqi,1.5rem)]">{state.score.toLocaleString()}</span>
                    <MetaLabel className="text-text-secondary">Points</MetaLabel>
                  </div>
                  {state.score >= state.best && state.score > 0 && <MetaLabel className="text-text">New best</MetaLabel>}
                  <OverlayButton onClick={start} mono={mono} accent={FUN.tetris.fill} accentHover={FUN.tetris.hover}>Play again</OverlayButton>
                </>
              )}
            </GameOverlay>
          )}
        </div>

        {/* Side panel */}
        <div className="flex flex-col gap-3 flex-shrink-0">
          <div className="border border-border p-2 text-center">
            <MetaLabel as="p" className="text-text-secondary justify-center mb-1.5">Next</MetaLabel>
            <canvas ref={previewRef} width={previewSize} height={previewSize} style={{ width: previewSize, height: previewSize }} />
          </div>
        </div>
      </div>

      {/* ── On-screen controls - fix for small windows & touch ── */}
      <div className="flex-shrink-0">
        <Hairline />
        <div className="flex items-center justify-center gap-2 px-4 py-2.5 bg-surface/10">
          {/* D-pad */}
          <button type="button" className={ctrlBtn} onClick={() => dispatch({ type: 'ROTATE' })} title="Rotate (↑)" aria-label="Rotate">
            <ChevronUp size={16} />
          </button>
          <button type="button" className={ctrlBtn} onClick={() => dispatch({ type: 'MOVE', dx: -1 })} title="Left (←)" aria-label="Move left">
            <ChevronLeft size={16} />
          </button>
          <button type="button" className={ctrlBtn} onClick={() => dispatch({ type: 'SOFT_DROP' })} title="Soft drop (↓)" aria-label="Soft drop">
            <ChevronDown size={16} />
          </button>
          <button type="button" className={ctrlBtn} onClick={() => dispatch({ type: 'MOVE', dx: 1 })} title="Right (→)" aria-label="Move right">
            <ChevronRight size={16} />
          </button>

          <div className="w-px h-5 bg-border mx-1" />

          {/* Action buttons */}
          <OverlayButton
            size="sm"
            mono={mono}
            accent={FUN.tetris.fill}
            accentHover={FUN.tetris.hover}
            onClick={() => {
              if (state.status === 'idle' || state.status === 'over') start();
              else dispatch({ type: 'HARD_DROP' });
            }}
          >
            {state.status === 'idle' || state.status === 'over' ? 'Start' : 'Drop'}
          </OverlayButton>
          <button
            type="button"
            className={ctrlBtn}
            onClick={() => (state.status === 'paused' ? resume() : dispatch({ type: 'TOGGLE_PAUSE' }))}
            title={state.status === 'paused' ? 'Resume (P)' : 'Pause (P)'}
            aria-label={state.status === 'paused' ? 'Resume' : 'Pause'}
            aria-pressed={state.status === 'paused'}
          >
            {state.status === 'paused' ? <Play size={15} aria-hidden /> : <Pause size={15} aria-hidden />}
          </button>
        </div>
      </div>

      <ControlsHint>
        {isMobile ? 'Tap the controls below' : 'Arrows move, ↑ rotates, ↓ drops faster. Space drops. P pauses.'}
      </ControlsHint>
    </div>
  );
}
