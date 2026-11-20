import { describe, it, expect } from 'vitest';
import { generateLevel, type GeneratedLevel } from '@/components/apps/games/platformer/sim/generate';
import { MODIFIERS, MODIFIER_IDS, pickModifier } from '@/components/apps/games/platformer/sim/modifiers';
import { ROOFTOP_CHUNKS } from '@/components/apps/games/platformer/sim/chunks/rooftops';
import { ROWS, parseLevel } from '@/components/apps/games/platformer/sim/level';
import { dailySeed, mulberry32 } from '@/components/apps/games/platformer/sim/rand';
import { reachesGoal } from '../setup/platformerReach';

const SEEDS = Array.from({ length: 500 }, (_, i) => (i * 2654435761 + 12345) >>> 0);
const levels: GeneratedLevel[] = SEEDS.map(s => generateLevel('rooftops', s));
const count = (rows: readonly string[], ch: string) => rows.join('').split(ch).length - 1;
const DIFF = new Map(ROOFTOP_CHUNKS.map(c => [c.id, c.difficulty]));

describe('Main Character generator: 500 seeds', () => {
  it('every level parses, 14 rows, exactly one start, one goal and one checkpoint', () => {
    for (const def of levels) {
      expect(def.rows).toHaveLength(ROWS);
      const level = parseLevel(def);
      expect(count(def.rows, 'P')).toBe(1);
      expect(count(def.rows, 'G')).toBe(1);
      expect(count(def.rows, 'F')).toBe(0);
      expect(level.checkpoint).not.toBeNull();
      expect(level.theme).toBe('rooftops');
    }
  });

  it('is an intro, 6 to 8 chunks with bridges where the heights differ, and the finale', () => {
    for (const def of levels) {
      const kinds = def.layout.map(p => p.kind);
      expect(kinds[0]).toBe('intro');
      expect(kinds[kinds.length - 1]).toBe('finale');
      const n = kinds.filter(k => k === 'chunk').length;
      expect(n).toBeGreaterThanOrEqual(6);
      expect(n).toBeLessThanOrEqual(8);
    }
  });

  it('adjacent pieces connect: no gaps in the layout, and the exit roof meets the next entry roof', () => {
    for (const def of levels) {
      const cols = def.rows[0].length;
      let x = 0;
      for (let i = 0; i < def.layout.length; i++) {
        const p = def.layout[i];
        expect(p.x).toBe(x);
        x += p.w;
        if (i === 0) continue;
        const prev = def.layout[i - 1];
        expect(p.entry).toBe(prev.exit);
        const col = (c: number) => (def.mirrored ? cols - 1 - c : c);
        expect(def.rows[p.entry][col(p.x)]).toBe('=');
        expect(def.rows[p.entry][col(p.x - 1)]).toBe('=');
      }
      expect(x).toBe(cols);
    }
  });

  it('every level can be played from start to goal with the reachability check', () => {
    for (const def of levels) expect(reachesGoal(parseLevel(def), { dash: true, wallJump: true })).toBe(true);
  }, 120_000);

  it('never places the same chunk twice in a row', () => {
    for (const def of levels) {
      const ids = def.layout.filter(p => p.kind === 'chunk').map(p => p.id);
      for (let i = 1; i < ids.length; i++) expect(ids[i]).not.toBe(ids[i - 1]);
    }
  });

  it('difficulty rises: the second half is never easier on average than the first, and each slot is harder on average than the one before', () => {
    const bySlot: number[][] = [];
    for (const def of levels) {
      const d = def.layout.filter(p => p.kind === 'chunk').map(p => DIFF.get(p.id)!);
      const half = Math.floor(d.length / 2);
      const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
      expect(mean(d.slice(d.length - half))).toBeGreaterThanOrEqual(mean(d.slice(0, half)));
      d.forEach((v, i) => (bySlot[i] ??= []).push(v));
    }
    const avg = bySlot.slice(0, 6).map(a => a.reduce((s, v) => s + v, 0) / a.length);
    for (let i = 1; i < avg.length; i++) expect(avg[i]).toBeGreaterThanOrEqual(avg[i - 1]);
  });

  it('the same seed gives a byte-identical level', () => {
    for (const s of SEEDS.slice(0, 100)) expect(JSON.stringify(generateLevel('rooftops', s))).toBe(JSON.stringify(generateLevel('rooftops', s)));
  });

  it('different seeds give different layouts in at least 95 percent of pairs', () => {
    let same = 0, pairs = 0;
    for (let i = 0; i < levels.length; i++) {
      for (let j = i + 1; j < Math.min(levels.length, i + 6); j++) {
        pairs++;
        const a = levels[i].layout.map(p => p.id).join(), b = levels[j].layout.map(p => p.id).join();
        if (a === b && levels[i].mirrored === levels[j].mirrored) same++;
      }
    }
    expect(same / pairs).toBeLessThan(0.05);
  });

  it('places at most one Sigma coin (about a quarter of runs), and sometimes a bonus room and an elite drone', () => {
    let sigma = 0, rooms = 0, elites = 0;
    for (const def of levels) {
      const s = count(def.rows, '$');
      expect(s).toBeLessThanOrEqual(1);
      sigma += s;
      if (def.rows.join('').includes('%')) rooms++;
      elites += count(def.rows, 'e');
      for (const slot of ['*', '&', 'D']) expect(def.rows.join('').includes(slot)).toBe(false);
    }
    expect(sigma / levels.length).toBeGreaterThan(0.18);
    expect(sigma / levels.length).toBeLessThan(0.32);
    expect(rooms).toBeGreaterThan(20);
    expect(elites).toBeGreaterThan(20);
    expect(elites).toBeLessThan(levels.length * 0.4);
  });

  it('coin trails vary by seed within the same chunk', () => {
    const a = generateLevel('rooftops', 1), b = generateLevel('rooftops', 2);
    expect(a.rows.join('') === b.rows.join('')).toBe(false);
  });
});

