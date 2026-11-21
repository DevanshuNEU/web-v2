import { describe, it, expect } from 'vitest';
import { ROWS, TILE, isOneWayTile, isSolidTile, parseLevel, tileAt, type Level } from '@/components/apps/games/platformer/sim/level';
import { POINTS, createWorld, drainEvents, enterLevel, score, stepWorld, tile, type GameEvent, type World } from '@/components/apps/games/platformer/sim/world';
import { BOSS } from '@/components/apps/games/platformer/sim/boss';
import { DT, custom, run, runUntil } from '../setup/platformerWorld';
import { reach } from '../setup/platformerReach';
import { STORY, nextStoryId, storyEntry, storyLevelDef } from '@/components/apps/games/platformer/sim/story';
import { difficultyOf } from '@/components/apps/games/platformer/sim/difficulty';
import { STORY_TEXT, storyText } from '@/components/apps/games/platformer/story/text';
import { emptyFrame, type InputFrame } from '@/components/apps/games/platformer/input/frame';

/**
 * A test arena, 40 columns: the approach (start at 1), the left tower (3, 4)
 * with the entry gate (z) in its doorway, the door checkpoint at 5, the
 * arena 5 to 34 with a cable down from each tower, debris spots on row 0,
 * the gorilla (Y) at 24, the right tower (35, 36) with the exit gate (Z),
 * and the goal at 38.
 */
function arenaRows(): string[] {
  const g = Array.from({ length: ROWS }, () => Array<string>(40).fill('.'));
  for (let x = 0; x < 40; x++) { g[12][x] = '='; g[13][x] = '#'; }
  g[11][1] = 'P';
  for (let y = 0; y <= 7; y++) for (const x of [3, 4, 35, 36]) g[y][x] = 'X';
  for (let y = 8; y <= 11; y++) { g[y][4] = 'z'; g[y][35] = 'Z'; }
  g[11][5] = 'K';
  for (let x = 6; x <= 15; x++) g[6 + Math.floor((x - 6) / 2)][x] = '/';
  for (let x = 25; x <= 34; x++) g[6 + Math.floor((34 - x) / 2)][x] = '/';
  for (const x of [10, 16, 23, 29]) g[0][x] = ':';
  g[11][24] = 'Y';
  g[6][38] = 'G';
  return g.map(r => r.join(''));
}
const arena = (): Level => custom(arenaRows(), 'zakim', { sky: 'morning' });

/** A story world on the test arena with all six moves. */
function arenaWorld(): World {
  const w = createWorld({ rand: () => 0.5, mode: 'story', abilities: { wallJump: true, dash: true, blade: true } });
  enterLevel(w, 3, arena());
  drainEvents(w);
  return w;
}

describe('The boss arena in the level data', () => {
  it('parses Y as the gorilla spawn, z and Z as the gates, / as cables and : as debris spots', () => {
    const l = arena();
    expect(l.theme).toBe('zakim');
    expect(l.boss).toEqual({ x: 24, y: 12 });
    // The entry gate starts open (its tiles are empty); the exit gate starts shut.
    expect(l.gates.filter(g => g.x === 4).map(g => [g.y, g.closed])).toEqual([[8, false], [9, false], [10, false], [11, false]]);
    expect(l.gates.filter(g => g.x === 35).map(g => [g.y, g.closed])).toEqual([[8, true], [9, true], [10, true], [11, true]]);
    expect(tileAt(l.tiles, l.cols, 4, 9)).toBe(TILE.EMPTY);
    expect(tileAt(l.tiles, l.cols, 35, 9)).toBe(TILE.GATE);
    expect(isSolidTile(TILE.GATE)).toBe(true);
    // Cables are one-way ledges: land from above, pass from below and the side.
    expect(tileAt(l.tiles, l.cols, 6, 6)).toBe(TILE.CABLE);
    expect(isOneWayTile(TILE.CABLE)).toBe(true);
    expect(isSolidTile(TILE.CABLE)).toBe(false);
    expect(l.debris).toEqual([{ x: 10, y: 0 }, { x: 16, y: 0 }, { x: 23, y: 0 }, { x: 29, y: 0 }]);
  });

  it('a level has at most one gorilla; most levels have none', () => {
    const rows = arenaRows();
    rows[11] = rows[11].slice(0, 20) + 'Y' + rows[11].slice(21);
    expect(() => custom(rows, 'zakim')).toThrow(/one boss/);
    expect(custom(['.P......', '########']).boss).toBeNull();
    expect(custom(['.P......', '########']).gates).toEqual([]);
  });

  it('parses the same through parseLevel with any theme rules intact', () => {
    expect(() => parseLevel({ id: 5, label: 'x', name: 'x', theme: 'zakim', rows: arenaRows() })).not.toThrow();
  });
});

describe('The gorilla in the world', () => {
  it('a level with Y has a boss, asleep at his spot, full health, phase 1; other levels have none', () => {
    const w = arenaWorld();
    const b = w.boss!;
    expect(b).not.toBeNull();
    expect(b.kind).toBe('gorilla');
    expect(b.hp).toBe(12);
    expect(b.maxHp).toBe(12);
    expect(b.phase).toBe(1);
    expect(b.state).toBe('idle');
    expect(b.punish).toBe(false);
    expect(b.taunt).toBeNull();
    // He stands on the deck, centred on his column, facing the door.
    expect(b.y + b.h).toBeCloseTo(12, 6);
    expect(b.x + b.w / 2).toBeCloseTo(24.5, 6);
    expect(b.facing).toBe(-1);
    expect(w.projectiles).toEqual([]);
    const plain = createWorld({ rand: () => 0.5, mode: 'story', levelId: '4-4' });
    expect(plain.boss).toBeNull();
    expect(plain.projectiles).toEqual([]);
  });
});

/** Stand her on the deck at column x (feet on row 12), still. */
function standAt(w: World, x: number) {
  const h = w.hero;
  h.x = x + (1 - h.w) / 2; h.y = 12 - h.h; h.vx = 0; h.vy = 0; h.onGround = true;
}
/** Walk her into the arena from the door until the fight starts. */
function enter(w: World) {
  standAt(w, 5);
  if (!runUntil(w, ww => ww.boss!.state !== 'idle', { move: 1 }, 3)) throw new Error('the fight never started');
}
/** Every event over `seconds` of play with this input. */
function eventsOver(w: World, seconds: number, input: Parameters<typeof run>[2] = {}): GameEvent[] {
  const out: GameEvent[] = [];
  run(w, seconds, input, ww => { out.push(...drainEvents(ww)); });
  return out;
}

