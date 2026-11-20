/**
 * Snake rules, kept pure so they can be tested without a canvas.
 *
 * Turns go into a short queue and each one is checked against the last
 * queued direction, not the live one. Two fast swipes (up, then left while
 * moving right) used to pass the reversal guard one at a time and steer the
 * head straight back into the body inside a single tick.
 */

export const SNAKE_GRID = 20;

export type Dir = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
export type Cell = { x: number; y: number };
export type SnakeSpeed = 'chill' | 'classic' | 'fast';

export interface SnakeState {
  body: Cell[];
  /** Body before the last step, for drawing between ticks. */
  prev: Cell[];
  dir: Dir;
  queue: Dir[];
  food: Cell;
  score: number;
  over: boolean;
  /** True on the step that ate food. */
  ate: boolean;
}

/** Milliseconds per move: start speed, and the floor it ramps down to. */
export const SNAKE_SPEEDS: Record<SnakeSpeed, { start: number; floor: number; label: string }> = {
  chill:   { start: 220, floor: 130, label: 'Chill' },
  classic: { start: 160, floor: 90,  label: 'Classic' },
  fast:    { start: 120, floor: 70,  label: 'Fast' },
};

/** Each apple takes this many ms off the move time. */
const RAMP_PER_APPLE = 4;
const MAX_QUEUE = 2;

const OPPOSITE: Record<Dir, Dir> = { UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT' };

export function tickMs(speed: SnakeSpeed, score: number): number {
  const { start, floor } = SNAKE_SPEEDS[speed];
  return Math.max(floor, start - score * RAMP_PER_APPLE);
}

export function randomCell(): Cell {
  return { x: Math.floor(Math.random() * SNAKE_GRID), y: Math.floor(Math.random() * SNAKE_GRID) };
}

export function createSnake(pick: () => Cell = randomCell): SnakeState {
  const body = [{ x: 10, y: 10 }];
  return { body, prev: body, dir: 'RIGHT', queue: [], food: placeFood(body, pick), score: 0, over: false, ate: false };
}

export function enqueueTurn(s: SnakeState, d: Dir): SnakeState {
  if (s.over || s.queue.length >= MAX_QUEUE) return s;
  const last = s.queue.length ? s.queue[s.queue.length - 1] : s.dir;
  if (d === last || d === OPPOSITE[last]) return s;
  return { ...s, queue: [...s.queue, d] };
}

function placeFood(body: Cell[], pick: () => Cell): Cell {
  // Bounded retries, then a scan, so a nearly full board can't hang.
  for (let i = 0; i < 64; i++) {
    const c = pick();
    if (!body.some(b => b.x === c.x && b.y === c.y)) return c;
  }
  for (let y = 0; y < SNAKE_GRID; y++)
    for (let x = 0; x < SNAKE_GRID; x++)
      if (!body.some(b => b.x === x && b.y === y)) return { x, y };
  return { x: -1, y: -1 };
}

export function step(s: SnakeState, pick: () => Cell = randomCell): SnakeState {
  if (s.over) return s;
  const [next, ...queue] = s.queue;
  const dir = next ?? s.dir;
  const head = { ...s.body[0] };
  if (dir === 'UP') head.y--;
  if (dir === 'DOWN') head.y++;
  if (dir === 'LEFT') head.x--;
  if (dir === 'RIGHT') head.x++;

  const ate = head.x === s.food.x && head.y === s.food.y;
  // The tail moves away this tick unless she ate, so it is not an obstacle.
  const obstacles = ate ? s.body : s.body.slice(0, -1);
  const hitWall = head.x < 0 || head.x >= SNAKE_GRID || head.y < 0 || head.y >= SNAKE_GRID;
  if (hitWall || obstacles.some(b => b.x === head.x && b.y === head.y)) {
    return { ...s, dir, queue, over: true, ate: false, prev: s.body };
  }

  const body = [head, ...s.body];
  if (!ate) body.pop();
  return {
    ...s,
    body,
    prev: s.body,
    dir,
    queue,
    food: ate ? placeFood(body, pick) : s.food,
    score: ate ? s.score + 1 : s.score,
    ate,
  };
}
