'use client';

/**
 * GamesApp — Arcade
 *
 * Snake    · Nokia 3310 nostalgia
 * Tetris   · The programmer's meditation
 * Type Racer · Code faster than your linter
 */

import { useState, useEffect, useRef, useCallback, useReducer } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RotateCcw, CheckCircle2, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Trophy } from 'lucide-react';

type GameId = 'launcher' | 'snake' | 'tetris' | 'typeracer';

// ─────────────────────────────────────────────────────────────────────────────
// GAME ICONS — Apple-quality SVG illustrations
// ─────────────────────────────────────────────────────────────────────────────

function SnakeIcon() {
  // Pixel snake winding through a subtle grid, red apple in corner
  const seg = 8; // segment size
  // Snake body: winding S-shape segments (col, row)
  const body = [
    [3,1],[4,1],[5,1],[6,1],
    [6,2],[6,3],
    [5,3],[4,3],[3,3],[2,3],
    [2,4],[2,5],
    [3,5],[4,5],[5,5],[6,5],[7,5],
  ];
  const colors = [
    '#4ade80','#4ade80','#4ade80','#4ade80',
    '#4ade80','#4ade80',
    '#4ade80','#4ade80','#4ade80','#22c55e',
    '#22c55e','#16a34a',
    '#16a34a','#16a34a','#16a34a','#15803d','#15803d',
  ];
  const w = 10, h = 8;
  return (
    <svg viewBox={`0 0 ${w * seg} ${h * seg}`} width={72} height={58} xmlns="http://www.w3.org/2000/svg">
      {/* Grid dots */}
      {Array.from({ length: h }, (_, r) =>
        Array.from({ length: w }, (_, c) => (
          <circle key={`${r}-${c}`} cx={c * seg + seg / 2} cy={r * seg + seg / 2} r={0.7} fill="rgba(255,255,255,0.08)" />
        ))
      )}
      {/* Snake body segments */}
      {body.map(([c, r], i) => (
        <rect
          key={i}
          x={c * seg + 1} y={r * seg + 1}
          width={seg - 2} height={seg - 2}
          rx={i === 0 ? 3 : 2}
          fill={colors[i]}
          opacity={0.95}
        />
      ))}
      {/* Head eyes */}
      <circle cx={3 * seg + 3} cy={1 * seg + 3} r={1.2} fill="#052e16" />
      <circle cx={3 * seg + 5.5} cy={1 * seg + 3} r={1.2} fill="#052e16" />
      {/* Apple / food */}
      <circle cx={8 * seg + 2} cy={2 * seg + 2} r={4} fill="#ef4444" />
      <rect x={8 * seg + 1.5} y={2 * seg - 3} width={1.5} height={4} rx={0.75} fill="#16a34a" />
    </svg>
  );
}

function TetrisIcon() {
  // Mini Tetris board — colorful locked pieces, I-piece falling
  const cs = 7; // cell size
  const cols = 8, rows = 9;
  // Grid: 0 = empty, color string = filled
  const grid: (string | 0)[][] = Array.from({ length: rows }, () => Array(cols).fill(0));
  // Place pieces manually for a satisfying composition
  const pieces: [number, number, string][] = [
    // I-piece (cyan) — bottom row, full width
    [7,0,'#22d3ee'],[7,1,'#22d3ee'],[7,2,'#22d3ee'],[7,3,'#22d3ee'],
    // O-piece (yellow)
    [6,0,'#facc15'],[6,1,'#facc15'],[5,0,'#facc15'],[5,1,'#facc15'],
    // T-piece (purple)
    [6,2,'#a78bfa'],[6,3,'#a78bfa'],[6,4,'#a78bfa'],[5,3,'#a78bfa'],
    // S-piece (green)
    [5,4,'#4ade80'],[5,5,'#4ade80'],[6,5,'#4ade80'],[6,6,'#4ade80'],
    // Z-piece (red)
    [4,5,'#f87171'],[4,6,'#f87171'],[5,6,'#f87171'],[5,7,'#f87171'],
    // L-piece (orange)
    [4,2,'#fb923c'],[4,3,'#fb923c'],[4,4,'#fb923c'],[3,4,'#fb923c'],
    // J-piece (blue)
    [3,6,'#60a5fa'],[3,7,'#60a5fa'],[4,7,'#60a5fa'],[4,8,'#60a5fa'],
    // Falling I (cyan, partial) — top
    [0,4,'#22d3ee'],[1,4,'#22d3ee'],[2,4,'#22d3ee'],[3,4,'#22d3ee'],
  ];
  pieces.forEach(([r, c, color]) => { if (grid[r]) grid[r][c] = color; });

  return (
    <svg viewBox={`0 0 ${cols * cs} ${rows * cs}`} width={72} height={72} xmlns="http://www.w3.org/2000/svg">
      {/* Board background */}
      <rect width={cols * cs} height={rows * cs} rx={3} fill="rgba(0,0,0,0.25)" />
      {/* Grid lines */}
      {Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => (
          <rect key={`${r}-${c}`} x={c*cs+0.5} y={r*cs+0.5} width={cs-1} height={cs-1} rx={1}
            fill="rgba(255,255,255,0.04)" />
        ))
      )}
      {/* Filled cells */}
      {grid.map((row, r) =>
        row.map((cell, c) =>
          cell ? (
            <g key={`${r}-${c}`}>
              <rect x={c*cs+1} y={r*cs+1} width={cs-2} height={cs-2} rx={1.5} fill={cell} opacity={0.92} />
              {/* Highlight */}
              <rect x={c*cs+2} y={r*cs+2} width={cs-5} height={2} rx={0.5} fill="rgba(255,255,255,0.35)" />
            </g>
          ) : null
        )
      )}
    </svg>
  );
}

