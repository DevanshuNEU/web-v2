/**
 * Reachability oracle for Main Character levels: a breadth-first search over
 * tile cells where the hero can stand or cling to a wall. Moves come from
 * trajectory templates built once from PHYS with conservative margins
 * (slower runs, lower jumps, shorter dashes, coarse dash timings, centred
 * take-offs), then swept against the level's tiles: a landing makes a
 * standing node, a side hit in the air makes a wall node, a head bump or a
 * fall out of the level ends the move. If this says a goal is reachable, a
 * player with ordinary timing can reach it.
 *
 * `generous` flips the margins the other way (full speeds, jump from the very
 * edge with coyote time), to prove a gap really needs a move: if even the
 * generous search cannot cross without the dash, the dash is required.
 */

import { PHYS } from '@/components/apps/games/platformer/sim/physics';
import { ROWS, TILE, isSolidTile, type Level } from '@/components/apps/games/platformer/sim/level';

export interface ReachOpts { dash: boolean; wallJump: boolean; generous?: boolean }

interface Template { pts: Float64Array }
interface Spec { dir: number; vx0: number; vy0: number; hold: boolean; steerDelay: number; dashAt: number; lockT: number }

const W = PHYS.heroW, H = PHYS.heroH;
const EPS = 1e-6;

function margins(generous: boolean) {
  return generous
    ? { mx: 1, mv: 1, md: 1, air: 1 }
    // The dash always covers the same distance; its margin is in the coarse timings.
    : { mx: 0.85, mv: 0.92, md: 1, air: 0.8 };
}

/** Integrate one move from (0, 0) = box left, feet. Samples no more than 0.2 tiles apart. */
function simulate(s: Spec, generous: boolean): Template {
  const m = margins(generous);
  const out: number[] = [];
  const dt = 1 / 240;
  let x = 0, y = 0, vx = s.vx0, vy = s.vy0, t = 0, dashLeft = 0, dashed = false;
  let lx = 0, ly = 0;
  const runMax = PHYS.runMax * m.mx;
  // Every landing in a 14 row level happens well inside 1.6 s.
  while (t < 1.6 && y < ROWS + 2) {
    if (!dashed && s.dashAt >= 0 && t >= s.dashAt) { dashed = true; dashLeft = PHYS.dashTime; }
    if (dashLeft > 0) {
      vx = s.dir * PHYS.dashSpeed * m.md; vy = 0;
      dashLeft -= dt;
      if (dashLeft <= 0) vx = s.dir * runMax;
    } else {
      if (t >= s.lockT) {
        const target = (t < s.steerDelay ? 0 : s.dir) * runMax;
        const a = PHYS.accelAir * m.air * dt;
        vx = vx < target ? Math.min(target, vx + a) : Math.max(target, vx - a);
      }
      const g = vy < 0 && s.hold ? PHYS.gravityHold : PHYS.gravity;
      vy = Math.min(PHYS.terminal, vy + g * dt);
    }
    x += vx * dt; y += vy * dt; t += dt;
    if (Math.hypot(x - lx, y - ly) >= 0.2) { out.push(x, y); lx = x; ly = y; }
  }
  out.push(x, y);
  return { pts: Float64Array.from(out) };
}

interface Templates { jump: Template[][][]; fall: Template[][][]; wall: Template[][] }

const cache = new Map<string, Templates>();

