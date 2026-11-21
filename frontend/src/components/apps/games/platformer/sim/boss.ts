/**
 * The gorilla (4-boss): a fight on the bridge deck in three phases. A deep
 * module: the world makes a Fight from the level, calls `stepFight` once per
 * play step, hands blade swings to `strikeBoss`, asks `lockCamera` where the
 * camera may go, and calls `resetFight` when she respawns. Everything the
 * renderer draws is in `fight.boss` and `fight.projectiles` (the world shares
 * them as `w.boss` and `w.projectiles`). Deterministic: no randomness, only
 * the clock and where she is.
 */

import { TILE, type Level } from './level';
import { stompBounce, type Hero } from './hero';
import { stompOrHurt } from './physics';

export const BOSS = {
  /** Hitbox, tiles. */
  w: 2.2, h: 2.4,
  maxHp: 12,
  /** The fight starts when her left edge is this far past the arena's first column. */
  doorStep: 1,
  /** Seconds he wakes up, beats his chest and says his first line (harmless, cannot be hurt). */
  intro: 1.6,
  /** Between attacks he walks toward her at paceSpeed, for up to `pace` seconds or until he is `near` tiles away (centre to centre). */
  pace: 1.4, paceSpeed: 2.5, near: 5,
  /** Every telegraph lasts this long before the attack is dangerous. */
  warn: 0.8,
  /** Barrels: size, rolling speed along the deck. */
  barrel: { w: 0.9, h: 0.9, speed: 7 },
  /** After a barrel he watches it roll, up to this long, before the chest beat. */
  watch: 4,
  /** The chest beat after a barrel: a punish window with a taunt. */
  chestBeat: 1.5,
  /**
   * The lunge: he charges the way he faces, speeding up at lungeAccel to
   * lungeSpeed, until the tower stops him; then he is dazed (a punish
   * window). He lunges only when she is at least lungeMin tiles away.
   */
  lungeSpeed: 14, lungeAccel: 30, lungeMin: 4, dazed: 1.6,
  /** The ground pound: shockwaves this size run along the deck each way from his feet; after `pounds` pounds he is winded (a punish window). */
  shock: { w: 0.8, h: 0.6, speed: 7 },
  poundRecover: 0.6, pounds: 3, winded: 2.5,
  /** Debris from a debris spot: a marker for `warn` seconds, then it falls (gravity g) and breaks on the deck. */
  debris: { w: 0.9, h: 0.9, warn: 1, g: 40 },
  /** Phase 3: he walks to the foot of a cable and climbs it at climbSpeed to its top (the perch). */
  climbSpeed: 5,
  /** From the perch, `throws` lobs: each lands on the spot he marked (aimX) after `time` seconds in the air (gravity g), then rolls away from him. */
  lob: { time: 0.7, g: 30 }, throws: 2, perch: 0.7,
  /** Then he marks her spot for slamWarn seconds and slams down on it in slamTime; slumped there is a punish window. */
  slamWarn: 0.9, slamTime: 0.5, slumped: 2.2,
  /** A down-strike onto his head in phase 3 deals this, in or out of a punish window. */
  headHit: 2,
  /**
   * The finish: at 0 hp he is down for `down` seconds (falling to the deck
   * if he was up high). Sim time slows by slowMo at first, easing back to
   * full speed over slowFor seconds; his last line turns into the beaten
   * one after `sheepish` seconds; then the exit gate opens.
   */
  down: 2.4, slowMo: 0.6, slowFor: 0.9, sheepish: 1.2, fall: 40,
  /** Seconds a taunt line shows. */
  tauntShow: 2.4,
  /** Damage: a blade hit, a hit in a punish window; a stomp in a punish window. */
  hit: 1, punishHit: 2, stompHit: 1,
  /** After a stomp bounce his body cannot hurt her for this long. */
  stompSafe: 0.2,
  /** Phase 2 starts at this hp, phase 3 at the next; a hit never takes him past one. */
  phaseAt: [8, 4] as readonly number[],
  /** Seconds he roars into a new phase: he cannot be hurt and is safe to touch; what he threw is gone. */
  roar: 1.5,
} as const;