describe('The fight starts at the arena door', () => {
  it('he sleeps until she steps in past the door; then he wakes with a taunt and the gate shuts behind her', () => {
    const w = arenaWorld();
    standAt(w, 1);
    run(w, 1);
    expect(w.boss!.state).toBe('idle');
    expect(tile(w, 4, 9)).toBe(TILE.EMPTY);
    standAt(w, 5);
    const ev: GameEvent[] = [];
    runUntil(w, ww => { ev.push(...drainEvents(ww)); return ww.boss!.state !== 'idle'; }, { move: 1 }, 3);
    ev.push(...drainEvents(w));
    expect(w.boss!.state).toBe('intro');
    expect(w.boss!.taunt).toBe('boss-taunt-1');
    expect(ev.some(e => e.type === 'bossTaunt' && e.n === 1)).toBe(true);
    for (let y = 8; y <= 11; y++) expect(tile(w, 4, y), `gate row ${y}`).toBe(TILE.GATE);
    // The exit stays shut.
    expect(tile(w, 35, 9)).toBe(TILE.GATE);
  });

  it('once the fight is on, the camera stays on the arena, towers included', () => {
    const w = arenaWorld();
    w.viewCols = 17;
    enter(w);
    standAt(w, 5);
    run(w, 3, {}, ww => { ww.invuln = 1; });
    expect(w.cam.x).toBeGreaterThanOrEqual(3 - 1e-6);
    // Off to the far side (safe from him: this is a test of the camera alone).
    standAt(w, 34);
    run(w, 3, {}, ww => { ww.invuln = 1; });
    expect(w.cam.x + w.viewCols).toBeLessThanOrEqual(37 + 1e-6);
  });

  it('a view wider than the arena centres on it', () => {
    const w = arenaWorld();
    w.viewCols = 40;
    enter(w);
    run(w, 2);
    expect(w.cam.x).toBeCloseTo((3 + 37) / 2 - 20, 3);
  });
});

/** Dangerous things coming at her along the deck (projectiles, him in a lunge): the gap from her nearest edge, or Infinity. */
function incoming(w: World): number {
  const h = w.hero;
  let best = Infinity;
  const b = w.boss!;
  const movers: { x: number; y: number; w: number; h: number; vx: number; warn: number }[] = [...w.projectiles];
  if (b.state === 'lunge') movers.push({ ...b, warn: 0 });
  for (const p of movers) {
    if (p.warn > 0 || p.vx === 0) continue;
    const gap = p.vx > 0 ? h.x - (p.x + p.w) : p.x - (h.x + h.w);
    if (gap >= -0.2 && p.y + p.h > h.y && gap < best) best = gap;
  }
  return best;
}
/** Run, jumping (held, full height) whenever something rolls within `near` tiles of her. Returns the events. */
function jumpingOver(w: World, seconds: number, near = 1.5): GameEvent[] {
  const out: GameEvent[] = [];
  for (let i = 0; i < seconds / DT; i++) {
    const jump = w.hero.onGround && incoming(w) < near;
    stepWorld(w, { ...emptyFrame(), jumpPressed: jump, jumpHeld: !w.hero.onGround || jump }, DT);
    out.push(...drainEvents(w));
  }
  return out;
}
/** Step until his state is `s` (or `max` seconds), keeping her alive. */
function until(w: World, s: string, max = 10, input: Parameters<typeof run>[2] = {}) {
  if (!runUntil(w, ww => { ww.invuln = 1; return ww.boss!.state === s; }, input, max)) throw new Error(`never reached ${s} (at ${w.boss!.state})`);
}
const hurtOrDie = (ev: GameEvent[]) => ev.filter(e => e.type === 'hurt' || e.type === 'die');

describe('Phase 1: the barrel', () => {
  it('after the intro he walks toward her, then lifts a barrel over his head: a telegraph of at least 0.6 s that cannot hurt', () => {
    const w = arenaWorld();
    enter(w);
    standAt(w, 7);
    expect(BOSS.warn).toBeGreaterThanOrEqual(0.6);
    const x0 = w.boss!.x;
    until(w, 'throwWarn');
    expect(w.boss!.x).toBeLessThan(x0);
    expect(w.boss!.facing).toBe(-1);
    const held = w.projectiles.filter(p => p.kind === 'barrel');
    expect(held).toHaveLength(1);
    expect(held[0].warn).toBeGreaterThanOrEqual(0.6 - 1e-9);
    // Held over his head.
    expect(held[0].y + held[0].h).toBeLessThanOrEqual(w.boss!.y + 1e-6);
    // It stays a telegraph for the whole wind up.
    let t = 0;
    runUntil(w, ww => { t += DT; return ww.projectiles[0].warn <= 0; });
    expect(t).toBeGreaterThanOrEqual(0.6);
  });

  it('then it rolls along the deck at her; standing still, it knocks her out', () => {
    const w = arenaWorld();
    enter(w);
    standAt(w, 7);
    until(w, 'throwWarn');
    runUntil(w, ww => ww.projectiles[0].warn <= 0, {}, 2);
    const p = w.projectiles[0];
    expect(p.y + p.h).toBeCloseTo(12, 6);
    expect(p.vx).toBeLessThan(0);
    const ev = eventsOver(w, 3);
    expect(ev.some(e => e.type === 'die')).toBe(true);
  });

  it('jumped, it rolls under her and breaks at the tower: no damage', () => {
    const w = arenaWorld();
    enter(w);
    standAt(w, 7);
    until(w, 'throwWarn');
    drainEvents(w);
    const ev = jumpingOver(w, 3.5);
    expect(hurtOrDie(ev)).toEqual([]);
    expect(w.projectiles).toEqual([]);
  });

  it('when the barrel is gone he beats his chest and taunts: a punish window of at least 1.2 s', () => {
    const w = arenaWorld();
    enter(w);
    standAt(w, 7);
    until(w, 'throwWarn');
    jumpingOver(w, 0.1);
    let ev: GameEvent[] = [];
    for (let i = 0; i < 5 / DT && w.boss!.state !== 'chestBeat'; i++) ev = ev.concat(jumpingOver(w, DT));
    expect(w.boss!.state).toBe('chestBeat');
    expect(w.projectiles).toEqual([]);
    ev = ev.concat(drainEvents(w));
    expect(w.boss!.punish).toBe(true);
    expect(w.boss!.taunt).toMatch(/^boss-taunt-\d$/);
    expect(ev.some(e => e.type === 'bossTaunt')).toBe(true);
    let t = 0;
    runUntil(w, ww => { t += DT; return !ww.boss!.punish; }, {}, 5);
    expect(t).toBeGreaterThanOrEqual(1.2);
  });
});