/** Templates indexed [dir 0 = left, 1 = right][running 0/1][...]. */
function templates(dash: boolean, generous: boolean): Templates {
  const key = `${dash}${generous}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const m = margins(generous);
  const dashes = dash ? [-1, 0.08, 0.2, 0.32, 0.45, 0.6] : [-1];
  const jump: Template[][][] = [[[], []], [[], []]];
  const fall: Template[][][] = [[[], []], [[], []]];
  const wall: Template[][] = [[], []];
  for (const di of [0, 1]) {
    const dir = di === 0 ? -1 : 1;
    for (const run of [0, 1]) {
      const vx0 = dir * PHYS.runMax * m.mx * (run || generous ? 1 : 0);
      for (const hold of [true, false]) {
        for (const steerDelay of hold ? [0, 0.22] : [0]) {
          for (const dashAt of dashes) {
            const vy0 = -(hold ? PHYS.jumpV : PHYS.jumpCut) * m.mv;
            jump[di][run].push(simulate({ dir, vx0: steerDelay > 0 ? 0 : vx0, vy0, hold, steerDelay, dashAt, lockT: 0 }, generous));
          }
        }
      }
      for (const dashAt of dash ? [-1, 0.05, 0.2, 0.35] : [-1]) {
        fall[di][run].push(simulate({ dir, vx0: vx0 || dir * PHYS.runMax * 0.4, vy0: 0, hold: false, steerDelay: 0, dashAt, lockT: 0 }, generous));
      }
    }
    // Wall jumps off a wall on side `side` (di 0 = wall on the left, 1 = on the right).
    const side = dir;
    for (const steer of [-side, side]) {
      for (const dashAt of dash ? [-1, 0.12, 0.25, 0.4] : [-1]) {
        const s: Spec = { dir: steer, vx0: -side * PHYS.wallJumpX * m.mx, vy0: -PHYS.wallJumpY * m.mv, hold: true, steerDelay: 0, dashAt, lockT: PHYS.wallJumpLock };
        wall[di].push(simulate(s, generous));
      }
    }
  }
  const t = { jump, fall, wall };
  cache.set(key, t);
  return t;
}

/** 1 solid, 2 one-way, 0 open. Out of bounds: solid at the sides, open above and below. */
function grid(level: Level) {
  const cols = level.cols;
  const g = new Uint8Array(cols * ROWS);
  for (let i = 0; i < g.length; i++) {
    const t = level.tiles[i];
    g[i] = isSolidTile(t) ? 1 : t === TILE.ONEWAY ? 2 : 0;
  }
  const at = (x: number, y: number) => (x < 0 || x >= cols ? 1 : y < 0 || y >= ROWS ? 0 : g[y * cols + x]);
  return { cols, at };
}

export interface ReachResult { reached: boolean; nodes: number; maxX: number; minX: number }

export function reach(level: Level, opts: ReachOpts): ReachResult {
  const { cols, at } = grid(level);
  const T = templates(opts.dash, !!opts.generous);
  const solid = (x: number, y: number) => at(x, y) === 1;
  const floorAt = (x: number, y: number) => at(x, y) !== 0;
  const clear = (x: number, y: number) => !solid(x, y) && !solid(x, y - 1);
  const standable = (x: number, y: number) => y >= 1 && y < ROWS && clear(x, y) && floorAt(x, y + 1);

  // Node id: (x * ROWS + y) * 3 + kind; kind 0 stand, 1 wall on the left, 2 wall on the right.
  const seen = new Uint8Array(cols * ROWS * 3);
  const queue: number[] = [];
  const push = (x: number, y: number, kind: number) => {
    if (x < 0 || x >= cols || y < 0 || y >= ROWS) return;
    const id = (x * ROWS + y) * 3 + kind;
    if (seen[id]) return;
    seen[id] = 1;
    queue.push(id);
  };

  const goal = level.goal;
  const atGoal = (x: number, y: number) => Math.abs(x - goal.x) <= 1 && y >= goal.top - 1 && y <= goal.base;
  let reached = false, maxX = 0, minX = cols;

  const boxHits = (x: number, f: number) => {
    const c0 = Math.floor(x + EPS), c1 = Math.floor(x + W - EPS);
    const r0 = Math.floor(f - H + EPS), r1 = Math.floor(f - EPS);
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (solid(c, r)) return true;
    return false;
  };

  /** Sweep one template from box (bx, feet by); push the node it ends on. */
  const sweep = (tp: Template, bx: number, by: number) => {
    const p = tp.pts;
    let px = bx, pf = by;
    for (let i = 0; i < p.length; i += 2) {
      const x = bx + p[i], f = by + p[i + 1];
      if (f > ROWS + 1) return;
      const c0 = Math.floor(x + EPS), c1 = Math.floor(x + W - EPS);
      const r1 = Math.floor(f - EPS);
      // Landing: the feet crossed into a row with a floor under the box.
      if (f > pf) {
        const rf = r1;
        if (pf <= rf + EPS) {
          const cx = Math.floor(x + W / 2);
          let land = -1;
          for (let c = c0; c <= c1; c++) if (floorAt(c, rf) && !solid(c, rf - 1) && (land < 0 || c === cx)) land = c;
          if (land >= 0) {
            if (standable(land, rf - 1)) push(land, rf - 1, 0);
            return;
          }
        }
      }
      if (boxHits(x, f)) {
        // Only the sideways part of the move hits: a wall to cling to.
        // Anything else (a head bump, a corner) ends the move.
        const side = x > px + EPS ? 1 : x < px - EPS ? -1 : 0;
        if (side !== 0 && boxHits(x, pf) && !boxHits(px, f)) {
          const cx = Math.floor(px + W / 2), cy = Math.floor(pf - EPS);
          if (cy >= 1 && clear(cx, cy) && (solid(cx + side, cy) || solid(cx + side, cy - 1))) push(cx, cy, side < 0 ? 1 : 2);
        }
        return;
      }
      px = x; pf = f;
    }
  };

  const s = level.start;
  push(s.x, s.y - 1, 0);
  let head = 0;
  while (head < queue.length && !reached) {
    const id = queue[head++];
    const kind = id % 3, cell = (id - kind) / 3;
    const x = Math.floor(cell / ROWS), y = cell % ROWS;
    if (atGoal(x, y)) { reached = true; break; }
    maxX = Math.max(maxX, x); minX = Math.min(minX, x);
    if (kind === 0) {
      for (const d of [-1, 1]) {
        const di = d < 0 ? 0 : 1;
        const nx = x + d;
        if (clear(nx, y)) {
          if (floorAt(nx, y + 1)) push(nx, y, 0);
          else {
            const run = standable(x - d, y) ? 1 : 0;
            const bx = x + 0.5 - W / 2 + d * 0.6;
            for (const tp of T.fall[di][run]) sweep(tp, bx, y + 1);
          }
        }
        const run = standable(x - d, y) && standable(x - 2 * d, y) ? 1 : 0;
        let bx = x + 0.5 - W / 2;
        // Generous: take off from the very edge, plus coyote time.
        if (opts.generous && !floorAt(nx, y + 1)) bx += d * (0.5 + W / 2 - 0.02 + PHYS.coyote * PHYS.runMax);
        for (const tp of T.jump[di][run]) sweep(tp, bx, y + 1);
      }
    } else {
      const side = kind === 1 ? -1 : 1;
      // Slide down the wall to the floor below.
      for (let yy = y; yy < ROWS; yy++) {
        if (!clear(x, yy)) break;
        if (floorAt(x, yy + 1)) { push(x, yy, 0); break; }
      }
      if (opts.wallJump) {
        const bx = side > 0 ? x + 1 - W : x;
        for (const tp of T.wall[side < 0 ? 0 : 1]) sweep(tp, bx, y + 1);
      }
    }
  }
  return { reached, nodes: queue.length, maxX, minX };
}

export function reachesGoal(level: Level, opts: ReachOpts): boolean {
  return reach(level, opts).reached;
}