export type BossState = 'idle' | 'intro' | 'pace' | 'throwWarn' | 'watch' | 'chestBeat' | 'lungeWarn' | 'lunge' | 'dazed' | 'roar'
  | 'poundWarn' | 'pound' | 'winded'
  | 'climb' | 'perch' | 'slamWarn' | 'slam' | 'slumped'
  | 'down' | 'beaten';

export interface Boss {
  kind: 'gorilla';
  /** Top left, tiles; vx, vy tiles per second. */
  x: number; y: number; w: number; h: number; vx: number; vy: number;
  hp: number; maxHp: number;
  phase: 1 | 2 | 3;
  state: BossState;
  /** Seconds in the current state. */
  stateT: number;
  facing: 1 | -1;
  /** A punish window: blade hits land double, a stomp lands, and touching him is safe. */
  punish: boolean;
  /** The story text id of the line he is saying ('boss-taunt-1'), or null. */
  taunt: string | null;
  /** Seconds the taunt has shown. */
  tauntT: number;
  /** The deck column he is aiming a lob or a slam at (a marker to draw), or null. */
  aimX: number | null;
}

export type ProjectileKind = 'barrel' | 'debris' | 'shockwave';

/** Something he throws or shakes loose. `warn` > 0: a telegraph marker, not yet dangerous. */
export interface Projectile { kind: ProjectileKind; x: number; y: number; w: number; h: number; vx: number; vy: number; warn: number }

/** The arena: inner columns x0 to x1, the deck's top row, the gate tiles. */
export interface Arena {
  x0: number; x1: number; floor: number;
  /** The entry gate (shuts when the fight starts) and the exit gate (opens when he is beaten). */
  entry: readonly { x: number; y: number }[];
  exit: readonly { x: number; y: number }[];
  /** The camera's range while the fight is on: the outer faces of the towers. */
  viewL: number; viewR: number;
}

export interface Fight {
  boss: Boss;
  projectiles: Projectile[];
  arena: Arena;
  /** The fight is on: she is in, he is not yet beaten (the camera is locked). */
  on: boolean;
  /** Where he waits for her. */
  home: { x: number; y: number; facing: 1 | -1 };
  /** Fights started, so a retry gets a different first line. */
  tries: number;
  /** Attacks started this phase (picks the next one), and chest beats so far (picks the line). */
  attacks: number;
  beats: number;
  /** Removed projectiles, reused so a throw allocates nothing. */
  spare: Projectile[];
  /** Pounds this phase (picks the debris spots; every BOSS.pounds-th winds him). */
  pounds: number;
  /** Debris spots, tile x, y (from the level's :). */
  spots: readonly { x: number; y: number }[];
  /** Each cable's top (the perch: centre x, the y of its top) and the centre x of its foot. */
  perches: readonly { x: number; y: number; footX: number }[];
  /** His climb: two waypoints (the cable's foot, its top; top left corners), the next one's index (2 = there), and throws made from this perch. */
  path: readonly [{ x: number; y: number }, { x: number; y: number }];
  pathAt: number;
  throws: number;
  /** A slam: where it starts and lands (top left corners). */
  slam: { x0: number; y0: number; x1: number; y1: number };
  /** How much the world's clock is slowed now (0 to 0.9; the finish). */
  slowMo: number;
  /** Serial of the last swing that hit him (one hit per swing). */
  lastHit: number;
  /** Seconds left in which touching him cannot hurt her (after a stomp). */
  safeT: number;
}

/** What the fight may touch in the world. The world makes one and keeps it. */
export interface BossCtx {
  hero: Hero;
  emit(type: BossEvent, x: number, y: number, n: number): void;
  setTile(x: number, y: number, t: number): void;
  /** She is hit (the world decides: a shield, invulnerability, or a death). */
  hurt(): void;
  /** He is beaten: the world scores him. */
  beaten(): void;
  /** The world fills these in before each step: her feet a step ago, Jump held, and whether a pogo keeps her safe. */
  prevBottom: number;
  jumpHeld: boolean;
  pogoSafe: boolean;
}