function TypeRacerIcon() {
  // Terminal window: traffic lights + syntax-highlighted code lines, cursor
  return (
    <svg viewBox="0 0 80 60" width={80} height={60} xmlns="http://www.w3.org/2000/svg">
      {/* Window */}
      <rect width={80} height={60} rx={6} fill="#1e1e2e" />
      {/* Title bar */}
      <rect width={80} height={14} rx={6} fill="#2a2a3d" />
      <rect y={8} width={80} height={6} fill="#2a2a3d" />
      {/* Traffic lights */}
      <circle cx={10} cy={7} r={3} fill="#ff5f57" />
      <circle cx={20} cy={7} r={3} fill="#febc2e" />
      <circle cx={30} cy={7} r={3} fill="#28c840" />
      {/* Code line 1 — fully "typed" (green tint) */}
      <rect x={8} y={19} width={12} height={4} rx={1} fill="#86efac" opacity={0.85} />
      <rect x={22} y={19} width={8} height={4} rx={1} fill="#c4b5fd" opacity={0.85} />
      <rect x={32} y={19} width={16} height={4} rx={1} fill="#7dd3fc" opacity={0.85} />
      {/* Cursor blink after typed text */}
      <rect x={50} y={19} width={3} height={4} rx={0.5} fill="#a5f3fc" opacity={0.9} />
      {/* Code line 2 — upcoming (dimmer) */}
      <rect x={8} y={27} width={10} height={3.5} rx={1} fill="rgba(255,255,255,0.15)" />
      <rect x={20} y={27} width={20} height={3.5} rx={1} fill="rgba(255,255,255,0.10)" />
      <rect x={42} y={27} width={12} height={3.5} rx={1} fill="rgba(255,255,255,0.10)" />
      {/* Code line 3 */}
      <rect x={8} y={34} width={6} height={3.5} rx={1} fill="rgba(255,255,255,0.10)" />
      <rect x={16} y={34} width={24} height={3.5} rx={1} fill="rgba(255,255,255,0.08)" />
      {/* Code line 4 */}
      <rect x={8} y={41} width={14} height={3.5} rx={1} fill="rgba(255,255,255,0.08)" />
      <rect x={24} y={41} width={10} height={3.5} rx={1} fill="rgba(255,255,255,0.06)" />
      {/* Progress bar */}
      <rect x={8} y={51} width={64} height={3} rx={1.5} fill="rgba(255,255,255,0.08)" />
      <rect x={8} y={51} width={26} height={3} rx={1.5} fill="#34d399" opacity={0.8} />
    </svg>
  );
}

const GAME_ICONS: Record<string, React.ReactElement> = {
  snake: <SnakeIcon />,
  tetris: <TetrisIcon />,
  typeracer: <TypeRacerIcon />,
};

// ─────────────────────────────────────────────────────────────────────────────
// LAUNCHER — Premium 3-column card grid
// ─────────────────────────────────────────────────────────────────────────────

const CARDS = [
  {
    id: 'snake' as GameId,
    title: 'Snake',
    subtitle: 'Nokia 3310 edition',
    controls: '← → ↑ ↓ · Space pause',
    gradient: 'linear-gradient(150deg, #166534 0%, #052e16 100%)',
    glow: '#22c55e',
    border: 'rgba(34,197,94,0.2)',
    hsKey: 'devos-snake-hs',
    hsLabel: 'pts',
  },
  {
    id: 'tetris' as GameId,
    title: 'Tetris',
    subtitle: "The programmer's meditation",
    controls: '← → ↑ · Space drop · P pause',
    gradient: 'linear-gradient(150deg, #3730a3 0%, #1e1b4b 100%)',
    glow: '#6366f1',
    border: 'rgba(99,102,241,0.2)',
    hsKey: 'devos-tetris-hs',
    hsLabel: 'pts',
  },
  {
    id: 'typeracer' as GameId,
    title: 'Type Racer',
    subtitle: 'Code faster than your linter',
    controls: 'Start typing to begin',
    gradient: 'linear-gradient(150deg, #065f46 0%, #022c22 100%)',
    glow: '#10b981',
    border: 'rgba(16,185,129,0.2)',
    hsKey: 'devos-typeracer-hs',
    hsLabel: 'WPM',
  },
] as const;

