import { describe, it, expect } from 'vitest';
import {
  CARD_SECONDS, DYING_SECONDS, FINALE_SECONDS, LIVES, POINTS, SECRET_INDEX, TALLY_RATE,
  createWorld, drainEvents, enterLevel, flagBonus, score, scoreOf, setSecret, stepWorld,
  timeBonus, touchesPoleTop, unlocksSecret, type World, type EventType,
} from '@/components/apps/games/platformer/sim/world';
import { MAIN_LEVELS, ROWS, TILE, parseLevel, secretLevel, tileAt } from '@/components/apps/games/platformer/sim/level';
import { PHYS } from '@/components/apps/games/platformer/sim/physics';
import { RULES } from '@/lib/arcade/rules';
import { emptyFrame, type InputFrame } from '@/components/apps/games/platformer/input/frame';

const DT = 1 / 120;

/** A hand-made level: bottom-aligned rows, padded to 14 rows, a pole added at the right. */
function custom(rows: string[], theme: 'grass' | 'cave' | 'sky' = 'grass') {
  const w = rows[0].length;
  const full = [...Array(ROWS - rows.length).fill('.'.repeat(w)), ...rows];
  if (!full.some(r => r.includes('F'))) {
    const x = w - 2;
    for (let y = 2; y <= 11; y++) full[y] = full[y].slice(0, x) + (y === 2 ? 'F' : '|') + full[y].slice(x + 1);
  }
  return parseLevel({ id: 1, label: 'Test', name: 'Test', theme, rows: full });
}

function worldOn(rows: string[], index = 0): World {
  const w = createWorld({ rand: () => 0.5 });
  enterLevel(w, index, custom(rows));
  drainEvents(w);
  return w;
}

/**
 * Step with one input frame held for `seconds`. Edges in it (jumpPressed and
 * friends) are consumed by the first step, the way a real press is.
 */
function run(w: World, seconds: number, input: Partial<InputFrame> = {}, onStep?: (w: World) => void) {
  const f: InputFrame = { ...emptyFrame(), ...input };
  const n = Math.round(seconds / DT);
  for (let i = 0; i < n; i++) { stepWorld(w, f, DT); onStep?.(w); }
}

/** Step until `done` is true (or `max` seconds pass). Returns whether it happened. */
function runUntil(w: World, done: (w: World) => boolean, input: Partial<InputFrame> = {}, max = 10): boolean {
  const f: InputFrame = { ...emptyFrame(), ...input };
  for (let i = 0; i < max / DT; i++) { stepWorld(w, f, DT); if (done(w)) return true; }
  return false;
}

function eventsOf(w: World): EventType[] {
  return drainEvents(w).map(e => e.type);
}

const G40 = '#'.repeat(40);