/** Through the first barrel to the chest beat, standing at column 7 and jumping the barrel. */
function toChestBeat(w: World) {
  enter(w);
  standAt(w, 7);
  until(w, 'throwWarn');
  for (let i = 0; i < 6 / DT && w.boss!.state !== 'chestBeat'; i++) jumpingOver(w, DT);
  if (w.boss!.state !== 'chestBeat') throw new Error(`no chest beat (at ${w.boss!.state})`);
  drainEvents(w);
}
/** Put her on the deck right beside him, on the side she is on, facing him. */
function besideHim(w: World) {
  const b = w.boss!;
  const h = w.hero;
  const left = h.x + h.w / 2 < b.x + b.w / 2;
  h.x = left ? b.x - h.w - 0.3 : b.x + b.w + 0.3;
  h.y = 12 - h.h; h.vx = 0; h.vy = 0; h.onGround = true;
  h.facing = left ? 1 : -1;
}
/** One blade press, then the swing plays out. Returns the events. */
function swing(w: World): GameEvent[] {
  stepWorld(w, { ...emptyFrame(), actionPressed: true }, DT);
  return [drainEvents(w), eventsOver(w, 0.3)].flat();
}
/** Drop her onto his head from a little above, falling. */
function dropOnHead(w: World) {
  const b = w.boss!;
  const h = w.hero;
  h.x = b.x + b.w / 2 - h.w / 2; h.y = b.y - 0.6 - h.h; h.vx = 0; h.vy = 6; h.onGround = false; h.coyote = 0;
}

describe('Hitting him: the blade, the punish window, stomps', () => {
  it('a blade hit outside a punish window deals 1', () => {
    const w = arenaWorld();
    enter(w);
    standAt(w, 7);
    until(w, 'throwWarn');
    w.invuln = 5;
    besideHim(w);
    const ev = swing(w);
    expect(ev.filter(e => e.type === 'bossHit').map(e => e.n)).toEqual([1]);
    expect(w.boss!.hp).toBe(11);
  });

  it('a blade hit in a punish window deals 2, one hit per swing', () => {
    const w = arenaWorld();
    toChestBeat(w);
    besideHim(w);
    const ev = swing(w);
    expect(ev.filter(e => e.type === 'bossHit').map(e => e.n)).toEqual([2]);
    expect(w.boss!.hp).toBe(10);
  });

  it('he cannot be hurt before the fight starts or while he wakes up', () => {
    const w = arenaWorld();
    w.invuln = 5;
    besideHim(w);
    swing(w);
    expect(w.boss!.hp).toBe(12);
    enter(w);
    expect(w.boss!.state).toBe('intro');
    w.invuln = 5;
    besideHim(w);
    swing(w);
    expect(w.boss!.hp).toBe(12);
  });

  it('touching him hurts her outside a punish window; inside one it is safe, and he is never hurt by a touch', () => {
    const w = arenaWorld();
    enter(w);
    standAt(w, 7);
    until(w, 'throwWarn');
    const b = w.boss!;
    standAt(w, 0);
    w.hero.x = b.x + 0.5;
    w.invuln = 0;
    const ev = eventsOver(w, 0.05);
    expect(ev.some(e => e.type === 'die')).toBe(true);
    expect(b.hp).toBe(12);

    const v = arenaWorld();
    toChestBeat(v);
    standAt(v, 0);
    v.hero.x = v.boss!.x + 0.5;
    v.invuln = 0;
    const evs = eventsOver(v, 0.5);
    expect(evs.filter(e => e.type.startsWith('boss'))).toEqual([]);
    expect(hurtOrDie(evs)).toEqual([]);
    expect(v.boss!.hp).toBe(12);
  });

  it('a stomp outside a punish window bounces her off with no damage; in one it deals 1', () => {
    const w = arenaWorld();
    enter(w);
    standAt(w, 7);
    until(w, 'throwWarn');
    dropOnHead(w);
    w.invuln = 0;
    let ev = eventsOver(w, 0.12);
    expect(w.hero.vy).toBeLessThan(0);
    expect(hurtOrDie(ev)).toEqual([]);
    expect(w.boss!.hp).toBe(12);

    const v = arenaWorld();
    toChestBeat(v);
    dropOnHead(v);
    ev = eventsOver(v, 0.12);
    expect(v.hero.vy).toBeLessThan(0);
    expect(ev.filter(e => e.type === 'bossHit').map(e => e.n)).toEqual([1]);
    expect(v.boss!.hp).toBe(11);
  });

  it('a dash goes through him unharmed', () => {
    const w = arenaWorld();
    enter(w);
    standAt(w, 7);
    until(w, 'throwWarn');
    w.invuln = 0;
    besideHim(w);
    stepWorld(w, { ...emptyFrame(), dashPressed: true, move: 1 }, DT);
    expect(hurtOrDie(eventsOver(w, 0.15, { move: 1 }))).toEqual([]);
  });
});

/** Through the first barrel and chest beat to the lunge's telegraph. */
function toLunge(w: World) {
  toChestBeat(w);
  standAt(w, 7);
  until(w, 'lungeWarn');
  drainEvents(w);
}

