import { describe, it, expect } from 'vitest';
import { AUSTIN, type AustinId } from '@/components/apps/games/platformer/sim/story/austin';
import { STORY, nextStoryId, storyEntry } from '@/components/apps/games/platformer/sim/story';
import { ROWS, isSolidTile, parseLevel, tileAt, type Level } from '@/components/apps/games/platformer/sim/level';
import { createWorld, score, stepWorld, type World } from '@/components/apps/games/platformer/sim/world';
import { emptyFrame, type InputFrame } from '@/components/apps/games/platformer/input/frame';
import { mulberry32 } from '@/components/apps/games/platformer/sim/rand';
import { reach } from '../setup/platformerReach';
import { DT } from '../setup/platformerWorld';

const IDS: AustinId[] = ['1-1', '1-2', '1-3'];
const level = (id: AustinId) => parseLevel(AUSTIN[id]);
/** Run, jump and the double jump: everything chapter 1 teaches. No dash, no wall jump, no power, no blade. */
const CH1 = { dash: false, wallJump: false, doubleJump: true } as const;
const memBoxes = (l: Level) => l.memories.map(m => ({ x: m.x + 0.1, y: m.y + 0.1, w: 0.8, h: 0.8 }));
const count = (l: Level, ch: string, id: AustinId) => AUSTIN[id].rows.join('').split(ch).length - 1 + 0 * l.cols;

describe('Story: the running order', () => {
  it('chapters 1 to 3 are built; Boston nights with the gorilla, Jamaica Plain, the concert and the season boss are placeholders', () => {
    expect(STORY.filter(s => s.built).map(s => s.id)).toEqual(['1-1', '1-2', '1-3', '2-1', '2-2', '3-1', '3-2', '3-3']);
    expect(STORY.map(s => s.id)).toEqual(['1-1', '1-2', '1-3', '2-1', '2-2', '3-1', '3-2', '3-3', '4-1', '4-2', '4-3', '4-4', '4-boss', '5-1', '5-2', '6-1', 'season-boss']);
    for (const id of IDS) {
      const e = storyEntry(id);
      expect(e.theme).toBe('austin');
      expect(e.world).toBe(1);
      expect(e.cardId).toBe(`card-${id}`);
    }
    expect(nextStoryId('1-1')).toBe('1-2');
    expect(nextStoryId('1-3')).toBe('2-1');
    expect(nextStoryId('season-boss')).toBeNull();
  });

  it('createWorld loads a story level by id: Austin, no modifier, no unlocks, no lives to lose', () => {
    const w = createWorld({ mode: 'story', levelId: '1-2' });
    expect(w.levelId).toBe('1-2');
    expect(w.level.theme).toBe('austin');
    expect(w.level.name).toBe('Sixth Street');
    expect(w.modifier.id).toBe('none');
    expect(w.abilities).toEqual({ wallJump: false, dash: false, blade: false });
    expect(w.memories.map(m => m.id)).toEqual(['1-2-a', '1-2-b', '1-2-c']);
  });
});

describe('Story: chapter 1 levels, the shared rules', () => {
  for (const id of IDS) {
    describe(id, () => {
      const l = level(id);
      it('is 14 rows and 180 to 260 columns, with a goal beacon', () => {
        expect(AUSTIN[id].rows).toHaveLength(ROWS);
        expect(l.cols).toBeGreaterThanOrEqual(180);
        expect(l.cols).toBeLessThanOrEqual(260);
        expect(l.goal.kind).toBe('beacon');
      });

      it('has three memories and checkpoints at the thirds (quarters in 1-3)', () => {
        expect(l.memories).toHaveLength(3);
        const n = id === '1-3' ? 3 : 2;
        expect(l.checkpoints).toHaveLength(n);
        const span = l.goal.x - l.start.x;
        l.checkpoints.forEach((c, i) => {
          const ideal = l.start.x + (span * (i + 1)) / (n + 1);
          expect(Math.abs(c.x - ideal)).toBeLessThan(span * 0.12);
        });
      });

      it('can be finished, and every memory found, with run, jump, the double jump and stomps: no power, no blade', () => {
        const r = reach(l, { ...CH1, bounces: true, targets: memBoxes(l) });
        expect(r.reached).toBe(true);
        expect(r.touched).toEqual([true, true, true]);
      }, 30_000);
    });
  }
});