describe('platformer scoring rules', () => {
  it('scores coins 10, stomps 50, bricks 20, clears 1000, plus flag and time bonus', () => {
    expect(scoreOf({ coins: 3, stomps: 2, bricks: 1, flag: 400, clears: 1, time: 870 })).toBe(30 + 100 + 20 + 400 + 1000 + 870);
  });

  it('time bonus starts at 1000 and falls 5 points per whole second to 0', () => {
    expect(timeBonus(0)).toBe(1000);
    expect(timeBonus(0.99)).toBe(1000);
    expect(timeBonus(10)).toBe(950);
    expect(timeBonus(199)).toBe(5);
    expect(timeBonus(500)).toBe(0);
  });

  const pole = { x: 50, top: 2, base: 11 };
  it('pays 2000 only for the very top tile of the pole', () => {
    expect(touchesPoleTop(2.999, pole)).toBe(true);
    expect(touchesPoleTop(3, pole)).toBe(false);
    expect(flagBonus(2.5, pole)).toBe(2000);
    expect(flagBonus(3.0, pole)).toBe(1000);
  });

  it('pays 100 to 1000 in steps of 100 by the height touched', () => {
    expect(flagBonus(11, pole)).toBe(200);
    expect(flagBonus(12, pole)).toBe(100);
    expect(flagBonus(7.5, pole)).toBe(500);
    const vals = [12, 10, 8, 6, 4, 3.01].map(y => flagBonus(y, pole));
    for (let i = 1; i < vals.length; i++) expect(vals[i]).toBeGreaterThanOrEqual(vals[i - 1]);
    for (const v of vals) expect(v % 100).toBe(0);
  });

  it('only the third level pole top unlocks the secret level', () => {
    expect(unlocksSecret(2, 2.5, pole)).toBe(true);
    expect(unlocksSecret(2, 3.2, pole)).toBe(false);
    expect(unlocksSecret(0, 2.5, pole)).toBe(false);
    expect(unlocksSecret(1, 2.5, pole)).toBe(false);
  });

  it('keeps score growth inside the server limit even for a perfect speed run', () => {
    // Most points each level could give, against the fastest possible time to reach its flag.
    const rule = RULES.platformer;
    let maxScore = 0, minSeconds = 0;
    const levels = [...MAIN_LEVELS, secretLevel('WWWWWWWWWW')];
    for (const l of levels) {
      maxScore += l.coinTotal * POINTS.coin + l.enemies.length * POINTS.stomp + l.bricks * POINTS.brick
        + POINTS.flagTop + POINTS.clear + POINTS.timeMax;
      minSeconds += (l.pole.x - l.start.x) / PHYS.runMax;
      expect(maxScore).toBeLessThanOrEqual(rule.maxPerSecond * minSeconds + rule.base);
    }
    expect(maxScore).toBeLessThan(rule.cap);
  });

  it('counts the clear tally into the score no faster than its tally rate', () => {
    const w = createWorld({ rand: () => 0.5 });
    const p = w.level.pole;
    w.hero.x = p.x - 0.1; w.hero.y = 8;
    let last = score(w), maxStep = 0;
    run(w, 6, {}, () => {
      const s = score(w);
      if (w.phase === 'tally') maxStep = Math.max(maxStep, s - last);
      last = s;
    });
    expect(maxStep).toBeLessThanOrEqual(Math.max(TALLY_RATE * DT + 1, POINTS.clear));
  });
});