describe('Phase 1: the lunge', () => {
  it('his second attack: he crouches facing her (a telegraph of at least 0.6 s), then charges across the deck to the tower', () => {
    const w = arenaWorld();
    toLunge(w);
    const b = w.boss!;
    expect(b.facing).toBe(-1);
    expect(b.punish).toBe(false);
    let t = 0;
    runUntil(w, ww => { ww.invuln = 1; t += DT; return ww.boss!.state !== 'lungeWarn'; });
    expect(t).toBeGreaterThanOrEqual(0.6);
    expect(b.state).toBe('lunge');
    w.invuln = 1;
    run(w, 0.3, {}, ww => { ww.invuln = 1; });
    expect(b.vx).toBeLessThan(-8);
    until(w, 'dazed', 3);
    expect(b.x).toBeCloseTo(5, 6);
  });

  it('standing still, the charge knocks her out', () => {
    const w = arenaWorld();
    toLunge(w);
    w.invuln = 0;
    expect(eventsOver(w, 2.5).some(e => e.type === 'die')).toBe(true);
  });

  it('jumped as he comes, he runs under her: no damage', () => {
    const w = arenaWorld();
    toLunge(w);
    w.invuln = 0;
    const ev = jumpingOver(w, 2.5, 2.5);
    expect(hurtOrDie(ev)).toEqual([]);
    expect(w.boss!.state).toBe('dazed');
  });

  it('or she dashes through him: no damage', () => {
    const w = arenaWorld();
    toLunge(w);
    w.invuln = 0;
    const ev: GameEvent[] = [];
    let dashed = false;
    for (let i = 0; i < 2.5 / DT; i++) {
      const b = w.boss!;
      const go = !dashed && b.state === 'lunge' && b.x - (w.hero.x + w.hero.w) < 1.2;
      if (go) dashed = true;
      stepWorld(w, { ...emptyFrame(), dashPressed: go, move: go ? 1 : 0 }, DT);
      ev.push(...drainEvents(w));
    }
    expect(dashed).toBe(true);
    expect(hurtOrDie(ev)).toEqual([]);
  });

  it('he hits the tower and is dazed: a punish window of at least 1.2 s', () => {
    const w = arenaWorld();
    toLunge(w);
    jumpingOver(w, 0.01);
    for (let i = 0; i < 3 / DT && w.boss!.state !== 'dazed'; i++) jumpingOver(w, DT, 2.5);
    expect(w.boss!.state).toBe('dazed');
    expect(w.boss!.punish).toBe(true);
    standAt(w, 14);
    let t = 0;
    runUntil(w, ww => { t += DT; return !ww.boss!.punish; }, {}, 5);
    expect(t).toBeGreaterThanOrEqual(1.2);
  });
});

describe('Phases: hp 12 to 8, 8 to 4, 4 to 0', () => {
  it('a hit never skips a phase: at the threshold he stops at 8 and roars into phase 2', () => {
    const w = arenaWorld();
    w.boss!.hp = 9;
    toChestBeat(w);
    besideHim(w);
    const ev = swing(w);
    const b = w.boss!;
    expect(b.hp).toBe(8);
    expect(ev.filter(e => e.type === 'bossHit').map(e => e.n)).toEqual([1]);
    expect(ev.filter(e => e.type === 'bossPhase').map(e => e.n)).toEqual([2]);
    expect(b.phase).toBe(2);
    expect(b.state).toBe('roar');
    expect(b.taunt).toBe('boss-taunt-5');
  });

  it('while he roars he cannot be hurt, touching him is safe, and nothing he threw is left', () => {
    const w = arenaWorld();
    w.boss!.hp = 9;
    toChestBeat(w);
    besideHim(w);
    swing(w);
    const b = w.boss!;
    expect(b.state).toBe('roar');
    expect(w.projectiles).toEqual([]);
    besideHim(w);
    swing(w);
    expect(b.hp).toBe(8);
    standAt(w, 0);
    w.hero.x = b.x + 0.5;
    w.invuln = 0;
    expect(hurtOrDie(eventsOver(w, 0.3))).toEqual([]);
    let last = 0;
    runUntil(w, ww => { if (ww.boss!.state === 'roar') last = ww.boss!.stateT; return ww.boss!.state !== 'roar'; }, {}, 5);
    expect(last).toBeGreaterThanOrEqual(BOSS.roar - 0.02);
  });

  it('at 4 he roars into phase 3', () => {
    const w = arenaWorld();
    w.boss!.hp = 5;
    toChestBeat(w);
    besideHim(w);
    const ev = swing(w);
    expect(w.boss!.hp).toBe(4);
    expect(ev.filter(e => e.type === 'bossPhase').map(e => e.n)).toEqual([3]);
    expect(w.boss!.phase).toBe(3);
    expect(w.boss!.taunt).toBe('boss-taunt-6');
  });
});

/** Into phase 2 (from hp 9, one punish hit), past the roar, to the first pound's telegraph. */
function toPhase2(w: World) {
  w.boss!.hp = 9;
  toChestBeat(w);
  besideHim(w);
  swing(w);
  standAt(w, 7);
  until(w, 'poundWarn');
  drainEvents(w);
}
/** Events over `seconds` with every shockwave lifted out of her way (a test of the debris alone). */
function debrisOnly(w: World, seconds: number): GameEvent[] {
  const out: GameEvent[] = [];
  run(w, seconds, {}, ww => { for (const p of ww.projectiles) if (p.kind === 'shockwave') p.y = -50; out.push(...drainEvents(ww)); });
  return out;
}
/** Step through one pound's telegraph to the moment it lands. */
function toPound(w: World) {
  if (!runUntil(w, ww => { ww.invuln = 1; return ww.boss!.state === 'pound'; }, {}, 3)) throw new Error('no pound');
}