/**
 * Events: a taunt started (n: its number, 0 for the beaten line), he took a
 * hit (n: damage), a new phase (n: phase), he is down.
 */
export type BossEvent = 'bossTaunt' | 'bossHit' | 'bossPhase' | 'bossDown' | 'stomp';

/** The fight for a level with a boss spawn (Y), or null. */
export function createFight(level: Level): Fight | null {
  const at = level.boss;
  if (!at) return null;
  const boss: Boss = {
    kind: 'gorilla', x: at.x + 0.5 - BOSS.w / 2, y: at.y - BOSS.h, w: BOSS.w, h: BOSS.h, vx: 0, vy: 0,
    hp: BOSS.maxHp, maxHp: BOSS.maxHp, phase: 1, state: 'idle', stateT: 0,
    facing: level.start.x < at.x ? -1 : 1, punish: false, taunt: null, tauntT: 0, aimX: null,
  };
  const entry = level.gates.filter(g => !g.closed).map(g => ({ x: g.x, y: g.y }));
  const exit = level.gates.filter(g => g.closed).map(g => ({ x: g.x, y: g.y }));
  const x0 = entry.length ? Math.max(...entry.map(g => g.x)) + 1 : 0;
  const x1 = exit.length ? Math.min(...exit.map(g => g.x)) - 1 : level.cols - 1;
  const arena: Arena = { x0, x1, floor: at.y, entry, exit, viewL: x0 - 2, viewR: x1 + 3 };
  return { boss, projectiles: [], arena, on: false, home: { x: boss.x, y: boss.y, facing: boss.facing }, tries: 0, attacks: 0, beats: 0, spare: [], lastHit: -1, safeT: 0,
    pounds: 0, spots: level.debris.map(d => ({ x: d.x, y: d.y })), perches: perchesOf(level),
    path: [{ x: 0, y: 0 }, { x: 0, y: 0 }], pathAt: 2, throws: 0, slam: { x0: 0, y0: 0, x1: 0, y1: 0 }, slowMo: 0 };
}

/** The cables (connected runs of cable tiles): each one's top, where he perches, and its foot. */
function perchesOf(level: Level): { x: number; y: number; footX: number }[] {
  const { cols, tiles } = level;
  const seen = new Uint8Array(tiles.length);
  const out: { x: number; y: number; footX: number }[] = [];
  for (let i = 0; i < tiles.length; i++) {
    if (tiles[i] !== TILE.CABLE || seen[i]) continue;
    const run: number[] = [i];
    seen[i] = 1;
    for (let j = 0; j < run.length; j++) {
      const x = run[j] % cols, y = Math.floor(run[j] / cols);
      for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
        const nx = x + ox, ny = y + oy;
        if (nx < 0 || nx >= cols || ny < 0 || ny >= tiles.length / cols) continue;
        const n = ny * cols + nx;
        if (tiles[n] === TILE.CABLE && !seen[n]) { seen[n] = 1; run.push(n); }
      }
    }
    const ys = run.map(n => Math.floor(n / cols));
    const top = Math.min(...ys), bottom = Math.max(...ys);
    const span = (row: number) => {
      const xs = run.filter(n => Math.floor(n / cols) === row).map(n => n % cols);
      return (Math.min(...xs) + Math.max(...xs) + 1) / 2;
    };
    out.push({ x: span(top), y: top, footX: span(bottom) });
  }
  return out;
}

/** The lines a chest beat cycles through. */
const BEAT_LINES = [2, 4, 7] as const;

const sign = (v: number): 1 | -1 => (v < 0 ? -1 : 1);