describe('platformer world: enemies', () => {
  it('a walker turns at ledges and never walks off its island', () => {
    const w = worldOn([
      '.P.........n......................oo....',
      '####......######........................',
      '####......######........................',
    ]);
    const e = w.enemies[0];
    let turns = 0, dir = e.dir, minX = 99, maxX = 0;
    run(w, 12, {}, () => {
      if (e.dir !== dir) { turns++; dir = e.dir; }
      minX = Math.min(minX, e.x); maxX = Math.max(maxX, e.x + e.w);
    });
    expect(turns).toBeGreaterThanOrEqual(3);
    expect(minX).toBeGreaterThanOrEqual(10 - 0.05);
    expect(maxX).toBeLessThanOrEqual(16 + 0.05);
    expect(e.deadT).toBe(-1);
  });

  it('a walker turns at walls', () => {
    const w = worldOn([
      '.P.......#..n...#.......................',
      G40, G40,
    ]);
    const e = w.enemies[0];
    let minX = 99, maxX = 0;
    run(w, 10, {}, () => { minX = Math.min(minX, e.x); maxX = Math.max(maxX, e.x + e.w); });
    expect(minX).toBeGreaterThanOrEqual(10 - 1e-6);
    expect(maxX).toBeLessThanOrEqual(16 + 1e-6);
  });

  it('a frog hops toward the hero', () => {
    const w = worldOn([
      '.P..........f...........................',
      G40, G40,
    ]);
    const e = w.enemies[0];
    const x0 = e.x;
    let airborne = false;
    run(w, 4, {}, () => { if (!e.onGround) airborne = true; });
    expect(airborne).toBe(true);
    expect(e.x).toBeLessThan(x0 - 2);
  });

  it('a frog will not hop off a ledge', () => {
    const w = worldOn([
      '.P..............f.......................',
      '####...........###......................',
      '####...........###......................',
    ]);
    const e = w.enemies[0];
    run(w, 8);
    expect(e.deadT).toBe(-1);
    expect(e.x).toBeGreaterThan(14.5);
  });

  it('landing on an enemy from above stomps it for 50 and bounces the hero', () => {
    const w = worldOn(['.P........n.............................', G40, G40]);
    const e = w.enemies[0];
    run(w, 0.05);
    w.hero.x = e.x; w.hero.y = e.y - w.hero.h - 1.5; w.hero.vy = 0; w.hero.onGround = false;
    let stomped = false;
    run(w, 1, {}, (ww) => { if (ww.events.some(ev => ev.type === 'stomp')) stomped = true; if (stomped) return; drainEvents(ww); });
    expect(stomped).toBe(true);
    expect(w.stats.stomps).toBe(1);
    expect(score(w)).toBe(50);
    expect(w.lives).toBe(LIVES);
  });

  it('holding jump on a stomp bounces higher than not', () => {
    const peak = (hold: boolean) => {
      const w = worldOn(['.P........n.............................', G40, G40]);
      const e = w.enemies[0];
      w.hero.x = e.x; w.hero.y = e.y - w.hero.h - 0.5; w.hero.vy = 2; w.hero.onGround = false;
      let top = 99;
      run(w, 1.2, { jumpHeld: hold }, () => { top = Math.min(top, w.hero.y); });
      return 12 - top;
    };
    expect(peak(true)).toBeGreaterThan(peak(false) + 1);
  });

  it('chains stomps without touching the ground into a combo', () => {
    const w = worldOn(['.P........n......n......................', G40, G40]);
    const [a, b] = w.enemies;
    w.hero.x = a.x; w.hero.y = a.y - w.hero.h - 0.3; w.hero.vy = 3; w.hero.onGround = false;
    run(w, 0.2);
    expect(w.combo).toBe(1);
    drainEvents(w);
    w.hero.x = b.x; w.hero.y = b.y - w.hero.h - 0.3; w.hero.vy = 3;
    const combos: number[] = [];
    run(w, 0.2, {}, (ww) => { for (const ev of drainEvents(ww)) if (ev.type === 'stomp') combos.push(ev.n); });
    expect(combos).toEqual([2]);
    expect(w.stats.stomps).toBe(2);
  });

  it('touching an enemy from the side costs a life, then respawns at the start', () => {
    const w = worldOn(['.P....n.................................', G40, G40]);
    expect(runUntil(w, ww => ww.phase === 'dying', { move: 1 })).toBe(true);
    run(w, DYING_SECONDS + 0.2);
    expect(w.lives).toBe(LIVES - 1);
    expect(w.phase).toBe('play');
    expect(Math.floor(w.hero.x)).toBe(1);
    expect(w.invuln).toBeGreaterThan(0);
  });

  it('wearing the Aura Crown survives one hit, then flashes invulnerable', () => {
    const w = worldOn(['.P....n.................................', G40, G40]);
    w.crowned = true;
    run(w, 0.6, { move: 1 });
    expect(w.phase).toBe('play');
    expect(w.crowned).toBe(false);
    expect(w.lives).toBe(LIVES);
    expect(w.invuln).toBeGreaterThan(0);
    expect(eventsOf(w)).toContain('hurt');
  });
});