describe('Phase 2: the ground pound', () => {
  it('he raises his fists (a telegraph of at least 0.6 s, not a punish window), then pounds: a shockwave runs along the deck each way', () => {
    const w = arenaWorld();
    toPhase2(w);
    const b = w.boss!;
    expect(b.phase).toBe(2);
    expect(b.punish).toBe(false);
    let t = 0;
    runUntil(w, ww => { ww.invuln = 1; t += DT; return ww.boss!.state === 'pound'; }, {}, 3);
    expect(t).toBeGreaterThanOrEqual(0.6);
    const waves = w.projectiles.filter(p => p.kind === 'shockwave');
    expect(waves).toHaveLength(2);
    expect(waves.map(p => Math.sign(p.vx)).sort()).toEqual([-1, 1]);
    for (const p of waves) {
      expect(p.y + p.h).toBeCloseTo(12, 6);
      expect(p.warn).toBe(0);
      expect(Math.abs(p.vx)).toBe(BOSS.shock.speed);
    }
  });

  it('standing still, the shockwave knocks her out; jumped, it runs under her and breaks at the tower', () => {
    const w = arenaWorld();
    toPhase2(w);
    standAt(w, 5);
    w.invuln = 0;
    expect(eventsOver(w, 3).some(e => e.type === 'die')).toBe(true);

    const v = arenaWorld();
    toPhase2(v);
    standAt(v, 5);
    v.invuln = 0;
    toPound(v);
    v.invuln = 0;
    // The first pound's wave reaches her, passes under her jump and breaks at the tower before the second pound's wave comes.
    const ev = jumpingOver(v, 1.7, 1.5);
    expect(hurtOrDie(ev)).toEqual([]);
    expect(v.projectiles.filter(p => p.kind === 'shockwave' && p.vx < 0 && p.x < v.hero.x)).toEqual([]);
  });

  it('the pound shakes debris loose at the marked spots: a marker first (at least 0.6 s), then it falls and breaks on the deck', () => {
    const w = arenaWorld();
    toPhase2(w);
    toPound(w);
    const debris = w.projectiles.filter(p => p.kind === 'debris');
    expect(debris.length).toBeGreaterThanOrEqual(1);
    const spots = [10, 16, 23, 29];
    for (const d of debris) {
      expect(spots).toContain(Math.round(d.x + d.w / 2 - 0.5));
      expect(d.warn).toBeGreaterThanOrEqual(0.6);
      expect(d.y).toBe(0);
    }
    run(w, BOSS.debris.warn + 0.05, {}, ww => { ww.invuln = 1; });
    const falling = w.projectiles.filter(p => p.kind === 'debris');
    expect(falling.every(p => p.warn === 0 && p.y > 0)).toBe(true);
    run(w, 1.2, {}, ww => { ww.invuln = 1; });
    expect(w.projectiles.some(p => p.kind === 'debris' && p.y === 0 && p.warn === 0)).toBe(false);
  });

  it('debris that lands on her hurts; a step aside is safe', () => {
    const w = arenaWorld();
    toPhase2(w);
    toPound(w);
    const d = w.projectiles.find(p => p.kind === 'debris')!;
    const col = Math.round(d.x + d.w / 2 - 0.5);
    standAt(w, col);
    w.invuln = 0;
    expect(debrisOnly(w, BOSS.debris.warn + 1).some(e => e.type === 'die')).toBe(true);

    const v = arenaWorld();
    toPhase2(v);
    toPound(v);
    const e = v.projectiles.find(p => p.kind === 'debris')!;
    // Two tiles aside, away from him.
    const ec = Math.round(e.x + e.w / 2 - 0.5);
    standAt(v, ec + (ec < v.boss!.x ? -2 : 2));
    v.invuln = 0;
    expect(hurtOrDie(debrisOnly(v, BOSS.debris.warn + 1))).toEqual([]);
  });

  it('after three pounds he is winded: a punish window of at least 2 s', () => {
    const w = arenaWorld();
    toPhase2(w);
    let pounds = 0;
    let prev = w.boss!.state;
    runUntil(w, ww => {
      ww.invuln = 1;
      const s = ww.boss!.state;
      if (s === 'pound' && prev !== 'pound') pounds++;
      prev = s;
      return s === 'winded';
    }, {}, 10);
    expect(pounds).toBe(3);
    expect(w.boss!.punish).toBe(true);
    let t = 0;
    runUntil(w, ww => { ww.invuln = 1; t += DT; return !ww.boss!.punish; }, {}, 5);
    expect(t).toBeGreaterThanOrEqual(2);
  });
});

/** Into phase 3 (from hp 5, one punish hit), past the roar, to the start of his climb. She stands at `at`. */
function toPhase3(w: World, at = 20) {
  w.boss!.hp = 5;
  toChestBeat(w);
  besideHim(w);
  swing(w);
  standAt(w, at);
  until(w, 'climb');
  drainEvents(w);
}
/** Keep her safe and still until he is in state `s`. */
const safeUntil = (w: World, s: string, max = 8) => until(w, s, max);