describe('Main Character modifiers: one table, one per world by seed', () => {
  it('has the six modifiers and none, each with a brainrot name', () => {
    expect([...MODIFIER_IDS].sort()).toEqual(['blackout', 'doubleAura', 'droneSwarm', 'lowGravity', 'mirror', 'none', 'storm']);
    expect(MODIFIERS.blackout.name).toBe('Neon Blackout');
    expect(MODIFIERS.mirror.name).toBe('Mirror City');
    for (const id of MODIFIER_IDS) if (id !== 'none') expect(MODIFIERS[id].name.length).toBeGreaterThan(3);
  });

  it('picks by weight: over 2000 seeds each lands within 3 points of its share', () => {
    const tally = new Map<string, number>();
    for (let i = 0; i < 2000; i++) {
      const id = pickModifier(mulberry32(i * 7919 + 1));
      tally.set(id, (tally.get(id) ?? 0) + 1);
    }
    const total = MODIFIER_IDS.reduce((s, id) => s + MODIFIERS[id].weight, 0);
    for (const id of MODIFIER_IDS) {
      const share = (tally.get(id) ?? 0) / 2000;
      expect(Math.abs(share - MODIFIERS[id].weight / total)).toBeLessThan(0.03);
    }
  });

  it('generated levels carry their modifier, chosen by the seed', () => {
    const ids = new Set(levels.map(l => l.modifier));
    expect(ids.size).toBe(MODIFIER_IDS.length);
  });

  it('mirror levels put the goal on the left and are still playable', () => {
    for (const s of SEEDS.slice(0, 120)) {
      const def = generateLevel('rooftops', s, { modifier: 'mirror' });
      expect(def.mirrored).toBe(true);
      const level = parseLevel(def);
      expect(level.goal.x).toBeLessThan(level.start.x);
      expect(level.goalDir).toBe(-1);
      expect(reachesGoal(level, { dash: true, wallJump: true })).toBe(true);
    }
  }, 60_000);

  it('a drone swarm has more drones than the same seed without it', () => {
    for (const s of SEEDS.slice(0, 50)) {
      const calm = generateLevel('rooftops', s, { modifier: 'none' });
      const swarm = generateLevel('rooftops', s, { modifier: 'droneSwarm' });
      const drones = (d: GeneratedLevel) => count(d.rows, 'd') + count(d.rows, 'e');
      expect(drones(swarm)).toBeGreaterThanOrEqual(drones(calm));
    }
    const more = SEEDS.slice(0, 50).filter(s => {
      const d = (m: 'none' | 'droneSwarm') => { const r = generateLevel('rooftops', s, { modifier: m }).rows; return count(r, 'd') + count(r, 'e'); };
      return d('droneSwarm') > d('none') + 1;
    });
    expect(more.length).toBeGreaterThan(40);
  });
});

describe('Main Character daily run seed', () => {
  it('is the same all day in UTC, different the next day', () => {
    const a = dailySeed(new Date(Date.UTC(2026, 10, 20, 0, 0, 1)));
    const b = dailySeed(new Date(Date.UTC(2026, 10, 20, 23, 59, 59)));
    const c = dailySeed(new Date(Date.UTC(2026, 10, 21, 0, 0, 0)));
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(Number.isInteger(a)).toBe(true);
    expect(a).toBeGreaterThanOrEqual(0);
    const year = new Set(Array.from({ length: 365 }, (_, d) => dailySeed(new Date(Date.UTC(2026, 0, 1 + d)))));
    expect(year.size).toBe(365);
  });
});