describe('Story 1-1: First Steps on Congress', () => {
  const l = level('1-1');

  it('has no enemies, spikes, powers, sword or crates', () => {
    expect(l.enemies).toHaveLength(0);
    expect(count(l, '^', '1-1')).toBe(0);
    expect(l.pickups).toHaveLength(0);
    expect(l.sword).toBeNull();
    expect(l.crates).toBe(0);
  });

  it('no fall kills: a roof runs under every column', () => {
    for (let x = 0; x < l.cols; x++) expect(isSolidTile(tileAt(l.tiles, l.cols, x, 13))).toBe(true);
  });

  it('every fall has a way back up: from anywhere she can stand, the goal is still reachable', () => {
    const r = reach(l, { ...CH1, graph: true });
    const g = r.graph!;
    const back = new Map<number, number[]>();
    for (const [a, b] of g.edges) (back.get(b) ?? back.set(b, []).get(b)!).push(a);
    const ok = new Set(g.goal);
    const queue = [...g.goal];
    while (queue.length) { const n = queue.pop()!; for (const p of back.get(n) ?? []) if (!ok.has(p)) { ok.add(p); queue.push(p); } }
    const stuck = g.nodes.filter(n => !ok.has(n)).map(g.cell);
    expect(stuck).toEqual([]);
  }, 30_000);

  it('nothing needs the double jump before the prompt; the prompt sits on the first gap that does', () => {
    const prompt = l.setPieces.find(p => p.kind === 'prompt')!;
    expect(prompt.id).toBe('doubleJump');
    const single = reach(l, { dash: false, wallJump: false, doubleJump: false });
    expect(single.maxX).toBeGreaterThanOrEqual(prompt.x0);
    expect(single.maxX).toBeLessThan(prompt.x1);
    expect(single.reached).toBe(false);
  });

  it('memory a is on the path, b needs the double jump, c is up the hidden route behind the water tower', () => {
    const [a, b, c] = l.memories;
    const single = reach(l, { dash: false, wallJump: false, doubleJump: false, generous: true, targets: memBoxes(l) });
    expect(single.touched[0]).toBe(true);
    expect(single.touched[1]).toBe(false);
    expect(a.x).toBeLessThan(b.x);
    const tower = l.decor.find(d => d.kind === 'waterTower' && Math.abs(d.x - c.x) <= 4);
    expect(tower).toBeDefined();
  });
});

describe('Story 1-2: Sixth Street', () => {
  const l = level('1-2');
  const first = (k: string) => l.enemies.filter(e => e.kind === k).sort((p, q) => p.x - q.x)[0];

  it('starts with the sword', () => {
    expect(l.sword).not.toBeNull();
    expect(l.sword!.x - l.start.x).toBeLessThan(12);
  });

  it('meets the enemies one at a time: a crawler in a pit first, then a lone drone, then both', () => {
    const crawler = first('doomCrawler'), drone = first('adDrone');
    expect(crawler.x).toBeLessThan(drone.x);
    expect(l.enemies.filter(e => e.x < drone.x)).toHaveLength(1);
    // The crawler walks below the roof you watch it from.
    const overlookTop = [...Array(crawler.x).keys()].reverse().map(x => [...Array(ROWS).keys()].find(y => isSolidTile(tileAt(l.tiles, l.cols, x, y)))!)
      .find(y => y !== undefined && y < crawler.y - 2);
    expect(overlookTop).toBeDefined();
    // Before the drone, a roof above it from where it can be watched without being dived at.
    const safe = reach(l, CH1).stands.filter(s => s.x < drone.x && drone.x - s.x <= 15 && s.y + 1 <= drone.y);
    expect(safe.length).toBeGreaterThan(0);
  });

  it('Taco Rush comes after the first stomp; Bat Wings right before the last wide gap', () => {
    const taco = l.pickups.find(p => p.kind === 'tacoRush')!, wings = l.pickups.find(p => p.kind === 'batWings')!;
    expect(taco.x).toBeGreaterThan(first('doomCrawler').x);
    expect(taco.x).toBeLessThan(first('adDrone').x);
    let widest = 0, at = 0;
    for (let x = wings.x; x < l.goal.x; x++) {
      let n = 0;
      while ([...Array(ROWS).keys()].every(y => !isSolidTile(tileAt(l.tiles, l.cols, x + n, y)))) n++;
      if (n > widest) { widest = n; at = x; }
      x += n;
    }
    expect(widest).toBeGreaterThanOrEqual(8);
    expect(at - wings.x).toBeLessThan(15);
  });

  it('memory a follows the first stomp; c is reached only along a chain of drone stomps', () => {
    expect(l.memories[0].x).toBeGreaterThan(first('doomCrawler').x);
    const noBounce = reach(l, { ...CH1, generous: true, targets: memBoxes(l) });
    expect(noBounce.touched[2]).toBe(false);
    const bounce = reach(l, { ...CH1, bounces: true, targets: memBoxes(l) });
    expect(bounce.touched[2]).toBe(true);
  }, 30_000);
});