describe('Phase 3: up on the cables', () => {
  it('he climbs the cable farther from her to its top and perches there', () => {
    const w = arenaWorld();
    toPhase3(w, 20);
    safeUntil(w, 'throwWarn');
    const b = w.boss!;
    // The left cable's top steps are columns 6 and 7 at row 6; she is right of centre, so he takes the left one.
    expect(b.y + b.h).toBeCloseTo(6, 6);
    expect(b.x + b.w / 2).toBeCloseTo(7, 1);
    const v = arenaWorld();
    toPhase3(v, 8);
    safeUntil(v, 'throwWarn');
    expect(v.boss!.x + v.boss!.w / 2).toBeCloseTo(33.9, 1);
  });

  it('from the perch he marks where she stands (a telegraph of at least 0.6 s), then lobs a barrel that lands there and rolls away from him', () => {
    const w = arenaWorld();
    toPhase3(w, 20);
    safeUntil(w, 'throwWarn');
    const b = w.boss!;
    expect(b.aimX).toBeCloseTo(w.hero.x + w.hero.w / 2, 6);
    const aim = b.aimX!;
    let t = 0;
    runUntil(w, ww => { ww.invuln = 1; t += DT; return ww.projectiles.some(p => p.kind === 'barrel' && p.warn === 0); }, {}, 3);
    expect(t).toBeGreaterThanOrEqual(0.6);
    // She steps away from the mark; the barrel lands on it.
    standAt(w, 12);
    let landed: number | null = null;
    runUntil(w, ww => {
      ww.invuln = 1;
      const p = ww.projectiles.find(q => q.kind === 'barrel');
      if (p && p.y + p.h >= 12 - 1e-6 && landed === null) landed = p.x + p.w / 2;
      return landed !== null;
    }, {}, 3);
    expect(landed).not.toBeNull();
    expect(Math.abs(landed! - aim)).toBeLessThan(0.5);
    run(w, 0.1, {}, ww => { ww.invuln = 1; });
    expect(w.projectiles.find(q => q.kind === 'barrel')!.vx).toBeGreaterThan(0);
  });

  it('after two throws he marks her spot and slams down on it (a telegraph of at least 0.6 s); stepping aside is safe', () => {
    const w = arenaWorld();
    toPhase3(w, 20);
    // Two lobs (stepping off each mark), then the slam's mark.
    safeUntil(w, 'slamWarn', 10);
    const b = w.boss!;
    const aim = b.aimX!;
    expect(aim).toBeCloseTo(w.hero.x + w.hero.w / 2, 6);
    let t = 0;
    runUntil(w, ww => { ww.invuln = 1; t += DT; return ww.boss!.state !== 'slamWarn'; }, {}, 3);
    expect(t).toBeGreaterThanOrEqual(0.6);
    expect(b.state).toBe('slam');
    // Standing on the mark, the slam lands on her.
    w.invuln = 0;
    expect(eventsOver(w, 1).some(e => e.type === 'die')).toBe(true);

    const v = arenaWorld();
    toPhase3(v, 20);
    safeUntil(v, 'slamWarn', 10);
    standAt(v, Math.round(v.boss!.aimX!) - 4);
    for (const p of v.projectiles) p.y = -50;
    v.invuln = 0;
    const ev: GameEvent[] = [];
    runUntil(v, ww => { ev.push(...drainEvents(ww)); for (const p of ww.projectiles) p.y = -50; return ww.boss!.state === 'slumped'; }, {}, 3);
    expect(hurtOrDie(ev)).toEqual([]);
    expect(v.boss!.y + v.boss!.h).toBeCloseTo(12, 6);
    expect(v.boss!.x + v.boss!.w / 2).toBeCloseTo(aim, 1);
  });

  it('after the slam he is slumped on the deck: a punish window of at least 2 s', () => {
    const w = arenaWorld();
    toPhase3(w, 20);
    safeUntil(w, 'slumped', 12);
    expect(w.boss!.punish).toBe(true);
    let t = 0;
    runUntil(w, ww => { ww.invuln = 1; t += DT; return !ww.boss!.punish; }, {}, 5);
    expect(t).toBeGreaterThanOrEqual(2);
  });

  it('she can climb a cable: a hop up each step from the deck to the top, no double jump needed', () => {
    const l = arena();
    const top = { x: 7, y: 5, w: 1, h: 1 };
    const r = reach(l, { dash: false, wallJump: false, doubleJump: false, from: { x: 18, y: 11 }, targets: [top] });
    expect(r.touched).toEqual([true]);
    // A cable is one-way: she lands on it from above, and jumps up through it from below.
    const w = arenaWorld();
    standAt(w, 14);
    stepWorld(w, { ...emptyFrame(), jumpPressed: true, jumpHeld: true }, DT);
    run(w, 1.2, { jumpHeld: true });
    expect(w.hero.onGround).toBe(true);
    expect(w.hero.y + w.hero.h).toBeCloseTo(10, 6);
  });

  it('a down-strike onto his head deals double in phase 3, even up on his perch', () => {
    const w = arenaWorld();
    toPhase3(w, 20);
    safeUntil(w, 'throwWarn');
    const b = w.boss!;
    expect(b.punish).toBe(false);
    const h = w.hero;
    h.x = b.x + b.w / 2 - h.w / 2; h.y = b.y - 1 - h.h; h.vx = 0; h.vy = 2; h.onGround = false; h.coyote = 0;
    w.invuln = 0;
    stepWorld(w, { ...emptyFrame(), actionPressed: true }, DT);
    const ev = [drainEvents(w), eventsOver(w, 0.2)].flat();
    expect(ev.filter(e => e.type === 'bossHit').map(e => e.n)).toEqual([2]);
    expect(ev.some(e => e.type === 'pogo')).toBe(true);
    expect(hurtOrDie(ev)).toEqual([]);
    expect(b.hp).toBe(2);
  });
});

/** Phase 3 down to his last hit point, slumped on the deck, her beside him. */
function lastHit(w: World) {
  toPhase3(w, 20);
  w.boss!.hp = 1;
  safeUntil(w, 'slumped', 12);
  for (const p of w.projectiles) p.y = -50;
  besideHim(w);
  drainEvents(w);
}

describe('The finish', () => {
  it('at 0 he is down: slow motion, a last line that turns sheepish, and nothing he threw is left', () => {
    const w = arenaWorld();
    lastHit(w);
    const before = score(w);
    const ev = swing(w);
    const b = w.boss!;
    expect(b.hp).toBe(0);
    expect(ev.some(e => e.type === 'bossDown')).toBe(true);
    expect(b.state).toBe('down');
    expect(w.projectiles).toEqual([]);
    expect(w.slowMo).toBeGreaterThan(0.3);
    expect(b.taunt).toBe('boss-taunt-8');
    // He is worth POINTS.boss (on top of the hit itself, which scores nothing).
    expect(score(w) - before).toBe(POINTS.boss);
    expect(ev.some(e => e.type === 'kill' && e.n === POINTS.boss)).toBe(true);
    const later = eventsOver(w, 3);
    expect(w.slowMo).toBe(0);
    expect(later.filter(e => e.type === 'bossTaunt').map(e => e.n)).toEqual([0]);
    expect(b.taunt === 'boss-beaten' || b.taunt === null).toBe(true);
  });

  it('then the arena opens: the exit gate is gone, the camera is free, he is harmless, and she walks to the goal', () => {
    const w = arenaWorld();
    lastHit(w);
    swing(w);
    run(w, 3);
    const b = w.boss!;
    expect(b.state).toBe('beaten');
    for (let y = 8; y <= 11; y++) expect(tile(w, 35, y), `exit row ${y}`).toBe(TILE.EMPTY);
    expect(w.fight!.on).toBe(false);
    // Through him and out to the goal.
    standAt(w, 5);
    w.invuln = 0;
    const ev: GameEvent[] = [];
    runUntil(w, ww => { ev.push(...drainEvents(ww)); return ww.phase !== 'play'; }, { move: 1 }, 10);
    expect(hurtOrDie(ev)).toEqual([]);
    expect(ev.some(e => e.type === 'flag')).toBe(true);
  });

  it('beaten up on his perch, he falls to the deck', () => {
    const w = arenaWorld();
    toPhase3(w, 20);
    w.boss!.hp = 2;
    safeUntil(w, 'throwWarn');
    const b = w.boss!;
    const h = w.hero;
    h.x = b.x + b.w / 2 - h.w / 2; h.y = b.y - 1 - h.h; h.vx = 0; h.vy = 2; h.onGround = false; h.coyote = 0;
    stepWorld(w, { ...emptyFrame(), actionPressed: true }, DT);
    run(w, 0.2);
    expect(b.hp).toBe(0);
    run(w, 3);
    expect(b.state).toBe('beaten');
    expect(b.y + b.h).toBeCloseTo(12, 6);
  });
});