describe('platformer world: blocks, coins and the crown', () => {
  const UNDER = (block: string) => [
    `...${block}....................................`,
    '........................................',
    '........................................',
    '.P......................................',
    G40, G40,
  ];

  function jumpUnder(w: World) {
    w.hero.x = 3 + (1 - w.hero.w) / 2;
    run(w, 0.8, { jumpPressed: true, jumpHeld: true });
  }

  it('an aura block hit from below pops one coin, then turns dull', () => {
    const w = worldOn(UNDER('S'));
    jumpUnder(w);
    expect(w.stats.coins).toBe(1);
    expect(tileAt(w.tiles, w.level.cols, 3, 8)).toBe(TILE.USED);
    run(w, 0.5);
    jumpUnder(w);
    expect(w.stats.coins).toBe(1);
  });

  it('the crown block slides out an Aura Crown that crowns the hero', () => {
    const w = worldOn(UNDER('C'));
    jumpUnder(w);
    expect(w.crowns).toHaveLength(1);
    expect(eventsOf(w)).toContain('crown');
    const cr = w.crowns[0];
    run(w, 0.8);
    expect(cr.x).toBeGreaterThan(3.2);
    w.hero.x = cr.x; w.hero.y = cr.y;
    run(w, DT);
    expect(w.crowned).toBe(true);
    expect(eventsOf(w)).toContain('power');
  });

  it('a brick hit from below only bumps without the crown', () => {
    const w = worldOn(UNDER('B'));
    jumpUnder(w);
    expect(tileAt(w.tiles, w.level.cols, 3, 8)).toBe(TILE.BRICK);
    expect(eventsOf(w)).toContain('bump');
    expect(w.stats.bricks).toBe(0);
  });

  it('a brick hit from below while crowned breaks for 20', () => {
    const w = worldOn(UNDER('B'));
    w.crowned = true;
    jumpUnder(w);
    expect(tileAt(w.tiles, w.level.cols, 3, 8)).toBe(TILE.EMPTY);
    expect(w.stats.bricks).toBe(1);
    expect(score(w)).toBe(20);
  });

  it('bumping a block knocks out an enemy standing on it', () => {
    const w = worldOn([
      '...n....................................',
      '...B....................................',
      '........................................',
      '........................................',
      '.P......................................',
      G40, G40,
    ]);
    w.enemies[0].active = true;
    w.hero.x = 3 + (1 - w.hero.w) / 2;
    run(w, 0.6, { jumpPressed: true, jumpHeld: true });
    expect(w.stats.stomps).toBe(1);
  });

  it('collects coins on contact for 10 each', () => {
    const w = worldOn(['.P..oooo................................', G40, G40]);
    run(w, 1.5, { move: 1 });
    expect(w.stats.coins).toBe(4);
    expect(score(w)).toBe(40);
  });
});

describe('platformer world: hazards, lives and checkpoints', () => {
  it('falling into a pit loses a life', () => {
    const w = worldOn(['.P......................................', '#######.....############################', '#######.....############################']);
    let died = false;
    run(w, 3, { move: 1 }, (ww) => { if (ww.phase === 'dying') died = true; });
    expect(died).toBe(true);
    expect(w.lives).toBe(LIVES - 1);
  });

  it('respawns at the checkpoint once it has been passed', () => {
    const w = worldOn(['.P.......K..............................', '##################......################', '##################......################']);
    expect(runUntil(w, ww => ww.phase === 'dying', { move: 1 })).toBe(true);
    expect(w.checkpointHit).toBe(true);
    run(w, DYING_SECONDS + 0.5);
    expect(w.lives).toBe(LIVES - 1);
    expect(Math.floor(w.hero.x)).toBe(9);
  });

  it('spikes hurt', () => {
    const w = worldOn(['.P.....^^...............................', G40, G40]);
    let died = false;
    run(w, 2, { move: 1 }, (ww) => { if (ww.phase === 'dying') died = true; });
    expect(died).toBe(true);
  });

  it('running out of lives ends the run as lost', () => {
    const w = worldOn(['.P.....^^...............................', G40, G40]);
    for (let i = 0; i < LIVES; i++) run(w, 1 + DYING_SECONDS + 0.2, { move: 1 });
    expect(w.lives).toBe(0);
    expect(w.phase).toBe('done');
    expect(w.result).toBe('lost');
  });

  it('is invulnerable for a moment after respawning', () => {
    const w = worldOn(['.Pn.....................................', G40, G40]);
    run(w, 0.3);
    expect(w.phase).toBe('dying');
    run(w, DYING_SECONDS);
    expect(w.phase).toBe('play');
    run(w, 0.3);
    expect(w.lives).toBe(LIVES - 1);
  });
});