describe('Story 1-3: Bat Bridge', () => {
  const l = level('1-3');
  const still = { ...AUSTIN['1-3'], rows: AUSTIN['1-3'].rows.map(r => r.replace(/-/g, '.')) };

  it('adds moving platforms the level needs, and memory a sits on a platform detour', () => {
    expect(l.platforms.filter(p => p.axis === 'x').length).toBeGreaterThanOrEqual(2);
    const without = reach(parseLevel(still), { ...CH1, generous: true, targets: memBoxes(l) });
    expect(without.reached).toBe(false);
    expect(without.touched[0]).toBe(false);
  });

  it('marks the bridge for the bat swarm near the end, with Bat Wings offered just before it', () => {
    const bats = l.setPieces.find(p => p.kind === 'bats')!;
    expect(bats.x0).toBeGreaterThan(l.cols / 2);
    expect(l.goal.x - bats.x1).toBeLessThan(30);
    const wings = l.pickups.find(p => p.kind === 'batWings')!;
    expect(wings.x).toBeLessThan(bats.x0);
    expect(bats.x0 - wings.x).toBeLessThan(15);
  });

  it('memory b is under the bridge deck; c ends the harder route over it', () => {
    const bats = l.setPieces.find(p => p.kind === 'bats')!;
    const [, b, c] = l.memories;
    expect(b.x).toBeGreaterThan(bats.x0);
    const deckAbove = [...Array(b.y).keys()].some(y => isSolidTile(tileAt(l.tiles, l.cols, b.x, y)));
    expect(deckAbove).toBe(true);
    expect(c.x).toBeGreaterThan(b.x);
    expect(c.y).toBeLessThan(4);
  });
});

describe('Story: replays', () => {
  it('a story level with the same recorded input ends the same', () => {
    const r = mulberry32(5);
    const frames: InputFrame[] = Array.from({ length: Math.round(15 / DT) }, () => ({
      ...emptyFrame(), move: r() < 0.85 ? 1 : 0, jumpHeld: r() < 0.6, jumpPressed: r() < 0.04, actionPressed: r() < 0.02,
    }));
    const play = () => { const w: World = createWorld({ mode: 'story', levelId: '1-2', seed: 9 }); for (const f of frames) stepWorld(w, { ...f }, DT); return w; };
    const a = play(), b = play();
    expect([a.hero.x, a.hero.y, score(a), a.stats.deaths, a.enemies.map(e => [e.x, e.y, e.hp])]).toEqual([b.hero.x, b.hero.y, score(b), b.stats.deaths, b.enemies.map(e => [e.x, e.y, e.hp])]);
  });
});

describe('Story 1-2: the drone shows its dive first', () => {
  it('from the safe high roof she watches it dive at the decoy within 3 s, untouched; down on its roof it comes for her', () => {
    const w = createWorld({ mode: 'story', levelId: '1-2' });
    const drone = w.enemies.filter(e => e.kind === 'adDrone').sort((p, q) => p.x - q.x)[0];
    expect(w.decoys.length).toBe(1);
    // Stand on the safe high roof before the drone.
    const safe = reach(level('1-2'), CH1).stands.filter(s => s.x < drone.x && drone.x - s.x <= 15 && s.y + 1 <= drone.y)
      .sort((p, q) => q.x - p.x)[0];
    const place = () => { w.hero.x = safe.x + 0.16; w.hero.y = safe.y + 1 - w.hero.h; w.hero.vx = 0; w.hero.vy = 0; w.hero.onGround = true; };
    place();
    let decoyAt = -1, touched = false, t = 0;
    for (let i = 0; i < Math.round(3 / DT); i++) {
      stepWorld(w, emptyFrame(), DT); t += DT; place();
      for (const ev of w.events.splice(0)) if (ev.type === 'decoyDive' && decoyAt < 0) decoyAt = t;
      const h = w.hero;
      if (drone.x < h.x + h.w && drone.x + drone.w > h.x && drone.y < h.y + h.h && drone.y + drone.h > h.y) touched = true;
    }
    expect(decoyAt).toBeGreaterThan(0);
    expect(decoyAt).toBeLessThan(3);
    expect(touched).toBe(false);
    expect(w.phase).toBe('play');
    // Down on the drone's roof, below it: it dives at her.
    for (let i = 0; i < 400 && drone.mode !== 'hover'; i++) stepWorld(w, emptyFrame(), DT);
    w.invuln = 99;
    w.hero.x = drone.x - 1; w.hero.y = w.decoys[0].y + 1 - w.hero.h; w.hero.onGround = true;
    for (let i = 0; i < 360 && !(drone.mode === 'dive' && !drone.decoy); i++) stepWorld(w, emptyFrame(), DT);
    expect(drone.mode).toBe('dive');
    expect(drone.decoy).toBe(false);
  });
});