function Launcher({ onSelect }: { onSelect: (id: GameId) => void }) {
  const hero = CARDS[1]; // Tetris — most visually striking icon
  const shelf = [CARDS[0], CARDS[2]]; // Snake + Type Racer

  const hsHero  = typeof window !== 'undefined' ? (localStorage.getItem(hero.hsKey)  ?? '0') : '0';

  return (
    <div className="h-full flex flex-col px-5 pt-4 pb-5 gap-3 bg-surface/20 overflow-hidden">

      {/* ── Header ── */}
      <div className="flex-shrink-0 text-center">
        <h1 className="text-lg font-bold text-text tracking-tight">Arcade</h1>
        <p className="text-[10px] text-text-secondary mt-0.5">Three classics · one window · zero productivity</p>
      </div>

      {/* ── Hero card ── full width, horizontal */}
      <motion.button
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 22, stiffness: 260 }}
        whileHover={{ scale: 1.012 }}
        whileTap={{ scale: 0.985 }}
        onClick={() => onSelect(hero.id)}
        className="relative overflow-hidden rounded-2xl flex-shrink-0 cursor-pointer text-left group"
        style={{
          height: 160,
          background: hero.gradient,
          border: `1px solid ${hero.border}`,
          boxShadow: `0 12px 40px ${hero.glow}20, 0 2px 8px rgba(0,0,0,0.4)`,
        }}
      >
        {/* Hover glow */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at 70% 50%, ${hero.glow}28, transparent 65%)` }} />

        {/* Large ambient blob behind icon */}
        <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ filter: `blur(24px)`, width: 120, height: 120, background: `${hero.glow}30`, borderRadius: '50%' }} />

        {/* Icon — right side */}
        <div className="absolute right-8 top-1/2 -translate-y-1/2 z-10"
          style={{ filter: `drop-shadow(0 10px 28px ${hero.glow}80)`, transform: 'translateY(-50%) scale(1.35)' }}>
          {GAME_ICONS[hero.id]}
        </div>

        {/* Text — left side */}
        <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-center px-6 z-10" style={{ maxWidth: '55%' }}>
          {/* Featured label */}
          <span className="text-[9px] font-semibold tracking-widest uppercase mb-2"
            style={{ color: hero.glow, opacity: 0.85 }}>Featured</span>
          <h2 className="text-2xl font-bold text-white leading-tight">{hero.title}</h2>
          <p className="text-white/50 text-[11px] mt-1 leading-snug">{hero.subtitle}</p>

          {/* High score */}
          {parseInt(hsHero) > 0 && (
            <div className="flex items-center gap-1 mt-2">
              <Trophy size={9} style={{ color: hero.glow }} />
              <span className="text-[9px] font-mono font-medium" style={{ color: hero.glow }}>
                Best: {hsHero} {hero.hsLabel}
              </span>
            </div>
          )}

          {/* CTA */}
          <div className="mt-3">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-white/90
              border border-white/20 bg-white/10 group-hover:bg-white/18 transition-colors">
              Play →
            </span>
          </div>
        </div>
      </motion.button>

      {/* ── Shelf — two equal cards ── */}
      <div className="flex-1 grid grid-cols-2 gap-3 min-h-0">
        {shelf.map((card, idx) => {
          const hs = typeof window !== 'undefined' ? (localStorage.getItem(card.hsKey) ?? '0') : '0';
          return (
            <motion.button
              key={card.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 + idx * 0.06, type: 'spring', damping: 22, stiffness: 260 }}
              whileHover={{ scale: 1.022, y: -3 }}
              whileTap={{ scale: 0.975 }}
              onClick={() => onSelect(card.id)}
              className="relative overflow-hidden rounded-2xl flex flex-col cursor-pointer text-left group"
              style={{
                background: card.gradient,
                border: `1px solid ${card.border}`,
                boxShadow: `0 8px 28px ${card.glow}18, 0 2px 8px rgba(0,0,0,0.4)`,
              }}
            >
              {/* Hover glow */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{ background: `radial-gradient(ellipse at 50% 35%, ${card.glow}28, transparent 65%)` }} />

              {/* Ambient blob */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none"
                style={{ filter: 'blur(20px)', width: 80, height: 80, background: `${card.glow}22`, borderRadius: '50%' }} />

              {/* Icon — centered, constrained */}
              <div className="flex items-center justify-center pt-5 pb-3 relative z-10"
                style={{ filter: `drop-shadow(0 6px 18px ${card.glow}70)` }}>
                {GAME_ICONS[card.id]}
              </div>

              {/* Info */}
              <div className="relative z-10 px-3.5 pb-3.5 mt-auto">
                <div className="border-t mb-2.5" style={{ borderColor: card.border }} />
                {parseInt(hs) > 0 && (
                  <div className="flex items-center gap-1 mb-1.5">
                    <Trophy size={8} style={{ color: card.glow }} />
                    <span className="text-[9px] font-mono font-medium" style={{ color: card.glow }}>
                      {hs} {card.hsLabel}
                    </span>
                  </div>
                )}
                <div className="flex items-end justify-between gap-1">
                  <div className="min-w-0">
                    <h3 className="font-bold text-white text-sm leading-tight truncate">{card.title}</h3>
                    <p className="text-white/40 text-[10px] mt-0.5 leading-tight truncate">{card.subtitle}</p>
                  </div>
                  <span className="text-white/30 text-xs group-hover:text-white/60 transition-colors flex-shrink-0 font-medium pb-0.5">→</span>
                </div>
                <p className="text-white/20 text-[9px] font-mono mt-1.5 truncate">{card.controls}</p>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared game header
// ─────────────────────────────────────────────────────────────────────────────

function GameHeader({
  title, score, best, scoreLabel = 'Score', bestLabel = 'Best',
  onBack, onReset, children,
}: {
  title: string; score?: number | string; best?: number | string;
  scoreLabel?: string; bestLabel?: string;
  onBack: () => void; onReset: () => void; children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 glass-subtle border-b border-white/10 flex-shrink-0">
      <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-text-secondary hover:text-text">
        <ArrowLeft size={15} />
      </button>
      <span className="font-bold text-text text-sm">{title}</span>
      <div className="flex-1" />
      {children}
      {score !== undefined && (
        <div className="text-center">
          <div className="text-xs text-text-secondary">{scoreLabel}</div>
          <div className="text-sm font-bold text-text">{score}</div>
        </div>
      )}
      {best !== undefined && (
        <div className="text-center">
          <div className="text-xs text-text-secondary">{bestLabel}</div>
          <div className="text-sm font-bold text-accent">{best}</div>
        </div>
      )}
      <button onClick={onReset} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-text-secondary hover:text-text">
        <RotateCcw size={14} />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SNAKE — ref-based, window listener (no text inputs here so it's fine)
// ─────────────────────────────────────────────────────────────────────────────

const SNAKE_GRID = 20;

function SnakeGameView({ onBack }: { onBack: () => void }) {
  const [cellSize, setCellSize] = useState(18);
  const [status, setStatus] = useState<'idle' | 'playing' | 'paused' | 'over'>('idle');
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => parseInt(localStorage.getItem('devos-snake-hs') ?? '0'));
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const loopRef      = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const dirRef       = useRef<'UP' | 'DOWN' | 'LEFT' | 'RIGHT'>('RIGHT');
  const snakeRef     = useRef([{ x: 10, y: 10 }]);
  const foodRef      = useRef({ x: 15, y: 15 });
  const scoreRef     = useRef(0);
  const statusRef    = useRef<'idle' | 'playing' | 'paused' | 'over'>('idle');

  useEffect(() => { statusRef.current = status; }, [status]);

  useEffect(() => {
    const obs = new ResizeObserver(() => {
      if (containerRef.current) setCellSize(containerRef.current.clientHeight > 500 ? 22 : 18);
    });
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const randPos = () => ({ x: Math.floor(Math.random() * SNAKE_GRID), y: Math.floor(Math.random() * SNAKE_GRID) });

  const draw = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const cs = cellSize; const s = SNAKE_GRID * cs;
    const snake = snakeRef.current; const food = foodRef.current;
    ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = '#1a1a1a';
    for (let x = 0; x < SNAKE_GRID; x++)
      for (let y = 0; y < SNAKE_GRID; y++)
        if ((x + y) % 2 === 0) ctx.fillRect(x * cs, y * cs, cs, cs);
    snake.forEach((seg, i) => {
      ctx.fillStyle = i === 0 ? '#4ade80' : '#22c55e';
      ctx.beginPath(); ctx.roundRect(seg.x * cs + 1, seg.y * cs + 1, cs - 2, cs - 2, 3); ctx.fill();
    });
    ctx.fillStyle = '#f87171';
    ctx.beginPath(); ctx.roundRect(food.x * cs + 2, food.y * cs + 2, cs - 4, cs - 4, cs / 2); ctx.fill();
  }, [cellSize]);

  const loop = useCallback(() => {
    if (statusRef.current !== 'playing') return;
    const snake = snakeRef.current; const food = foodRef.current; const dir = dirRef.current;
    const head = { ...snake[0] };
    if (dir === 'UP') head.y--; if (dir === 'DOWN') head.y++;
    if (dir === 'LEFT') head.x--; if (dir === 'RIGHT') head.x++;
    if (head.x < 0 || head.x >= SNAKE_GRID || head.y < 0 || head.y >= SNAKE_GRID || snake.some(s => s.x === head.x && s.y === head.y)) {
      clearInterval(loopRef.current); setStatus('over');
      const fs = scoreRef.current;
      setBest(b => { const nb = Math.max(b, fs); localStorage.setItem('devos-snake-hs', nb.toString()); return nb; });
      return;
    }
    const next = [head, ...snake];
    if (head.x === food.x && head.y === food.y) {
      const ns = scoreRef.current + 1; scoreRef.current = ns; setScore(ns); foodRef.current = randPos();
    } else { next.pop(); }
    snakeRef.current = next; draw();
  }, [draw]);

  const startGame = useCallback(() => {
    clearInterval(loopRef.current);
    snakeRef.current = [{ x: 10, y: 10 }]; foodRef.current = randPos();
    scoreRef.current = 0; dirRef.current = 'RIGHT';
    setScore(0); setStatus('playing'); draw();
  }, [draw]);

  useEffect(() => {
    if (status === 'playing') { loopRef.current = setInterval(loop, 140); return () => clearInterval(loopRef.current); }
  }, [status, loop]);

  useEffect(() => { draw(); }, [draw]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const map: Record<string, 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'> = {
        ArrowUp: 'UP', w: 'UP', W: 'UP', ArrowDown: 'DOWN', s: 'DOWN', S: 'DOWN',
        ArrowLeft: 'LEFT', a: 'LEFT', A: 'LEFT', ArrowRight: 'RIGHT', d: 'RIGHT', D: 'RIGHT',
      };
      const opp: Record<string, string> = { UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT' };
      const d = map[e.key];
      if (d && d !== opp[dirRef.current]) { e.preventDefault(); dirRef.current = d; }
      if (e.key === ' ') {
        e.preventDefault();
        setStatus(s => { const next = s === 'playing' ? 'paused' : s === 'paused' ? 'playing' : s; statusRef.current = next; return next; });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const canvasSize = SNAKE_GRID * cellSize;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <GameHeader title="Snake" score={score} best={best} onBack={onBack} onReset={startGame} />
      <div ref={containerRef} className="flex-1 flex items-center justify-center p-4 bg-surface/20 overflow-hidden">
        <div className="relative">
          <canvas ref={canvasRef} width={canvasSize} height={canvasSize} className="rounded-xl shadow-2xl border border-white/10" />
          {status !== 'playing' && (
            <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/60 backdrop-blur-sm">
              {status === 'idle' && <button onClick={startGame} className="px-8 py-3 bg-green-500 text-white font-bold rounded-xl hover:bg-green-400 transition-all shadow-lg">Start</button>}
              {status === 'paused' && <button onClick={() => setStatus('playing')} className="px-8 py-3 bg-green-500 text-white font-bold rounded-xl hover:bg-green-400 transition-all">Resume</button>}
              {status === 'over' && (
                <div className="text-center space-y-3">
                  <p className="text-white font-bold text-xl">Game Over</p>
                  <p className="text-white/70 text-sm">Score: {score}</p>
                  {score > 0 && score === best && <p className="text-green-400 text-sm font-medium">New Best!</p>}
                  <button onClick={startGame} className="px-8 py-3 bg-green-500 text-white font-bold rounded-xl hover:bg-green-400 transition-all">Play Again</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="text-center py-2 text-xs text-text-secondary border-t border-white/10 flex-shrink-0">Arrow keys / WASD · Space to pause</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TETRIS — types + helpers
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
// TETRIS GAME — responsive canvas + focus-based keyboard + button controls
// ─────────────────────────────────────────────────────────────────────────────

function TetrisGame({ onBack }: { onBack: () => void }) {
  const [state, dispatch] = useReducer(
    tetrisReducer,
    freshTetris(typeof window !== 'undefined' ? parseInt(localStorage.getItem('devos-tetris-hs') ?? '0') : 0)
  );

  // Responsive cell size — recalculates whenever the game area resizes
  const [cs, setCs] = useState(20);
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null); // for focus
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const previewRef   = useRef<HTMLCanvasElement>(null);
  const intervalRef  = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  // Auto-focus container so keyboard events are captured
  useEffect(() => { containerRef.current?.focus(); }, []);

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

  // Keyboard handler on the focused container div — fixes arrow key issue in small windows
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
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

  // Draw main board
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const W = T_COLS * cs, H = T_ROWS * cs;
    ctx.fillStyle = '#080808'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(255,255,255,0.03)'; ctx.lineWidth = 0.5;
    for (let c = 0; c <= T_COLS; c++) { ctx.beginPath(); ctx.moveTo(c * cs, 0); ctx.lineTo(c * cs, H); ctx.stroke(); }
    for (let r = 0; r <= T_ROWS; r++) { ctx.beginPath(); ctx.moveTo(0, r * cs); ctx.lineTo(W, r * cs); ctx.stroke(); }
    state.board.forEach((row, r) => row.forEach((cell, c) => { if (cell) drawTetCell(ctx, c, r, cell as string, cs, 1); }));
    if (state.active && state.status === 'playing') {
      const ghost = ghostOf(state.board, state.active);
      if (ghost.y !== state.active.y) {
        const col = TETROMINOES[state.active.pieceIdx].color;
        for (const [r, c] of getOccupied(ghost)) if (r >= 0) drawTetCell(ctx, c, r, col, cs, 0.18);
      }
    }
    if (state.active) {
      const col = TETROMINOES[state.active.pieceIdx].color;
      for (const [r, c] of getOccupied(state.active)) if (r >= 0) drawTetCell(ctx, c, r, col, cs, 1);
    }
    if (state.status === 'paused') {
      ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'white'; ctx.font = `bold ${Math.round(cs * 0.8)}px system-ui`; ctx.textAlign = 'center';
      ctx.fillText('PAUSED', W / 2, H / 2 - 6);
      ctx.font = `${Math.round(cs * 0.55)}px system-ui`; ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.fillText('P or Space to resume', W / 2, H / 2 + cs);
    }
  }, [state, cs]);

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
    shape.forEach((row, r) => row.forEach((v, c) => { if (v) drawTetCell(ctx, c + ox, r + oy, piece.color, PC, 1); }));
  }, [state.nextIdx, cs]);

  const previewSize = Math.max(40, Math.round(cs * 0.75) * 4);

  // Shared button style for on-screen controls
  const ctrlBtn = "w-9 h-9 rounded-xl flex items-center justify-center text-text-secondary hover:text-text bg-white/6 hover:bg-white/14 active:bg-white/20 transition-all border border-white/8 hover:border-white/20 cursor-pointer select-none";

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="h-full flex flex-col overflow-hidden outline-none"
    >
      <GameHeader title="Tetris" score={state.score} best={state.best} onBack={onBack} onReset={() => dispatch({ type: 'RESET' })}>
        <div className="text-center mr-2"><div className="text-xs text-text-secondary">Lines</div><div className="text-sm font-bold text-text">{state.lines}</div></div>
        <div className="text-center mr-2"><div className="text-xs text-text-secondary">Level</div><div className="text-sm font-bold text-accent">{state.level}</div></div>
      </GameHeader>

      <div ref={gameAreaRef} className="flex-1 flex items-center justify-center gap-3 p-3 bg-surface/20 overflow-hidden">
        {/* Board */}
        <div className="relative flex-shrink-0">
          <canvas
            ref={canvasRef}
            width={T_COLS * cs}
            height={T_ROWS * cs}
            className="rounded-xl shadow-2xl border border-white/10 block"
          />
          {(state.status === 'idle' || state.status === 'over') && (
            <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/70 backdrop-blur-sm">
              {state.status === 'idle' ? (
                <div className="text-center space-y-3">
                  <p className="text-white/60 text-sm">Click Start or press Space</p>
                  <button onClick={() => dispatch({ type: 'START' })} className="px-8 py-2.5 bg-indigo-500 text-white font-bold rounded-xl hover:bg-indigo-400 transition-all shadow-lg">
                    Start
                  </button>
                </div>
              ) : (
                <div className="text-center space-y-3">
                  <p className="text-white font-bold text-xl">Game Over</p>
                  <p className="text-white/70 text-sm">Score: {state.score.toLocaleString()}</p>
                  {state.score >= state.best && state.score > 0 && <p className="text-yellow-400 text-sm">🏆 New Best!</p>}
                  <button onClick={() => dispatch({ type: 'START' })} className="px-8 py-2.5 bg-indigo-500 text-white font-bold rounded-xl hover:bg-indigo-400 transition-all">
                    Play Again
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Side panel */}
        <div className="flex flex-col gap-3 flex-shrink-0">
          <div className="glass-subtle rounded-xl p-2 border border-white/10 text-center">
            <p className="text-[10px] text-text-secondary uppercase tracking-wider mb-1.5">Next</p>
            <canvas ref={previewRef} width={previewSize} height={previewSize} className="rounded-lg" style={{ width: previewSize, height: previewSize }} />
          </div>
        </div>
      </div>

      {/* ── On-screen controls — fix for small windows & touch ── */}
      <div className="flex-shrink-0 flex items-center justify-center gap-2 px-4 py-2.5 border-t border-white/10 bg-surface/10">
        {/* D-pad */}
        <button className={ctrlBtn} onClick={() => dispatch({ type: 'ROTATE' })} title="Rotate (↑)">
          <ChevronUp size={16} />
        </button>
        <button className={ctrlBtn} onClick={() => dispatch({ type: 'MOVE', dx: -1 })} title="Left (←)">
          <ChevronLeft size={16} />
        </button>
        <button className={ctrlBtn} onClick={() => dispatch({ type: 'SOFT_DROP' })} title="Soft drop (↓)">
          <ChevronDown size={16} />
        </button>
        <button className={ctrlBtn} onClick={() => dispatch({ type: 'MOVE', dx: 1 })} title="Right (→)">
          <ChevronRight size={16} />
        </button>

        <div className="w-px h-5 bg-white/15 mx-1" />

        {/* Action buttons */}
        <button
          className="h-9 px-3 rounded-xl text-xs font-bold text-white bg-indigo-500/80 hover:bg-indigo-500 active:bg-indigo-600 transition-all border border-indigo-400/30 cursor-pointer select-none"
          onClick={() => {
            if (state.status === 'idle' || state.status === 'over') dispatch({ type: 'START' });
            else dispatch({ type: 'HARD_DROP' });
          }}
          title="Hard drop (Space)"
        >
          {state.status === 'idle' || state.status === 'over' ? 'Start' : 'Drop'}
        </button>
        <button
          className={ctrlBtn}
          onClick={() => dispatch({ type: 'TOGGLE_PAUSE' })}
          title="Pause (P)"
        >
          {state.status === 'paused' ? '▶' : '⏸'}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPE RACER
// ─────────────────────────────────────────────────────────────────────────────

const CODE_SNIPPETS = [
  {
    label: 'React Hook',
    code: `const [count, setCount] = useState(0);\n\nuseEffect(() => {\n  document.title = \`Count: \${count}\`;\n}, [count]);`,
  },
  {
    label: 'Async Fetch',
    code: `async function fetchUser(id: string) {\n  const res = await fetch(\`/api/users/\${id}\`);\n  if (!res.ok) throw new Error('Not found');\n  return res.json();\n}`,
  },
  {
    label: 'Array Magic',
    code: `const result = users\n  .filter(u => u.active)\n  .map(u => ({ ...u, name: u.name.trim() }))\n  .sort((a, b) => a.name.localeCompare(b.name));`,
  },
  {
    label: 'Binary Search',
    code: `function binarySearch(arr: number[], target: number) {\n  let lo = 0, hi = arr.length - 1;\n  while (lo <= hi) {\n    const mid = (lo + hi) >> 1;\n    if (arr[mid] === target) return mid;\n    arr[mid] < target ? lo = mid + 1 : hi = mid - 1;\n  }\n  return -1;\n}`,
  },
  {
    label: 'Debounce',
    code: `function debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number) {\n  let timer: ReturnType<typeof setTimeout>;\n  return (...args: Parameters<T>) => {\n    clearTimeout(timer);\n    timer = setTimeout(() => fn(...args), delay);\n  };\n}`,
  },
];