describe('platformer world: the flag, the tally and the next level', () => {
  it('the flag ends the level, tallies the time bonus and the clear, then loads world 2', () => {
    const w = createWorld({ rand: () => 0.5 });
    const p = w.level.pole;
    w.levelTime = 40;
    w.hero.x = p.x - 0.1; w.hero.y = 7.8;
    run(w, DT);
    expect(w.phase).toBe('pole');
    expect(w.stats.flag).toBe(500);
    expect(w.stats.flag).toBe(flagBonus(7.8, p));
    run(w, 8);
    expect(w.levelIndex).toBe(1);
    expect(w.stats.clears).toBe(1);
    expect(w.stats.time).toBe(timeBonus(40));
    expect(w.cardT).toBeGreaterThan(CARD_SECONDS - 3);
  });

  it('clearing world 3 without the pole top wins the run', () => {
    const w = createWorld({ levelIndex: 2, rand: () => 0.5 });
    const p = w.level.pole;
    w.hero.x = p.x - 0.1; w.hero.y = 7;
    run(w, 10);
    expect(w.secretUnlocked).toBe(false);
    expect(w.result).toBe('won');
  });

  it('a real running jump off the last stairs of world 3 touches the pole top and opens the secret level', () => {
    const w = createWorld({ levelIndex: 2, rand: () => 0.5, secret: { name: 'Ana', message: 'Hi' } });
    const p = w.level.pole;
    // Stand on the stairs top, a few tiles back, then run and jump from near the edge.
    const stairEdge = p.x - 3;
    w.hero.x = stairEdge - 1.9; w.hero.y = 8 - w.hero.h; w.hero.vx = 0; w.hero.onGround = true;
    w.enemies = [];
    let jumped = false;
    const f: InputFrame = { ...emptyFrame(), move: 1 };
    for (let i = 0; i < 400 && w.phase === 'play'; i++) {
      if (!jumped && w.hero.x + w.hero.w > stairEdge - 0.4) { f.jumpPressed = true; jumped = true; }
      f.jumpHeld = jumped;
      stepWorld(w, f, DT);
    }
    expect(w.phase).toBe('pole');
    expect(w.secretUnlocked).toBe(true);
    expect(w.stats.flag).toBe(2000);
    run(w, 10);
    expect(w.levelIndex).toBe(SECRET_INDEX);
    expect(w.level.theme).toBe('stars');
    expect(w.level.enemies).toHaveLength(0);
    let coins = 0;
    for (const t of w.tiles) if (t === TILE.COIN) coins++;
    expect(coins).toBeGreaterThan(20);
  });

  it('a running jump from the ground cannot reach the pole top', () => {
    const w = createWorld({ levelIndex: 2, rand: () => 0.5 });
    const p = w.level.pole;
    w.hero.x = p.x - 2.5; w.hero.y = 12 - w.hero.h; w.hero.onGround = true;
    w.enemies = [];
    run(w, 1, { move: 1, jumpHeld: true, jumpPressed: true });
    expect(w.phase === 'pole' || w.phase === 'walk' || w.phase === 'tally').toBe(true);
    expect(w.secretUnlocked).toBe(false);
  });

  it('the secret level ends on the message, then finishes the run as secret', () => {
    const w = createWorld({ levelIndex: SECRET_INDEX, rand: () => 0.5, secret: { name: 'Ana', message: 'Made for you.' } });
    expect(w.level.gravity).toBeLessThan(1);
    const p = w.level.pole;
    w.hero.x = p.x - 0.1; w.hero.y = 9;
    run(w, 2);
    expect(w.phase).toBe('finale');
    run(w, FINALE_SECONDS);
    expect(w.phase).toBe('done');
    expect(w.result).toBe('secret');
    expect(w.stats.clears).toBe(1);
  });

  it('setSecret falls back to YOU and "Made for you."', () => {
    const w = createWorld();
    setSecret(w, null);
    expect(w.secret).toEqual({ name: 'YOU', message: 'Made for you.' });
    setSecret(w, { name: ' Ana ', message: ' Hi ' });
    expect(w.secret).toEqual({ name: 'Ana', message: 'Hi' });
  });
});

