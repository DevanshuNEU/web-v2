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
import { ROWS, TILE, isOneWayTile, isSolidTile, type Level } from '@/components/apps/games/platformer/sim/level';
import { PLATFORM_AMP } from '@/components/apps/games/platformer/sim/world';

interface Box { x: number; y: number; w: number; h: number }

export interface ReachOpts {
  dash: boolean;
  wallJump: boolean;
  /** The always-on double jump (off reproduces the phase 2 numbers). */
  doubleJump?: boolean;
  generous?: boolean;
  /** Boxes to find out whether she can touch (memories, pickups). */
  targets?: readonly Box[];
  /** Start from this standing cell instead of the level start. */
  from?: { x: number; y: number };
  /**
   * Model stomp bounces off the level's drones (at their hover spots): landing
   * on one bounces her up as a held stomp bounce (no double jump after it).
   */
  bounces?: boolean;
  /** Record every move as an edge (for "can she always get back to the goal" checks). */
  graph?: boolean;
  /**
   * Ride the level's vehicles (on unless false). A lane's roof cells count as
   * one-way floors (she can wait anywhere for the next one); standing on one
   * she is carried to any cell further along the lane, never back.
   */
  vehicles?: boolean;
  /** Cracked panels (%) count as open: a dash smashes them. Only with `dash`. */
  smash?: boolean;
}

interface Template { pts: Float64Array }
interface Spec { dir: number; vx0: number; vy0: number; hold: boolean; steerDelay: number; dashAt: number; lockT: number; dj: number }

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
  let x = 0, y = 0, vx = s.vx0, vy = s.vy0, t = 0, dashLeft = 0, dashed = false, jumped2 = false;
  let lx = 0, ly = 0;
  const runMax = PHYS.runMax * m.mx;
  // Every landing in a 14 row level happens well inside 1.6 s.
  while (t < 1.6 && y < ROWS + 2) {
    if (!dashed && s.dashAt >= 0 && t >= s.dashAt) { dashed = true; dashLeft = PHYS.dashTime; }
    // The double jump: a fresh full jump, held.
    if (!jumped2 && s.dj >= 0 && t >= s.dj && dashLeft <= 0) { jumped2 = true; vy = -PHYS.jumpV * m.mv; }
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
      const g = vy < 0 && (s.hold || jumped2) ? PHYS.gravityHold : PHYS.gravity;
      vy = Math.min(PHYS.terminal, vy + g * dt);
    }
    x += vx * dt; y += vy * dt; t += dt;
    if (Math.hypot(x - lx, y - ly) >= 0.2) { out.push(x, y); lx = x; ly = y; }
  }
  out.push(x, y);
  return { pts: Float64Array.from(out) };
}

interface Templates { jump: Template[][][]; fall: Template[][][]; wall: Template[][]; bounce: Template[][] }

const cache = new Map<string, Templates>();

/** (double jump time, dash time) pairs, -1 for none: coarse for ordinary timing, fine when generous. */
function combos(dash: boolean, dj: boolean, dashes: number[], djs: number[]): [number, number][] {
  const out: [number, number][] = dashes.map(d => [-1, d]);
  if (!dj) return out;
  for (const j of djs) out.push([j, -1]);
  if (dash) for (const j of djs) out.push([j, j + 0.2], [j, j + 0.4], [j + 0.25, Math.max(0.05, j - 0.1)]);
  return out;
}