function TypeRacerGame({ onBack }: { onBack: () => void }) {
  const [snippetIdx, setSnippetIdx] = useState(0);
  const [typed,      setTyped]      = useState('');
  const [status,     setStatus]     = useState<'idle' | 'typing' | 'done'>('idle');
  const [startTime,  setStartTime]  = useState<number | null>(null);
  const [elapsed,    setElapsed]    = useState(0);
  const [finalWpm,   setFinalWpm]   = useState(0);
  const [accuracy,   setAccuracy]   = useState(100);
  const [best,       setBest]       = useState(() => parseInt(localStorage.getItem('devos-typeracer-hs') ?? '0'));
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const startRef = useRef<number | null>(null);

  const snippet = CODE_SNIPPETS[snippetIdx].code;

  const reset = useCallback(() => {
    clearInterval(timerRef.current);
    setTyped(''); setStatus('idle'); setStartTime(null); setElapsed(0); setFinalWpm(0); setAccuracy(100);
    startRef.current = null;
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 100); }, []);
  useEffect(() => { reset(); }, [snippetIdx, reset]);

  useEffect(() => {
    if (status === 'typing' && startTime !== null) {
      timerRef.current = setInterval(() => setElapsed((Date.now() - startTime) / 1000), 100);
      return () => clearInterval(timerRef.current);
    }
  }, [status, startTime]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (status === 'done') return;
    if (status === 'idle') { const now = Date.now(); setStatus('typing'); setStartTime(now); startRef.current = now; }
    setTyped(value);
    let correct = 0;
    for (let i = 0; i < value.length; i++) if (value[i] === snippet[i]) correct++;
    setAccuracy(value.length > 0 ? Math.round((correct / value.length) * 100) : 100);
    if (value === snippet) {
      clearInterval(timerRef.current);
      const secs = (Date.now() - (startRef.current ?? Date.now())) / 1000;
      const wpm = Math.round((snippet.length / 5) / (secs / 60));
      setFinalWpm(wpm); setStatus('done');
      setBest(b => { const nb = Math.max(b, wpm); localStorage.setItem('devos-typeracer-hs', nb.toString()); return nb; });
    }
  };

  const currentWpm = status === 'typing' && elapsed > 0 ? Math.round((typed.length / 5) / (elapsed / 60)) : finalWpm;
  const progress = (typed.length / snippet.length) * 100;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <GameHeader
        title="Type Racer"
        score={currentWpm > 0 ? `${currentWpm} WPM` : '--'}
        best={best > 0 ? `${best} WPM` : '--'}
        scoreLabel="Current" bestLabel="Best"
        onBack={onBack} onReset={reset}
      >
        <div className="text-center mr-2">
          <div className="text-xs text-text-secondary">Accuracy</div>
          <div className={`text-sm font-bold ${accuracy >= 95 ? 'text-green-400' : accuracy >= 80 ? 'text-yellow-400' : 'text-red-400'}`}>{accuracy}%</div>
        </div>
        <div className="text-center mr-2">
          <div className="text-xs text-text-secondary">Time</div>
          <div className="text-sm font-bold text-text font-mono">{elapsed.toFixed(1)}s</div>
        </div>
      </GameHeader>

      <div className="flex-1 flex flex-col gap-4 p-5 bg-surface/20 overflow-auto">
        {/* Snippet selector */}
        <div className="flex items-center gap-2 flex-wrap">
          {CODE_SNIPPETS.map((s, i) => (
            <button key={i} onClick={() => setSnippetIdx(i)} className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${snippetIdx === i ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/5 text-text-secondary hover:bg-white/10 border border-white/10'}`}>
              {s.label}
            </button>
          ))}
        </div>

        {/* Progress bar */}
        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full transition-all duration-100" style={{ width: `${Math.min(progress, 100)}%` }} />
        </div>

        {/* Snippet display */}
        <div className="glass-subtle rounded-xl p-4 border border-white/10 font-mono text-sm leading-loose select-none overflow-auto max-h-48">
          {snippet.split('').map((char, i) => {
            const typedChar = typed[i];
            const isCursor = i === typed.length;
            let cls = 'text-text-secondary/40';
            if (typedChar !== undefined) cls = typedChar === char ? 'text-emerald-400' : 'text-red-400 bg-red-500/25 rounded-sm';
            if (isCursor && status !== 'done') cls += ' border-l-2 border-accent';
            if (char === '\n') return <span key={i}><span className={cls}>↵</span>{'\n'}</span>;
            return <span key={i} className={cls}>{char === ' ' ? '\u00A0' : char}</span>;
          })}
        </div>

        {/* Input */}
        <textarea
          ref={inputRef}
          value={typed}
          onChange={handleChange}
          disabled={status === 'done'}
          placeholder={status === 'idle' ? 'Start typing to begin the timer...' : ''}
          className="w-full h-24 font-mono text-sm p-3 rounded-xl bg-black/30 border border-white/15 focus:border-accent/50 focus:outline-none text-text resize-none placeholder:text-text-secondary/40 disabled:opacity-60"
          autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
        />

        {/* Completion */}
        <AnimatePresence>
          {status === 'done' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-subtle rounded-xl p-4 border border-emerald-500/30 bg-emerald-500/5">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 size={22} className="text-emerald-400 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-text text-sm">{finalWpm >= best && finalWpm > 0 ? '🏆 New Personal Best!' : '✓ Snippet complete!'}</p>
                    <p className="text-xs text-text-secondary">{elapsed.toFixed(1)}s · {accuracy}% accuracy · <span className="text-emerald-400 font-bold">{finalWpm} WPM</span></p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={reset} className="px-4 py-2 rounded-lg bg-white/10 text-text text-xs font-medium hover:bg-white/20 transition-all">Retry</button>
                  <button onClick={() => setSnippetIdx(i => (i + 1) % CODE_SNIPPETS.length)} className="px-4 py-2 rounded-lg bg-emerald-500 text-white text-xs font-medium hover:bg-emerald-400 transition-all">Next snippet →</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="text-center py-2 text-xs text-text-secondary border-t border-white/10 flex-shrink-0">
        Type exactly — capitalization and punctuation count
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Root
// ─────────────────────────────────────────────────────────────────────────────

export default function GamesApp() {
  const [game, setGame] = useState<GameId>('launcher');
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <AnimatePresence mode="wait">
        {game === 'launcher'  && <motion.div key="launcher"  className="h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><Launcher onSelect={setGame} /></motion.div>}
        {game === 'snake'     && <motion.div key="snake"     className="h-full flex flex-col" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><SnakeGameView  onBack={() => setGame('launcher')} /></motion.div>}
        {game === 'tetris'    && <motion.div key="tetris"    className="h-full flex flex-col" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><TetrisGame     onBack={() => setGame('launcher')} /></motion.div>}
        {game === 'typeracer' && <motion.div key="typeracer" className="h-full flex flex-col" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><TypeRacerGame  onBack={() => setGame('launcher')} /></motion.div>}
      </AnimatePresence>
    </div>
  );
}