describe('No way out mid fight', () => {
  it('while the fight is on she cannot leave over a tower top: the arena holds her', () => {
    const w = arenaWorld();
    enter(w);
    const h = w.hero;
    // Up above the right tower's top, pushing out.
    h.x = 34 - h.w; h.y = -2; h.vx = 8; h.vy = -2; h.onGround = false;
    run(w, 0.6, { move: 1 }, ww => { ww.invuln = 1; });
    expect(h.x + h.w).toBeLessThanOrEqual(35 + 1e-6);
    h.x = 5.2; h.y = -2; h.vx = -8; h.vy = -2; h.onGround = false;
    run(w, 0.6, { move: -1 }, ww => { ww.invuln = 1; });
    expect(h.x).toBeGreaterThanOrEqual(5 - 1e-6);
  });
});

describe('A death restarts the fight at the arena door', () => {
  it('she respawns at the door checkpoint, minus 50, and he is back at full health, asleep at his spot, with nothing thrown', () => {
    const w = arenaWorld();
    w.boss!.hp = 9;
    toChestBeat(w);
    besideHim(w);
    swing(w);
    expect(w.boss!.phase).toBe(2);
    expect(w.checkpointIdx).toBe(0);
    w.stats.coins = 20;
    const before = score(w);
    // Into him outside a punish window.
    until(w, 'poundWarn');
    standAt(w, 0);
    w.hero.x = w.boss!.x + 0.5;
    w.invuln = 0;
    const ev = eventsOver(w, 3);
    expect(ev.some(e => e.type === 'die')).toBe(true);
    expect(ev.some(e => e.type === 'respawn')).toBe(true);
    expect(w.stats.deaths).toBe(1);
    expect(before - score(w)).toBe(POINTS.death);
    expect(Math.floor(w.hero.x)).toBe(5);
    const b = w.boss!;
    expect([b.hp, b.phase, b.state, b.punish, b.taunt, b.aimX]).toEqual([12, 1, 'idle', false, null, null]);
    expect(b.x + b.w / 2).toBeCloseTo(24.5, 6);
    expect(w.projectiles).toEqual([]);
    expect(w.fight!.on).toBe(false);
    expect(w.slowMo).toBe(0);
    // The gate stays shut behind her.
    expect(tile(w, 4, 9)).toBe(TILE.GATE);
  });

  it('stepping in again wakes him with a different line', () => {
    const w = arenaWorld();
    enter(w);
    standAt(w, 7);
    until(w, 'throwWarn');
    standAt(w, 0);
    w.hero.x = w.boss!.x + 0.5;
    w.invuln = 0;
    eventsOver(w, 3);
    expect(w.boss!.state).toBe('idle');
    const ev: GameEvent[] = [];
    runUntil(w, ww => { ev.push(...drainEvents(ww)); return ww.boss!.state !== 'idle'; }, { move: 1 }, 3);
    ev.push(...drainEvents(w));
    expect(w.boss!.taunt).toBe('boss-taunt-3');
    expect(ev.filter(e => e.type === 'bossTaunt').map(e => e.n)).toEqual([3]);
  });
});

const bossLevel = () => parseLevel(storyLevelDef('4-boss'));

describe('Story: 4-boss, The Ex-Bestie, on the bridge in the morning', () => {
  it('is built, after Revere Beach, in the zakim theme, its card after it', () => {
    const e = storyEntry('4-boss');
    expect([e.world, e.level, e.name, e.theme, e.built, e.cardId]).toEqual([4, 5, 'The Ex-Bestie', 'zakim', true, 'card-boss']);
    expect(nextStoryId('4-4')).toBe('4-boss');
    expect(STORY.filter(s => s.built).map(s => s.id).slice(-2)).toEqual(['4-4', '4-boss']);
    const w = createWorld({ rand: () => 0.5, mode: 'story', levelId: '4-boss' });
    expect(w.level.theme).toBe('zakim');
    expect(w.level.sky).toBe('morning');
    expect(w.boss).not.toBeNull();
  });

  it('an arena of its own: 14 rows, 40 to 60 columns, the gorilla between two gates, a cable from each tower, debris spots', () => {
    const l = bossLevel();
    expect(l.rows).toBe(ROWS);
    expect(l.cols).toBeGreaterThanOrEqual(40);
    expect(l.cols).toBeLessThanOrEqual(60);
    const entry = l.gates.filter(g => !g.closed), exit = l.gates.filter(g => g.closed);
    expect(entry.length).toBeGreaterThan(0);
    expect(exit.length).toBeGreaterThan(0);
    const x0 = Math.max(...entry.map(g => g.x)) + 1, x1 = Math.min(...exit.map(g => g.x)) - 1;
    expect(x1 - x0 + 1).toBeGreaterThanOrEqual(24);
    expect(l.boss!.x).toBeGreaterThan(x0);
    expect(l.boss!.x).toBeLessThan(x1);
    expect(l.goal.x).toBeGreaterThan(x1);
    expect(l.start.x).toBeLessThan(x0);
    const w = createWorld({ rand: () => 0.5, mode: 'story', levelId: '4-boss' });
    expect(w.fight!.perches).toHaveLength(2);
    expect(l.debris.length).toBeGreaterThanOrEqual(3);
    expect(l.enemies).toEqual([]);
  });

  it('the checkpoint is the arena door, and the Cannoli Shield waits at the entrance', () => {
    const l = bossLevel();
    const x0 = Math.max(...l.gates.filter(g => !g.closed).map(g => g.x)) + 1;
    expect(l.checkpoints).toEqual([{ x: x0, y: 12 }]);
    expect(l.pickups.map(p => p.kind)).toEqual(['cannoliShield']);
    expect(l.pickups[0].x).toBeLessThan(x0);
    expect(x0 - l.pickups[0].x).toBeLessThanOrEqual(5);
  });

  it('she walks in with no power; the goal is shut away until the exit gate opens', () => {
    const l = bossLevel();
    const x0 = Math.max(...l.gates.filter(g => !g.closed).map(g => g.x)) + 1;
    const door = { x: x0 + 2, y: 10, w: 1, h: 1 };
    expect(reach(l, { dash: false, wallJump: false, doubleJump: true, targets: [door] }).touched).toEqual([true]);
    expect(reach(l, { dash: false, wallJump: false, doubleJump: false }).reached).toBe(false);
    expect(reach(l, { dash: false, wallJump: false, doubleJump: true, gatesOpen: true }).reached).toBe(true);
  });

  it('is at least as hard as chapter 4\'s hardest level (the boss counts in the metric)', () => {
    const ch4 = ['4-1', '4-2', '4-3', '4-4'].map(id => difficultyOf(parseLevel(storyLevelDef(id))));
    expect(difficultyOf(bossLevel())).toBeGreaterThanOrEqual(Math.max(...ch4));
  });
});

