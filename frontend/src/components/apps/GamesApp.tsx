'use client';

/**
 * GamesApp — Arcade Launcher
 *
 * Three games, one window: Snake, Minesweeper, 2048.
 * A nod to the origins: Nokia 3310, Minesweeper procrastination, late-night 2048.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Trophy, RotateCcw } from 'lucide-react';

type GameId = 'launcher' | 'snake' | 'minesweeper' | '2048';

// ---------------------------------------------------------------------------
// Launcher
// ---------------------------------------------------------------------------

const GAMES = [
  {
    id: 'snake' as GameId,
    title: 'Snake',
    subtitle: 'Nokia 3310 edition',
    description: 'Arrow keys / WASD to move. Do not eat yourself.',
    color: '#22c55e',
    emoji: '🐍',
    hsKey: 'devos-snake-hs',
  },
  {
    id: 'minesweeper' as GameId,
    title: 'Minesweeper',
    subtitle: 'Classic Windows XP vibes',
    description: 'Left click to reveal. Right click to flag. Do not explode.',
    color: '#6366f1',
    emoji: '💣',
    hsKey: 'devos-ms-hs',
  },
  {
    id: '2048' as GameId,
    title: '2048',
    subtitle: 'The one you said you\'d stop playing',
    description: 'Arrow keys / WASD. Reach 2048. Or just 256. No judgment.',
    color: '#f59e0b',
    emoji: '🔢',
    hsKey: 'devos-2048-hs',
  },
] as const;

function Launcher({ onSelect }: { onSelect: (id: GameId) => void }) {
  const scores = GAMES.map(g => ({
    ...g,
    hs: typeof window !== 'undefined' ? localStorage.getItem(g.hsKey) ?? '0' : '0',
  }));

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 bg-surface/20">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl space-y-6"
      >
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-text">Arcade</h1>
          <p className="text-text-secondary text-sm">Three classics. One tab. Zero productivity.</p>
        </div>

        <div className="space-y-3">
          {scores.map((game, idx) => (
            <motion.button
              key={game.id}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.08, type: 'spring', damping: 20, stiffness: 240 }}
              onClick={() => onSelect(game.id)}
              className="w-full flex items-center gap-4 p-4 rounded-xl glass-subtle border border-white/10 hover:border-white/25 transition-all group text-left"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                style={{ background: `${game.color}15`, border: `1px solid ${game.color}30` }}
              >
                {game.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-text">{game.title}</span>
                  <span className="text-xs text-text-secondary italic">{game.subtitle}</span>
                </div>
                <p className="text-xs text-text-secondary mt-0.5">{game.description}</p>
              </div>
              {parseInt(game.hs) > 0 && (
                <div className="flex items-center gap-1 text-xs flex-shrink-0" style={{ color: game.color }}>
                  <Trophy size={11} />
                  <span className="font-mono font-medium">{game.hs}</span>
                </div>
              )}
              <div className="text-text-secondary group-hover:text-text transition-colors text-xs">
                Play →
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Back bar shared by all games
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// SNAKE
// ---------------------------------------------------------------------------

const SNAKE_GRID = 20;

function SnakeGameView({ onBack }: { onBack: () => void }) {
  const [cellSize, setCellSize] = useState(18);
  const [snake, setSnake] = useState([{ x: 10, y: 10 }]);
  const [food, setFood] = useState({ x: 15, y: 15 });
  const [direction, setDirection] = useState<'UP'|'DOWN'|'LEFT'|'RIGHT'>('RIGHT');
  const [status, setStatus] = useState<'idle'|'playing'|'paused'|'over'>('idle');
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => parseInt(localStorage.getItem('devos-snake-hs') ?? '0'));
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const loopRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const dirRef = useRef(direction);
  dirRef.current = direction;

  useEffect(() => {
    const obs = new ResizeObserver(() => {
      if (containerRef.current) {
        setCellSize(containerRef.current.clientHeight > 500 ? 22 : 18);
      }
    });
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const randFood = useCallback(() => ({
    x: Math.floor(Math.random() * SNAKE_GRID),
    y: Math.floor(Math.random() * SNAKE_GRID),
  }), []);

  const startGame = useCallback(() => {
    setSnake([{ x: 10, y: 10 }]);
    setFood(randFood());
    setDirection('RIGHT');
    setScore(0);
    setStatus('playing');
  }, [randFood]);

  const loop = useCallback(() => {
    setSnake(prev => {
      const head = { ...prev[0] };
      if (dirRef.current === 'UP') head.y--;
      if (dirRef.current === 'DOWN') head.y++;
      if (dirRef.current === 'LEFT') head.x--;
      if (dirRef.current === 'RIGHT') head.x++;
      if (head.x < 0 || head.x >= SNAKE_GRID || head.y < 0 || head.y >= SNAKE_GRID ||
          prev.some(s => s.x === head.x && s.y === head.y)) {
        setStatus('over');
        setScore(s => {
          const ns = s;
          setBest(b => {
            const nb = Math.max(b, ns);
            localStorage.setItem('devos-snake-hs', nb.toString());
            return nb;
          });
          return s;
        });
        return prev;
      }
      const next = [head, ...prev];
      setFood(f => {
        if (head.x === f.x && head.y === f.y) {
          setScore(s => s + 1);
          return randFood();
        }
        next.pop();
        return f;
      });
      return next;
    });
  }, [randFood]);

  useEffect(() => {
    if (status === 'playing') {
      loopRef.current = setInterval(loop, 140);
      return () => clearInterval(loopRef.current);
    }
  }, [status, loop]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, 'UP'|'DOWN'|'LEFT'|'RIGHT'> = {
        ArrowUp: 'UP', w: 'UP', W: 'UP',
        ArrowDown: 'DOWN', s: 'DOWN', S: 'DOWN',
        ArrowLeft: 'LEFT', a: 'LEFT', A: 'LEFT',
        ArrowRight: 'RIGHT', d: 'RIGHT', D: 'RIGHT',
      };
      const opp: Record<string, string> = { UP:'DOWN', DOWN:'UP', LEFT:'RIGHT', RIGHT:'LEFT' };
      const d = map[e.key];
      if (d && d !== opp[dirRef.current]) {
        e.preventDefault();
        setDirection(d);
      }
      if (e.key === ' ') { e.preventDefault(); setStatus(s => s === 'playing' ? 'paused' : s === 'paused' ? 'playing' : s); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const s = SNAKE_GRID * cellSize;
    ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = '#1a1a1a';
    for (let x = 0; x < SNAKE_GRID; x++) for (let y = 0; y < SNAKE_GRID; y++) {
      if ((x + y) % 2 === 0) ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
    }
    snake.forEach((seg, i) => {
      ctx.fillStyle = i === 0 ? '#4ade80' : '#22c55e';
      ctx.beginPath();
      ctx.roundRect(seg.x * cellSize + 1, seg.y * cellSize + 1, cellSize - 2, cellSize - 2, 3);
      ctx.fill();
    });
    ctx.fillStyle = '#f87171';
    ctx.beginPath();
    ctx.roundRect(food.x * cellSize + 2, food.y * cellSize + 2, cellSize - 4, cellSize - 4, cellSize / 2);
    ctx.fill();
  }, [snake, food, cellSize]);

  const canvasSize = SNAKE_GRID * cellSize;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <GameHeader title="Snake" score={score} best={best} onBack={onBack} onReset={startGame} />
      <div ref={containerRef} className="flex-1 flex items-center justify-center p-4 bg-surface/20 overflow-hidden">
        <div className="relative">
          <canvas ref={canvasRef} width={canvasSize} height={canvasSize}
            className="rounded-xl shadow-2xl border border-white/10" />
          {status !== 'playing' && (
            <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/60 backdrop-blur-sm">
              {status === 'idle' && (
                <button onClick={startGame} className="px-8 py-3 bg-green-500 text-white font-bold rounded-xl hover:bg-green-400 transition-all shadow-lg">
                  Start
                </button>
              )}
              {status === 'paused' && (
                <button onClick={() => setStatus('playing')} className="px-8 py-3 bg-green-500 text-white font-bold rounded-xl hover:bg-green-400 transition-all">
                  Resume
                </button>
              )}
              {status === 'over' && (
                <div className="text-center space-y-3">
                  <p className="text-white font-bold text-xl">Game Over</p>
                  <p className="text-white/70 text-sm">Score: {score}</p>
                  {score > 0 && score === best && <p className="text-green-400 text-sm font-medium">New Best!</p>}
                  <button onClick={startGame} className="px-8 py-3 bg-green-500 text-white font-bold rounded-xl hover:bg-green-400 transition-all">
                    Play Again
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="text-center py-2 text-xs text-text-secondary border-t border-white/10">
        Arrow keys / WASD · Space to pause
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MINESWEEPER
// ---------------------------------------------------------------------------

type MSCell = { mine: boolean; revealed: boolean; flagged: boolean; adjacent: number };

const MS_ROWS = 9, MS_COLS = 9, MS_MINES = 10;

function buildBoard(firstR: number, firstC: number): MSCell[][] {
  const board: MSCell[][] = Array.from({ length: MS_ROWS }, () =>
    Array.from({ length: MS_COLS }, () => ({ mine: false, revealed: false, flagged: false, adjacent: 0 }))
  );
  let placed = 0;
  while (placed < MS_MINES) {
    const r = Math.floor(Math.random() * MS_ROWS);
    const c = Math.floor(Math.random() * MS_COLS);
    if (!board[r][c].mine && !(Math.abs(r - firstR) <= 1 && Math.abs(c - firstC) <= 1)) {
      board[r][c].mine = true;
      placed++;
    }
  }
  for (let r = 0; r < MS_ROWS; r++) {
    for (let c = 0; c < MS_COLS; c++) {
      if (board[r][c].mine) continue;
      let count = 0;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < MS_ROWS && nc >= 0 && nc < MS_COLS && board[nr][nc].mine) count++;
      }
      board[r][c].adjacent = count;
    }
  }
  return board;
}

function flood(board: MSCell[][], r: number, c: number) {
  if (r < 0 || r >= MS_ROWS || c < 0 || c >= MS_COLS) return;
  const cell = board[r][c];
  if (cell.revealed || cell.flagged || cell.mine) return;
  cell.revealed = true;
  if (cell.adjacent === 0) {
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) flood(board, r + dr, c + dc);
  }
}

const MS_NUM_COLORS = ['', '#3b82f6','#16a34a','#ef4444','#7c3aed','#b91c1c','#0891b2','#000','#6b7280'];

function MinesweeperGame({ onBack }: { onBack: () => void }) {
  const [board, setBoard] = useState<MSCell[][] | null>(null);
  const [status, setStatus] = useState<'idle'|'playing'|'won'|'lost'>('idle');
  const [flags, setFlags] = useState(0);
  const [time, setTime] = useState(0);
  const [best, setBest] = useState(() => parseInt(localStorage.getItem('devos-ms-hs') ?? '0'));
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const reset = () => { setBoard(null); setStatus('idle'); setFlags(0); setTime(0); clearInterval(timerRef.current); };

  useEffect(() => {
    if (status === 'playing') {
      timerRef.current = setInterval(() => setTime(t => t + 1), 1000);
      return () => clearInterval(timerRef.current);
    }
  }, [status]);

  const handleClick = (r: number, c: number) => {
    if (status === 'won' || status === 'lost') return;
    let b: MSCell[][];
    if (!board) {
      b = buildBoard(r, c);
      setStatus('playing');
    } else {
      b = board.map(row => row.map(cell => ({ ...cell })));
    }
    if (b[r][c].flagged || b[r][c].revealed) return;
    if (b[r][c].mine) {
      b.forEach(row => row.forEach(cell => { if (cell.mine) cell.revealed = true; }));
      setBoard(b); setStatus('lost'); clearInterval(timerRef.current); return;
    }
    flood(b, r, c);
    setBoard(b);
    const remaining = b.flat().filter(cell => !cell.mine && !cell.revealed).length;
    if (remaining === 0) {
      setStatus('won'); clearInterval(timerRef.current);
      setBest(prev => {
        const nb = prev === 0 ? time : Math.min(prev, time);
        localStorage.setItem('devos-ms-hs', nb.toString());
        return nb;
      });
    }
  };

  const handleRight = (e: React.MouseEvent, r: number, c: number) => {
    e.preventDefault();
    if (!board || board[r][c].revealed || status === 'won' || status === 'lost') return;
    const b = board.map(row => row.map(cell => ({ ...cell })));
    b[r][c].flagged = !b[r][c].flagged;
    setFlags(f => b[r][c].flagged ? f + 1 : f - 1);
    setBoard(b);
  };

  const cellColor = (cell: MSCell) => {
    if (!cell.revealed) return cell.flagged ? 'bg-red-500/20 border-red-500/40' : 'bg-white/8 border-white/15 hover:bg-white/14 cursor-pointer';
    if (cell.mine) return 'bg-red-600 border-red-500';
    return 'bg-white/4 border-white/8';
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <GameHeader
        title="Minesweeper" scoreLabel="Mines" score={MS_MINES - flags}
        bestLabel="Best" best={best > 0 ? `${best}s` : '--'}
        onBack={onBack} onReset={reset}
      >
        <div className="text-xs text-text-secondary font-mono w-12 text-center">{String(time).padStart(3, '0')}s</div>
      </GameHeader>
      <div className="flex-1 flex items-center justify-center p-6 bg-surface/20 overflow-hidden">
        <div className="relative">
          <div className="inline-grid gap-0.5" style={{ gridTemplateColumns: `repeat(${MS_COLS}, 1fr)` }}>
            {(board ?? Array.from({ length: MS_ROWS }, () => Array.from({ length: MS_COLS }, () => ({ mine: false, revealed: false, flagged: false, adjacent: 0 })))).map((row, r) =>
              row.map((cell, c) => (
                <button
                  key={`${r}-${c}`}
                  className={`w-8 h-8 rounded text-xs font-bold border transition-colors select-none ${cellColor(cell)}`}
                  onClick={() => handleClick(r, c)}
                  onContextMenu={e => handleRight(e, r, c)}
                >
                  {cell.flagged && !cell.revealed ? '🚩' :
                   cell.revealed && cell.mine ? '💣' :
                   cell.revealed && cell.adjacent > 0 ? (
                     <span style={{ color: MS_NUM_COLORS[cell.adjacent] }}>{cell.adjacent}</span>
                   ) : null}
                </button>
              ))
            )}
          </div>
          {(status === 'won' || status === 'lost') && (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/60 backdrop-blur-sm">
              <div className="text-center space-y-3">
                <p className="text-white font-bold text-xl">{status === 'won' ? '🎉 You Win!' : '💥 Boom'}</p>
                {status === 'won' && <p className="text-white/70 text-sm">Time: {time}s</p>}
                <button onClick={reset} className="px-6 py-2.5 bg-indigo-500 text-white font-bold rounded-xl hover:bg-indigo-400 transition-all">
                  Play Again
                </button>
              </div>
            </div>
          )}
          {status === 'idle' && (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50 backdrop-blur-sm">
              <p className="text-white/80 text-sm">Click any cell to start</p>
            </div>
          )}
        </div>
      </div>
      <div className="text-center py-2 text-xs text-text-secondary border-t border-white/10">
        Left click to reveal · Right click to flag
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2048
// ---------------------------------------------------------------------------

type TGrid = (number | 0)[][];

function newGrid(): TGrid {
  const g: TGrid = Array.from({ length: 4 }, () => [0, 0, 0, 0]);
  addTile(g); addTile(g);
  return g;
}

function addTile(g: TGrid) {
  const empty: [number, number][] = [];
  g.forEach((row, r) => row.forEach((v, c) => { if (!v) empty.push([r, c]); }));
  if (!empty.length) return;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  g[r][c] = Math.random() < 0.9 ? 2 : 4;
}

function slideRow(row: number[]): { row: number[]; score: number } {
  const nums = row.filter(Boolean);
  let score = 0;
  const merged: number[] = [];
  let i = 0;
  while (i < nums.length) {
    if (i + 1 < nums.length && nums[i] === nums[i + 1]) {
      merged.push(nums[i] * 2);
      score += nums[i] * 2;
      i += 2;
    } else {
      merged.push(nums[i]);
      i++;
    }
  }
  while (merged.length < 4) merged.push(0);
  return { row: merged, score };
}

function move(g: TGrid, dir: 'left'|'right'|'up'|'down'): { grid: TGrid; score: number; moved: boolean } {
  let total = 0, moved = false;
  const ng: TGrid = g.map(r => [...r]);
  const slide = (row: number[]) => slideRow(row);
  if (dir === 'left') {
    for (let r = 0; r < 4; r++) {
      const { row, score } = slide(ng[r]);
      if (row.some((v, i) => v !== ng[r][i])) moved = true;
      ng[r] = row; total += score;
    }
  } else if (dir === 'right') {
    for (let r = 0; r < 4; r++) {
      const { row, score } = slide([...ng[r]].reverse());
      const rev = row.reverse();
      if (rev.some((v, i) => v !== ng[r][i])) moved = true;
      ng[r] = rev; total += score;
    }
  } else if (dir === 'up') {
    for (let c = 0; c < 4; c++) {
      const col = ng.map(r => r[c]);
      const { row, score } = slide(col);
      if (row.some((v, i) => v !== col[i])) moved = true;
      row.forEach((v, r) => { ng[r][c] = v; }); total += score;
    }
  } else {
    for (let c = 0; c < 4; c++) {
      const col = ng.map(r => r[c]).reverse();
      const { row, score } = slide(col);
      const rev = row.reverse();
      if (rev.some((v, i) => v !== ng[ng.length - 1 - i]?.[c])) moved = true;
      rev.forEach((v, r) => { ng[r][c] = v; }); total += score;
    }
  }
  return { grid: ng, score: total, moved };
}

const TILE_STYLES: Record<number, string> = {
  0:    'bg-white/5 text-transparent',
  2:    'bg-amber-50   text-stone-700',
  4:    'bg-amber-100  text-stone-700',
  8:    'bg-orange-300 text-white',
  16:   'bg-orange-400 text-white',
  32:   'bg-orange-500 text-white',
  64:   'bg-red-500    text-white',
  128:  'bg-yellow-400 text-white',
  256:  'bg-yellow-500 text-white',
  512:  'bg-yellow-600 text-white',
  1024: 'bg-amber-600  text-white',
  2048: 'bg-amber-500  text-white shadow-[0_0_20px_#f59e0b]',
};

function TwoZeroFourEight({ onBack }: { onBack: () => void }) {
  const [grid, setGrid] = useState<TGrid>(newGrid);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => parseInt(localStorage.getItem('devos-2048-hs') ?? '0'));
  const [won, setWon] = useState(false);
  const [over, setOver] = useState(false);

  const reset = () => { setGrid(newGrid()); setScore(0); setWon(false); setOver(false); };

  const doMove = useCallback((dir: 'left'|'right'|'up'|'down') => {
    if (over) return;
    setGrid(g => {
      const { grid: ng, score: ds, moved } = move(g, dir);
      if (!moved) return g;
      addTile(ng);
      setScore(s => {
        const ns = s + ds;
        setBest(b => {
          const nb = Math.max(b, ns);
          localStorage.setItem('devos-2048-hs', nb.toString());
          return nb;
        });
        return ns;
      });
      if (ng.flat().includes(2048)) setWon(true);
      const hasMoves = (['left','right','up','down'] as const).some(d => move(ng, d).moved);
      if (!hasMoves) setOver(true);
      return ng;
    });
  }, [over]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, 'left'|'right'|'up'|'down'> = {
        ArrowLeft:'left', a:'left', A:'left',
        ArrowRight:'right', d:'right', D:'right',
        ArrowUp:'up', w:'up', W:'up',
        ArrowDown:'down', s:'down', S:'down',
      };
      const d = map[e.key];
      if (d) { e.preventDefault(); doMove(d); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [doMove]);

  // Touch support
  const touchStart = useRef<{x:number;y:number}|null>(null);
  const onTouchStart = (e: React.TouchEvent) => { touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
    if (Math.abs(dx) > Math.abs(dy)) doMove(dx > 0 ? 'right' : 'left');
    else doMove(dy > 0 ? 'down' : 'up');
    touchStart.current = null;
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <GameHeader title="2048" score={score} best={best} onBack={onBack} onReset={reset} />
      <div
        className="flex-1 flex items-center justify-center p-6 bg-surface/20 overflow-hidden"
        onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
      >
        <div className="relative">
          <div className="grid grid-cols-4 gap-2 p-3 rounded-2xl bg-black/20 border border-white/10">
            {grid.flat().map((val, idx) => (
              <motion.div
                key={idx}
                layout
                animate={{ scale: val ? [0.85, 1] : 1 }}
                transition={{ type: 'spring', damping: 18, stiffness: 300 }}
                className={`w-16 h-16 flex items-center justify-center rounded-xl text-lg font-black select-none ${TILE_STYLES[val] ?? 'bg-amber-700 text-white'}`}
              >
                {val || ''}
              </motion.div>
            ))}
          </div>
          {(won || over) && (
            <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/60 backdrop-blur-sm">
              <div className="text-center space-y-3">
                <p className="text-white font-bold text-xl">{won ? '🏆 2048!' : '💀 Game Over'}</p>
                <p className="text-white/70 text-sm">Score: {score}</p>
                <button onClick={reset} className="px-6 py-2.5 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-400 transition-all">
                  {won ? 'Keep Going' : 'Try Again'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="text-center py-2 text-xs text-text-secondary border-t border-white/10">
        Arrow keys / WASD · Swipe on mobile
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

export default function GamesApp() {
  const [game, setGame] = useState<GameId>('launcher');

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <AnimatePresence mode="wait">
        {game === 'launcher' && (
          <motion.div key="launcher" className="h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Launcher onSelect={setGame} />
          </motion.div>
        )}
        {game === 'snake' && (
          <motion.div key="snake" className="h-full flex flex-col" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <SnakeGameView onBack={() => setGame('launcher')} />
          </motion.div>
        )}
        {game === 'minesweeper' && (
          <motion.div key="minesweeper" className="h-full flex flex-col" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <MinesweeperGame onBack={() => setGame('launcher')} />
          </motion.div>
        )}
        {game === '2048' && (
          <motion.div key="2048" className="h-full flex flex-col" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <TwoZeroFourEight onBack={() => setGame('launcher')} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