function overlaps(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function spawn(f: Fight, kind: ProjectileKind, x: number, y: number, w: number, h: number, vx: number, vy: number, warn: number): Projectile {
  const p = f.spare.pop() ?? { kind, x, y, w, h, vx, vy, warn };
  p.kind = kind; p.x = x; p.y = y; p.w = w; p.h = h; p.vx = vx; p.vy = vy; p.warn = warn;
  f.projectiles.push(p);
  return p;
}

/** Take projectile i out (swap with the last), keeping it for reuse. */
function drop(f: Fight, i: number) {
  const ps = f.projectiles;
  const p = ps[i];
  ps[i] = ps[ps.length - 1];
  ps.length--;
  f.spare.push(p);
}

function enter(b: Boss, s: BossState) {
  b.state = s;
  b.stateT = 0;
}

/** Start a line: its story text id and a 'bossTaunt' event (n: its number, 0 for the beaten line). */
function say(f: Fight, k: BossCtx, n: number) {
  const b = f.boss;
  b.taunt = n > 0 ? `boss-taunt-${n}` : 'boss-beaten';
  b.tauntT = 0;
  k.emit('bossTaunt', b.x + b.w / 2, b.y, n);
}

/** One play step of the fight. */
export function stepFight(f: Fight, k: BossCtx, dt: number) {
  const b = f.boss;
  const h = k.hero;
  b.stateT += dt;
  if (b.taunt) {
    b.tauntT += dt;
    if (b.tauntT >= BOSS.tauntShow) b.taunt = null;
  }
  b.vx = 0; b.vy = 0;
  if (f.on) holdInArena(f, h);
  const hc = h.x + h.w / 2;
  const dx = hc - (b.x + b.w / 2);
  switch (b.state) {
    case 'idle':
      if (h.x < f.arena.x0 + BOSS.doorStep) return;
      f.on = true;
      f.tries++;
      for (const g of f.arena.entry) k.setTile(g.x, g.y, TILE.GATE);
      enter(b, 'intro');
      say(f, k, f.tries > 1 ? 3 : 1);
      break;
    case 'intro':
      if (b.stateT >= BOSS.intro) enter(b, 'pace');
      break;
    case 'pace':
      b.facing = sign(dx);
      if (Math.abs(dx) > BOSS.near) {
        b.vx = b.facing * BOSS.paceSpeed;
        moveBoss(f, b.vx * dt);
      }
      if (b.stateT >= BOSS.pace || Math.abs(dx) <= BOSS.near) nextAttack(f, dx);
      break;
    case 'lungeWarn':
      if (b.stateT >= BOSS.warn) enter(b, 'lunge');
      break;
    case 'lunge': {
      b.vx = b.facing * Math.min(BOSS.lungeSpeed, BOSS.lungeAccel * (b.stateT + dt));
      moveBoss(f, b.vx * dt);
      if (b.x <= f.arena.x0 + 1e-9 || b.x >= f.arena.x1 + 1 - b.w - 1e-9) enter(b, 'dazed');
      break;
    }
    case 'dazed':
      if (b.stateT >= BOSS.dazed) enter(b, 'pace');
      break;
    case 'roar':
      if (b.stateT >= BOSS.roar) enter(b, 'pace');
      break;
    case 'poundWarn':
      if (b.stateT >= BOSS.warn) pound(f);
      break;
    case 'pound':
      if (b.stateT < BOSS.poundRecover) break;
      if (f.pounds % BOSS.pounds === 0) enter(b, 'winded');
      else { b.facing = sign(dx); enter(b, 'poundWarn'); }
      break;
    case 'winded':
      if (b.stateT >= BOSS.winded) enter(b, 'pace');
      break;
    case 'throwWarn':
      if (heldBarrel(f)) break;
      if (b.phase === 3) { f.throws++; b.aimX = null; enter(b, 'perch'); } else enter(b, 'watch');
      break;
    case 'climb':
      if (climb(f, dt)) startThrow(f, dx, hc);
      break;
    case 'perch':
      if (b.stateT < BOSS.perch) break;
      if (f.throws < BOSS.throws) startThrow(f, dx, hc);
      else { enter(b, 'slamWarn'); b.aimX = aimAt(f, hc); }
      break;
    case 'slamWarn':
      if (b.stateT < BOSS.slamWarn) break;
      enter(b, 'slam');
      f.slam.x0 = b.x; f.slam.y0 = b.y;
      f.slam.x1 = clampX(f, b.aimX! - b.w / 2); f.slam.y1 = f.arena.floor - b.h;
      break;
    case 'slam': {
      const u = Math.min(1, b.stateT / BOSS.slamTime);
      const { x0, y0, x1, y1 } = f.slam;
      const px = b.x, py = b.y;
      b.x = x0 + (x1 - x0) * u;
      // A little hop up off the perch, then down hard.
      b.y = y0 + (y1 - y0) * u * u - 1.5 * 4 * u * (1 - u);
      b.vx = (b.x - px) / dt; b.vy = (b.y - py) / dt;
      if (u >= 1) { b.aimX = null; enter(b, 'slumped'); }
      break;
    }
    case 'slumped':
      if (b.stateT >= BOSS.slumped) enter(b, 'pace');
      break;
    case 'down':
      if (b.y + b.h < f.arena.floor) {
        b.vy = Math.min(20, (b.stateT * BOSS.fall));
        b.y = Math.min(f.arena.floor - b.h, b.y + b.vy * dt);
      }
      if (b.stateT >= BOSS.sheepish && b.stateT - dt < BOSS.sheepish) say(f, k, 0);
      if (b.stateT < BOSS.down) break;
      b.y = f.arena.floor - b.h;
      enter(b, 'beaten');
      f.on = false;
      for (const g of f.arena.exit) k.setTile(g.x, g.y, TILE.EMPTY);
      break;
    case 'beaten':
      break;
    case 'watch':
      if (barrels(f) && b.stateT < BOSS.watch) break;
      enter(b, 'chestBeat');
      say(f, k, BEAT_LINES[f.beats++ % BEAT_LINES.length]);
      break;
    case 'chestBeat':
      if (b.stateT >= BOSS.chestBeat) enter(b, 'pace');
      break;
  }
  f.slowMo = b.state === 'down' ? BOSS.slowMo * Math.max(0, 1 - b.stateT / BOSS.slowFor) : 0;
  b.punish = b.state === 'chestBeat' || b.state === 'dazed' || b.state === 'winded' || b.state === 'slumped';
  touch(f, k, dt);
  stepProjectiles(f, k, dt);
}

/** Can a hit land now? Not asleep, waking, roaring or down. */
function vulnerable(b: Boss): boolean {
  return b.state !== 'idle' && b.state !== 'intro' && b.state !== 'roar' && b.hp > 0;
}

/** Is his body dangerous to touch now? Never in a punish window, nor while he roars, nor once he is down. */
function harmful(b: Boss): boolean {
  return b.state !== 'idle' && b.state !== 'roar' && b.hp > 0 && !b.punish;
}

/** The phase for an hp. */
function phaseOf(hp: number): 1 | 2 | 3 {
  return hp > BOSS.phaseAt[0] ? 1 : hp > BOSS.phaseAt[1] ? 2 : 3;
}

/** Take damage, never past the next phase's threshold; reaching it, he roars into the new phase. */
function damage(f: Fight, k: BossCtx, n: number) {
  const b = f.boss;
  let floor = 0;
  for (const at of BOSS.phaseAt) if (at < b.hp) { floor = at; break; }
  const dealt = Math.min(n, b.hp - floor);
  b.hp -= dealt;
  k.emit('bossHit', b.x + b.w / 2, b.y + b.h / 2, dealt);
  if (b.hp === 0) {
    clearProjectiles(f);
    enter(b, 'down');
    b.punish = false;
    b.aimX = null;
    f.slowMo = BOSS.slowMo;
    k.emit('bossDown', b.x + b.w / 2, b.y, 0);
    say(f, k, 8);
    k.beaten();
    return;
  }
  const phase = phaseOf(b.hp);
  if (phase > b.phase) {
    b.phase = phase;
    f.attacks = 0;
    clearProjectiles(f);
    enter(b, 'roar');
    b.punish = false;
    k.emit('bossPhase', b.x + b.w / 2, b.y, phase);
    say(f, k, phase === 2 ? 5 : 6);
  }
}

function clearProjectiles(f: Fight) {
  for (let i = f.projectiles.length - 1; i >= 0; i--) drop(f, i);
}

/** Her body against his: a stomp bounces her (and lands in a punish window); a touch hurts her unless she is dashing. */
function touch(f: Fight, k: BossCtx, dt: number) {
  const b = f.boss;
  const h = k.hero;
  if (f.safeT > 0) f.safeT = Math.max(0, f.safeT - dt);
  if (b.state === 'idle' || b.state === 'down' || b.state === 'beaten') return;
  const hit = stompOrHurt(h, k.prevBottom, b);
  if (hit === 'stomp') {
    stompBounce(h, k.jumpHeld);
    f.safeT = BOSS.stompSafe;
    k.emit('stomp', b.x + b.w / 2, b.y, 0);
    if (b.punish && vulnerable(b)) damage(f, k, BOSS.stompHit);
  } else if (hit === 'hurt' && harmful(b) && h.dashT <= 0 && !k.pogoSafe && f.safeT <= 0) {
    k.hurt();
  }
}

/**
 * She respawned at the door: the fight starts over. He is back at his spot,
 * asleep, at full health; nothing he threw is left. The entry gate stays shut.
 */
export function resetFight(f: Fight) {
  const b = f.boss;
  b.x = f.home.x; b.y = f.home.y; b.facing = f.home.facing; b.vx = 0; b.vy = 0;
  b.hp = b.maxHp; b.phase = 1; b.punish = false; b.taunt = null; b.tauntT = 0; b.aimX = null;
  enter(b, 'idle');
  clearProjectiles(f);
  f.on = false; f.attacks = 0; f.beats = 0; f.pounds = 0; f.throws = 0; f.pathAt = 2; f.safeT = 0; f.slowMo = 0;
}

/** He is something to swing at (the blade aims at him): awake and not beaten. */
export function bossTarget(f: Fight | null): Boss | null {
  if (!f || f.boss.state === 'idle' || f.boss.hp <= 0) return null;
  return f.boss;
}

/**
 * A blade swing's hitbox this step (`serial` names the swing; `down` for a
 * down-strike). Returns true when it met him (a down-strike then bounces her,
 * even when he cannot be hurt right now).
 */
export function strikeBoss(f: Fight, k: BossCtx, box: { x: number; y: number; w: number; h: number }, serial: number, down: boolean): boolean {
  const b = f.boss;
  if (b.state === 'idle' || b.hp <= 0 || f.lastHit === serial || !overlaps(box, b)) return false;
  f.lastHit = serial;
  // A down-strike's box starts 0.2 above her feet: from at or above his head, it is a head hit.
  const head = down && box.y + 0.2 <= b.y + 0.6;
  if (vulnerable(b)) damage(f, k, b.phase === 3 && head ? BOSS.headHit : b.punish ? BOSS.punishHit : BOSS.hit);
  return true;
}

/** While the fight is on she stays in the arena, over the tower tops too (the sky above them is open). */
function holdInArena(f: Fight, h: Hero) {
  const { x0, x1 } = f.arena;
  if (h.x < x0) { h.x = x0; if (h.vx < 0) h.vx = 0; }
  if (h.x + h.w > x1 + 1) { h.x = x1 + 1 - h.w; if (h.vx > 0) h.vx = 0; }
}

/** Walk along the deck, inside the arena. */
function moveBoss(f: Fight, dx: number) {
  const b = f.boss;
  b.x = Math.min(f.arena.x1 + 1 - b.w, Math.max(f.arena.x0, b.x + dx));
}

/** Pick and start the next attack for his phase; dx is from him to her (centres). */
function nextAttack(f: Fight, dx: number) {
  const b = f.boss;
  f.attacks++;
  b.facing = sign(dx);
  if (b.phase === 2) {
    enter(b, 'poundWarn');
    return;
  }
  if (b.phase === 3 && f.perches.length) {
    startClimb(f, b.x + b.w / 2 + dx);
    return;
  }
  if (f.attacks % 2 === 0 && Math.abs(dx) >= BOSS.lungeMin) {
    enter(b, 'lungeWarn');
    return;
  }
  enter(b, 'throwWarn');
  // The barrel, held over his head while it is a telegraph.
  const B = BOSS.barrel;
  spawn(f, 'barrel', b.x + b.w / 2 - B.w / 2, b.y - B.h, B.w, B.h, 0, 0, BOSS.warn);
}

/** Is any barrel out (held or rolling)? */
function barrels(f: Fight): boolean {
  for (const p of f.projectiles) if (p.kind === 'barrel') return true;
  return false;
}

/** Is a barrel still held over his head (a telegraph)? */
function heldBarrel(f: Fight): boolean {
  for (const p of f.projectiles) if (p.kind === 'barrel' && p.warn > 0) return true;
  return false;
}

/** A left edge for him, kept inside the arena. */
function clampX(f: Fight, x: number): number {
  return Math.min(f.arena.x1 + 1 - f.boss.w, Math.max(f.arena.x0, x));
}

/** The deck column to aim at: her centre, kept where his whole body fits. */
function aimAt(f: Fight, hc: number): number {
  const half = f.boss.w / 2;
  return Math.min(f.arena.x1 + 1 - half, Math.max(f.arena.x0 + half, hc));
}

/** Head for the cable whose top is farther from her (centre hx): along the deck to its foot, then up. */
function startClimb(f: Fight, hx: number) {
  const b = f.boss;
  let best = f.perches[0];
  for (const p of f.perches) if (Math.abs(p.x - hx) > Math.abs(best.x - hx)) best = p;
  f.path[0].x = clampX(f, best.footX - b.w / 2); f.path[0].y = f.arena.floor - b.h;
  f.path[1].x = clampX(f, best.x - b.w / 2); f.path[1].y = best.y - b.h;
  f.pathAt = 0;
  f.throws = 0;
  enter(b, 'climb');
}

/** Move along the climb; true when he is at the top. */
function climb(f: Fight, dt: number): boolean {
  const b = f.boss;
  let step = BOSS.climbSpeed * dt;
  while (f.pathAt < 2 && step > 0) {
    const p = f.path[f.pathAt];
    const ddx = p.x - b.x, ddy = p.y - b.y, d = Math.hypot(ddx, ddy);
    if (d <= step) { b.x = p.x; b.y = p.y; step -= d; f.pathAt++; continue; }
    b.x += (ddx / d) * step; b.y += (ddy / d) * step;
    b.vx = (ddx / d) * BOSS.climbSpeed; b.vy = (ddy / d) * BOSS.climbSpeed;
    if (ddx !== 0) b.facing = sign(ddx);
    step = 0;
  }
  return f.pathAt === 2;
}

/** From the perch: mark her spot and lift a barrel (the telegraph). */
function startThrow(f: Fight, dx: number, hc: number) {
  const b = f.boss;
  b.facing = sign(dx);
  enter(b, 'throwWarn');
  b.aimX = aimAt(f, hc);
  const B = BOSS.barrel;
  spawn(f, 'barrel', b.x + b.w / 2 - B.w / 2, b.y - B.h, B.w, B.h, 0, 0, BOSS.warn);
}

/** The pound lands: a shockwave each way, and debris shaken loose at two spots. */
function pound(f: Fight) {
  const b = f.boss;
  const S = BOSS.shock, D = BOSS.debris;
  const y = f.arena.floor - S.h;
  enter(b, 'pound');
  f.pounds++;
  spawn(f, 'shockwave', b.x - S.w, y, S.w, S.h, -S.speed, 0, 0);
  spawn(f, 'shockwave', b.x + b.w, y, S.w, S.h, S.speed, 0, 0);
  const n = f.spots.length;
  if (n === 0) return;
  // Two spots per pound, taking turns, so every spot falls in a cycle.
  for (let j = 0; j < Math.min(2, n); j++) {
    const sp = f.spots[(f.pounds - 1 + 2 * j) % n];
    spawn(f, 'debris', sp.x + 0.5 - D.w / 2, sp.y, D.w, D.h, 0, 0, D.warn);
  }
}

/** Telegraphs count down; live projectiles move, break at the towers, and hurt her. */
function stepProjectiles(f: Fight, k: BossCtx, dt: number) {
  const b = f.boss;
  const { x0, x1, floor } = f.arena;
  const h = k.hero;
  for (let i = f.projectiles.length - 1; i >= 0; i--) {
    const p = f.projectiles[i];
    if (p.warn > 0) {
      p.warn = Math.max(0, p.warn - dt);
      if (p.kind === 'barrel') {
        // Held over his head; let go, it lands on the deck in front of him and rolls.
        p.x = b.x + b.w / 2 - p.w / 2; p.y = b.y - p.h;
        if (p.warn === 0 && b.aimX !== null) {
          // A lob: from his hands to land on the mark after BOSS.lob.time.
          const T = BOSS.lob.time;
          p.vx = (b.aimX - p.w / 2 - p.x) / T;
          p.vy = (floor - p.h - p.y - 0.5 * BOSS.lob.g * T * T) / T;
        } else if (p.warn === 0) {
          p.x = b.facing > 0 ? b.x + b.w : b.x - p.w;
          p.y = floor - p.h;
          p.vx = b.facing * BOSS.barrel.speed;
        }
      }
      continue;
    }
    if (p.kind === 'debris') p.vy += BOSS.debris.g * dt;
    const flying = p.kind === 'barrel' && p.y + p.h < floor - 1e-9;
    if (flying) p.vy += BOSS.lob.g * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (flying && p.y + p.h >= floor) {
      // A lobbed barrel lands and rolls on, away from him.
      p.y = floor - p.h;
      p.vy = 0;
      p.vx = sign(p.x + p.w / 2 - (b.x + b.w / 2)) * BOSS.barrel.speed;
    }
    if (p.x < x0 || p.x + p.w > x1 + 1) { drop(f, i); continue; }
    if (overlaps(p, h)) { drop(f, i); k.hurt(); continue; }
    if (p.kind === 'debris' && p.y + p.h >= floor) drop(f, i);
  }
}

/** The camera's left edge, kept on the arena while the fight is on. */
export function lockCamera(f: Fight, x: number, viewCols: number): number {
  if (!f.on) return x;
  const { viewL, viewR } = f.arena;
  if (viewR - viewL <= viewCols) return (viewL + viewR) / 2 - viewCols / 2;
  return Math.min(viewR - viewCols, Math.max(viewL, x));
}

/** How far in from the view's edge she is kept when the view has to lean toward him. */
const FRAME_EDGE = 2.5;
/** The gorilla's width in tiles, for framing. */
const FRAME_BOSS_W = 2.2;

/**
 * The fight camera's left edge (tiles): both fighters in view when they fit,
 * centred between them; otherwise she stays FRAME_EDGE from the edge on her
 * side and the rest of the view looks toward him. Always inside the arena.
 */
export function frameFight(arena: { viewL: number; viewR: number }, heroX: number, bossX: number, viewCols: number): number {
  const { viewL, viewR } = arena;
  if (viewR - viewL <= viewCols) return (viewL + viewR) / 2 - viewCols / 2;
  const lo = Math.min(heroX, bossX), hi = Math.max(heroX + 1, bossX + FRAME_BOSS_W);
  let x: number;
  if (hi - lo + 2 <= viewCols) x = (lo + hi) / 2 - viewCols / 2;
  else x = bossX > heroX ? heroX - FRAME_EDGE : heroX + 1 + FRAME_EDGE - viewCols;
  return Math.min(viewR - viewCols, Math.max(viewL, x));
}