describe('His lines', () => {
  const ids = [...Array.from({ length: 8 }, (_, i) => `boss-taunt-${i + 1}`), 'boss-beaten'];
  it('eight taunts and a sheepish beaten line, each one short line', () => {
    for (const id of ids) {
      const t = storyText(id);
      expect(t.length, id).toBeGreaterThan(0);
      expect(t, id).not.toMatch(/\n/);
      expect(t.length, id).toBeLessThanOrEqual(28);
    }
  });

  it('every line he says is one of them; a crowned device can swap any of them', () => {
    const w = arenaWorld();
    const said = new Set<string>();
    lastHit(w);
    swing(w);
    run(w, 3, {}, ww => { if (ww.boss!.taunt) said.add(ww.boss!.taunt); });
    for (const t of said) expect(STORY_TEXT[t], t).toBeDefined();
    expect(storyText('boss-taunt-2', { 'boss-taunt-2': 'A line of our own.' })).toBe('A line of our own.');
  });
});

/** Seconds each punish window lasts, by state. */
const PUNISH: Record<string, number> = { chestBeat: BOSS.chestBeat, dazed: BOSS.dazed, winded: BOSS.winded, slumped: BOSS.slumped };

/**
 * A beginner, scripted from what the screen shows: she walks in; jumps
 * whatever rolls or charges at her along the deck; steps off a marked spot
 * (falling debris, his aim); keeps a few tiles away from him; and in a
 * punish window walks up and presses the blade until it is nearly over.
 * Once he is beaten she walks to the goal. No dash, no climbing, no pogo.
 */
function beginner(w: World): InputFrame {
  const f = { ...emptyFrame() };
  const h = w.hero, b = w.boss!;
  const hc = h.x + h.w / 2, bc = b.x + b.w / 2;
  const fight = w.fight!;
  if (!fight.on) { f.move = 1; return f; }
  const { x0, x1 } = fight.arena;
  // Jump what comes along the deck.
  const threat = incoming(w);
  if (h.onGround && threat < (b.state === 'lunge' ? 2.8 : 1.5)) { f.jumpPressed = true; f.jumpHeld = true; return f; }
  if (!h.onGround) f.jumpHeld = true;
  // Step off a marked spot.
  for (const p of w.projectiles) {
    if (p.kind === 'debris' && p.warn > 0 && Math.abs(p.x + p.w / 2 - hc) < 1.4) { f.move = hc < (x0 + x1 + 1) / 2 ? 1 : -1; return f; }
  }
  if (b.aimX !== null && Math.abs(b.aimX - hc) < 2.6) { f.move = b.aimX > hc || hc > x1 - 2 ? -1 : 1; if (hc < x0 + 2) f.move = 1; return f; }
  // A punish window: walk up and swing while there is time.
  const left = (PUNISH[b.state] ?? 0) - b.stateT;
  const onDeck = b.y + b.h >= 12 - 1e-6;
  const gap = Math.abs(bc - hc) - b.w / 2 - h.w / 2;
  if (b.punish && onDeck && left > 0.35) {
    if (gap > 0.9) f.move = Math.sign(bc - hc);
    else if (h.onGround && !w.swing) f.actionPressed = true;
    return f;
  }
  // Otherwise keep a few tiles away.
  if (gap < 2.5 && onDeck) {
    const away = hc < bc ? -1 : 1;
    const room = away < 0 ? hc - x0 : x1 + 1 - hc;
    f.move = room > 1.5 ? away : -away;
  }
  return f;
}

/** Play the real 4-boss with the beginner. Returns the events and the seconds the fight took. */
function playBeginner(maxSeconds = 300) {
  const w = createWorld({ seed: 7, mode: 'story', levelId: '4-boss', abilities: { wallJump: true, dash: true, blade: true } });
  drainEvents(w);
  const ev: GameEvent[] = [];
  let start = -1, end = -1;
  for (let i = 0; i < maxSeconds / DT && w.phase === 'play'; i++) {
    stepWorld(w, beginner(w), DT);
    for (const e of drainEvents(w)) {
      ev.push(e);
      if (e.type === 'bossTaunt' && start < 0) start = w.t;
      if (e.type === 'bossDown') end = w.t;
    }
  }
  return { w, ev, seconds: end - start };
}

describe('A beginner can win', () => {
  const r = playBeginner();

  it('jumping what comes at her and swinging in punish windows, she sees all three phases and beats him in under 3 minutes', () => {
    expect(r.ev.filter(e => e.type === 'bossPhase').map(e => e.n)).toEqual([2, 3]);
    expect(r.ev.some(e => e.type === 'bossDown')).toBe(true);
    expect(r.seconds).toBeGreaterThan(0);
    expect(r.seconds).toBeLessThan(180);
  });

  it('then walks out through the open gate to the goal', () => {
    expect(r.w.boss!.state).toBe('beaten');
    expect(r.ev.some(e => e.type === 'flag')).toBe(true);
    expect(r.w.phase).not.toBe('play');
  });

  it('the fight is deterministic: the same play gives the same fight, whatever the seed', () => {
    const again = playBeginner();
    const key = (x: typeof r) => JSON.stringify([x.ev, x.w.boss, x.w.stats, x.w.t]);
    expect(key(again)).toBe(key(r));
    const w2 = createWorld({ seed: 99, mode: 'story', levelId: '4-boss', abilities: { wallJump: true, dash: true, blade: true } });
    drainEvents(w2);
    const ev2: GameEvent[] = [];
    for (let i = 0; i < 300 / DT && w2.phase === 'play'; i++) { stepWorld(w2, beginner(w2), DT); ev2.push(...drainEvents(w2)); }
    expect(JSON.stringify(ev2)).toBe(JSON.stringify(r.ev));
  });
});