/** Templates indexed [dir 0 = left, 1 = right][running 0/1][...]. */
function templates(dash: boolean, dj: boolean, generous: boolean): Templates {
  const key = `${dash}${dj}${generous}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const m = margins(generous);
  const fine = (a: number, b: number) => Array.from({ length: Math.round((b - a) / 0.05) + 1 }, (_, i) => +(a + i * 0.05).toFixed(2));
  const dashes = dash ? (generous ? [-1, ...fine(0.05, 0.7)] : [-1, 0.08, 0.2, 0.32, 0.45, 0.6]) : [-1];
  const djs = generous ? fine(0.05, 0.85) : [0.15, 0.3, 0.45, 0.6];
  const jumpCombos = combos(dash, dj, dashes, djs);
  const fallCombos = combos(dash, dj, dash ? [-1, 0.05, 0.2, 0.35] : [-1], generous ? fine(0.05, 0.6) : [0.05, 0.2, 0.4]);
  const wallCombos = combos(dash, dj, dash ? [-1, 0.12, 0.25, 0.4] : [-1], generous ? fine(0.1, 0.7) : [0.3, 0.5]);
  const jump: Template[][][] = [[[], []], [[], []]];
  const fall: Template[][][] = [[[], []], [[], []]];
  const wall: Template[][] = [[], []];
  for (const di of [0, 1]) {
    const dir = di === 0 ? -1 : 1;
    for (const run of [0, 1]) {
      const vx0 = dir * PHYS.runMax * m.mx * (run || generous ? 1 : 0);
      for (const hold of [true, false]) {
        for (const steerDelay of hold ? [0, 0.22] : [0]) {
          for (const [dj2, dashAt] of jumpCombos) {
            const vy0 = -(hold ? PHYS.jumpV : PHYS.jumpCut) * m.mv;
            jump[di][run].push(simulate({ dir, vx0: steerDelay > 0 ? 0 : vx0, vy0, hold, steerDelay, dashAt, lockT: 0, dj: dj2 }, generous));
          }
        }
      }
      for (const [dj2, dashAt] of fallCombos) {
        fall[di][run].push(simulate({ dir, vx0: vx0 || dir * PHYS.runMax * 0.4, vy0: 0, hold: false, steerDelay: 0, dashAt, lockT: 0, dj: dj2 }, generous));
      }
    }
    // Wall jumps off a wall on side `side` (di 0 = wall on the left, 1 = on the right).
    const side = dir;
    for (const steer of [-side, side]) {
      for (const [dj2, dashAt] of wallCombos) {
        const sp: Spec = { dir: steer, vx0: -side * PHYS.wallJumpX * m.mx, vy0: -PHYS.wallJumpY * m.mv, hold: true, steerDelay: 0, dashAt, lockT: PHYS.wallJumpLock, dj: dj2 };
        wall[di].push(simulate(sp, generous));
      }
    }
  }
  // Off a stomp: a held bounce, either way, straight or steering late; no double jump left.
  const bounce: Template[][] = [[], []];
  for (const di of [0, 1]) {
    const dir = di === 0 ? -1 : 1;
    for (const steerDelay of [0, 0.15, 0.3]) {
      for (const dashAt of dash ? [-1, 0.2, 0.4] : [-1]) {
        bounce[di].push(simulate({ dir, vx0: 0, vy0: -PHYS.stompBounceHeld * m.mv, hold: true, steerDelay, dashAt, lockT: 0, dj: -1 }, generous));
      }
    }
  }
  const t = { jump, fall, wall, bounce };
  cache.set(key, t);
  return t;
}

/**
 * 1 solid, 2 one-way, 0 open. Out of bounds: solid at the sides, open above
 * and below. A horizontal moving platform is a one-way strip at each end of
 * its swing (only the cells it fully covers there), linked: standing on one
 * end, she can ride to the other. Vertical platforms are left out (never
 * counted on).
 */
function grid(level: Level, opts: ReachOpts) {
  const cols = level.cols;
  const g = new Uint8Array(cols * ROWS);
  const smash = !!opts.smash && opts.dash;
  for (let i = 0; i < g.length; i++) {
    const t = level.tiles[i];
    // Thin clouds count as one-way floors: she has PUFF.wobble seconds on one, plenty to jump on.
    g[i] = smash && t === TILE.CRACK ? 0 : isSolidTile(t) ? 1 : isOneWayTile(t) ? 2 : 0;
  }
  /** Lane roof cells: cell index to lane number (+1); and each lane's direction. */
  const lane = new Int16Array(cols * ROWS);
  const laneDir: number[] = [];
  if (opts.vehicles !== false) {
    level.vehicles.forEach((d, i) => {
      laneDir.push(d.dir);
      if (d.row < 0 || d.row >= ROWS) return;
      for (let x = Math.max(0, d.x0); x <= Math.min(cols - 1, d.x1); x++) {
        const k = d.row * cols + x;
        if (g[k] !== 0) continue;
        g[k] = 2;
        lane[k] = i + 1;
      }
    });
  }
  const rides = new Map<number, number[]>();
  for (const p of level.platforms) {
    if (p.axis !== 'x') continue;
    const span = (lo: number) => { const out: number[] = []; for (let c = Math.ceil(lo); c <= Math.floor(lo + p.w) - 1; c++) if (c >= 0 && c < cols) out.push(c); return out; };
    const a = span(p.x - PLATFORM_AMP), b = span(p.x + PLATFORM_AMP);
    for (const c of [...a, ...b]) if (g[p.y * cols + c] === 0) g[p.y * cols + c] = 2;
    for (const c of a) rides.set(c * ROWS + (p.y - 1), b);
    for (const c of b) rides.set(c * ROWS + (p.y - 1), a);
  }
  const at = (x: number, y: number) => (x < 0 || x >= cols ? 1 : y < 0 || y >= ROWS ? 0 : g[y * cols + x]);
  /** The lane whose roof is the cell (x, y), -1 for none. */
  const laneAt = (x: number, y: number) => (x < 0 || x >= cols || y < 0 || y >= ROWS ? -1 : lane[y * cols + x] - 1);
  return { cols, at, rides, laneAt, laneDir };
}

export interface ReachResult {
  reached: boolean;
  nodes: number;
  maxX: number;
  minX: number;
  /** Per target: can she touch it? */
  touched: boolean[];
  /** Every standing cell found (all of them when targets were asked for). */
  stands: { x: number; y: number }[];
  /** With `graph`: every node found, the moves between them, and which nodes stand at the goal. */
  graph?: { nodes: number[]; edges: [number, number][]; goal: Set<number>; cell: (id: number) => { x: number; y: number } };
}

export function reach(level: Level, opts: ReachOpts): ReachResult {
  const { cols, at, rides, laneAt, laneDir } = grid(level, opts);
  const T = templates(opts.dash, !!opts.doubleJump, !!opts.generous);
  const targets = opts.targets ?? [];
  const touched = targets.map(() => false);
  let left = targets.length;
  const touch = (x: number, f: number) => {
    if (left === 0) return;
    for (let i = 0; i < targets.length; i++) {
      if (touched[i]) continue;
      const b = targets[i];
      if (x < b.x + b.w && x + W > b.x && f - H < b.y + b.h && f > b.y) { touched[i] = true; left--; }
    }
  };
  const stands: { x: number; y: number }[] = [];
  const solid = (x: number, y: number) => at(x, y) === 1;
  const floorAt = (x: number, y: number) => at(x, y) !== 0;
  const clear = (x: number, y: number) => !solid(x, y) && !solid(x, y - 1);
  const standable = (x: number, y: number) => y >= 1 && y < ROWS && clear(x, y) && floorAt(x, y + 1);

  // Node id: (x * ROWS + y) * 3 + kind; kind 0 stand, 1 wall on the left, 2 wall on the right.
  // Bounce nodes (one per drone) follow the cell nodes.
  const drones = opts.bounces ? level.enemies.filter(e => e.kind === 'adDrone' || e.kind === 'eliteDrone') : [];
  const cellNodes = cols * ROWS * 3;
  const seen = new Uint8Array(cellNodes + drones.length);
  const pushBounce = (i: number) => {
    const id = cellNodes + i;
    if (opts.graph && cur >= 0) edges.push([cur, id]);
    if (seen[id]) return;
    seen[id] = 1; queue.push(id);
  };
  /** A drone's body at its hover spot (see enemyFrom). */
  const droneBox = (i: number) => ({ x: drones[i].x + 0.1, y: drones[i].y + 0.15, w: 0.8, h: 0.7 });
  const queue: number[] = [];
  let cur = -1;
  const edges: [number, number][] = [];
  const push = (x: number, y: number, kind: number) => {
    if (x < 0 || x >= cols || y < 0 || y >= ROWS) return;
    const id = (x * ROWS + y) * 3 + kind;
    if (opts.graph && cur >= 0) edges.push([cur, id]);
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
      if (f > pf && drones.length) {
        // A stomp: falling onto a drone from above.
        for (let k = 0; k < drones.length; k++) {
          const b = droneBox(k);
          if (x < b.x + b.w && x + W > b.x && f > b.y && pf <= b.y + 0.3) { pushBounce(k); return; }
        }
      }
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
      touch(x, f);
      px = x; pf = f;
    }
  };

  if (opts.from) push(opts.from.x, opts.from.y, 0);
  else push(level.start.x, level.start.y - 1, 0);
  let head = 0;
  const goalNodes = new Set<number>();
  while (head < queue.length && !(reached && left === 0 && !opts.targets && !opts.graph)) {
    const id = queue[head++];
    cur = id;
    if (id >= cellNodes) {
      const b = droneBox(id - cellNodes);
      for (const di of [0, 1]) for (const tp of T.bounce[di]) sweep(tp, b.x + b.w / 2 - W / 2, b.y);
      continue;
    }
    const kind = id % 3, cell = (id - kind) / 3;
    const x = Math.floor(cell / ROWS), y = cell % ROWS;
    if (atGoal(x, y)) { reached = true; goalNodes.add(id); if (!opts.targets && !opts.graph) break; }
    maxX = Math.max(maxX, x); minX = Math.min(minX, x);
    if (kind === 0) {
      stands.push({ x, y });
      touch(x + 0.5 - W / 2, y + 1);
      const ride = rides.get(x * ROWS + y);
      if (ride) for (const c of ride) if (standable(c, y)) push(c, y, 0);
      // On a vehicle roof: carried along its lane to any cell further on.
      const ln = laneAt(x, y + 1);
      if (ln >= 0) {
        const ld = laneDir[ln];
        for (let c = x + ld; laneAt(c, y + 1) === ln; c += ld) if (standable(c, y)) push(c, y, 0);
      }
      for (const d of [-1, 1]) {
        const di = d < 0 ? 0 : 1;
        const nx = x + d;
        // Walking back along a moving roof only goes as far as the roof does: not modelled.
        if (ln >= 0 && d !== laneDir[ln] && laneAt(nx, y + 1) === ln) continue;
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
  const cell = (id: number) => { const c = Math.floor(id / 3); return { x: Math.floor(c / ROWS), y: c % ROWS }; };
  const graph = opts.graph ? { nodes: queue.slice(), edges, goal: goalNodes, cell } : undefined;
  return { reached, nodes: queue.length, maxX, minX, touched, stands, graph };
}

export function reachesGoal(level: Level, opts: ReachOpts): boolean {
  return reach(level, opts).reached;
}