describe('platformer world: platforms and camera', () => {
  it('a moving platform carries the hero standing on it', () => {
    const w = createWorld({ levelIndex: 2, rand: () => 0.5 });
    const plat = w.platforms.find(p => p.axis === 'x')!;
    w.enemies = [];
    w.hero.x = plat.x + 1; w.hero.y = plat.y - w.hero.h - 0.05; w.hero.vy = 0; w.hero.onGround = false;
    expect(runUntil(w, ww => ww.riding === plat, {}, 0.5)).toBe(true);
    const offset0 = w.hero.x - plat.x;
    run(w, 0.8);
    expect(w.riding).toBe(plat);
    expect(w.hero.x - plat.x).toBeCloseTo(offset0, 3);
    expect(w.phase).toBe('play');
  });

  it('a vertical platform lifts the hero', () => {
    const w = createWorld({ levelIndex: 2, rand: () => 0.5 });
    const plat = w.platforms.find(p => p.axis === 'y')!;
    w.enemies = [];
    w.t = 0;
    w.hero.x = plat.x + 1; w.hero.y = plat.y - w.hero.h - 0.05; w.hero.onGround = false;
    expect(runUntil(w, ww => ww.riding === plat, {}, 0.5)).toBe(true);
    const y0 = w.hero.y;
    run(w, 0.8);
    expect(w.riding).toBe(plat);
    expect(Math.abs(w.hero.y - y0)).toBeGreaterThan(1);
  });

  it('the camera stays inside the level and leads in the facing direction', () => {
    const w = createWorld({ rand: () => 0.5, viewCols: 17 });
    expect(w.cam.x).toBe(0);
    w.enemies = [];
    w.hero.x = 56; w.hero.facing = 1;
    run(w, 3);
    const right = w.cam.x;
    run(w, 0.05, { move: -1 });
    run(w, 3);
    const left = w.cam.x;
    expect(right).toBeGreaterThan(left + 2);
    w.hero.x = w.level.cols - 2;
    run(w, 4);
    expect(w.cam.x).toBeLessThanOrEqual(w.level.cols - w.viewCols + 1e-9);
  });

  it('the same inputs give the same world (deterministic)', () => {
    const a = createWorld({ rand: () => 0.3 }), b = createWorld({ rand: () => 0.3 });
    for (const w of [a, b]) { run(w, 2, { move: 1 }); run(w, 1, { move: 1, jumpHeld: true, jumpPressed: true }); }
    expect(a.hero.x).toBe(b.hero.x);
    expect(a.hero.y).toBe(b.hero.y);
    expect(a.stats).toEqual(b.stats);
  });
});

describe('stepWorld takes the input frame as a value', () => {
  const FLAT = ['.P......................................', G40, G40];

  it('a jump press in the frame starts a jump and is consumed by that step', () => {
    const w = worldOn(FLAT);
    const f: InputFrame = { ...emptyFrame(), jumpPressed: true, jumpHeld: true };
    stepWorld(w, f, DT);
    expect(f.jumpPressed).toBe(false);
    expect(w.hero.vy).toBeLessThan(0);
    expect(eventsOf(w)).toContain('jump');
  });

  it('holding jump without a fresh press does not jump again after landing', () => {
    const w = worldOn(FLAT);
    let jumps = 0;
    run(w, 2.5, { jumpPressed: true, jumpHeld: true }, (ww) => { for (const e of drainEvents(ww)) if (e.type === 'jump') jumps++; });
    expect(jumps).toBe(1);
    expect(w.hero.onGround).toBe(true);
  });

  it('move 1 runs right and move -1 runs left', () => {
    const a = worldOn(FLAT), b = worldOn(FLAT);
    b.hero.x = 20;
    run(a, 0.5, { move: 1 });
    run(b, 0.5, { move: -1 });
    expect(a.hero.vx).toBeCloseTo(PHYS.runMax, 5);
    expect(b.hero.vx).toBeCloseTo(-PHYS.runMax, 5);
    expect(b.hero.facing).toBe(-1);
  });

  it('a half move from the thumb zone runs at half the top speed', () => {
    const w = worldOn(FLAT);
    run(w, 1, { move: 0.5 });
    expect(w.hero.vx).toBeCloseTo(PHYS.runMax / 2, 5);
  });

  it('dash and action presses are consumed each step even before any rule uses them', () => {
    const w = worldOn(FLAT);
    const f: InputFrame = { ...emptyFrame(), dashPressed: true, actionPressed: true };
    stepWorld(w, f, DT);
    expect(f.dashPressed).toBe(false);
    expect(f.actionPressed).toBe(false);
  });

  it('presses while the hero is not in play (dying) do not carry into the respawn', () => {
    const w = worldOn(FLAT);
    w.hero.y = 30;
    runUntil(w, ww => ww.phase === 'dying');
    const f: InputFrame = { ...emptyFrame(), jumpPressed: true };
    stepWorld(w, f, DT);
    expect(f.jumpPressed).toBe(false);
    run(w, DYING_SECONDS + 0.1);
    expect(w.phase).toBe('play');
    expect(w.hero.vy).toBe(0);
  });
});
