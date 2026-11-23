import { describe, it, expect } from 'vitest';
import { LEVELS } from '@/components/apps/games/platformer/sim/levels';
import {
  MAIN_LEVELS, ROWS, SECRET_GRAVITY, TILE, isSolidTile, parseLevel, secretLevel, secretLevelDef, secretName, tileAt,
} from '@/components/apps/games/platformer/sim/level';
import { FONT, MAX_NAME, textCells } from '@/components/apps/games/platformer/sim/font';

const count = (rows: readonly string[], ch: string) => rows.join('').split(ch).length - 1;

describe('platformer levels: data', () => {
  it('has three worlds: generated rooftops, then the hand-made cave and sky', () => {
    expect(MAIN_LEVELS.map(l => l.theme)).toEqual(['rooftops', 'cave', 'sky']);
    expect(LEVELS.map(l => l.theme)).toEqual(['cave', 'sky']);
  });

  for (const def of LEVELS) {
    describe(`${def.label}: ${def.name}`, () => {
      const level = parseLevel(def);

      it('parses, is 14 rows tall and 150 to 220 columns wide with consistent rows', () => {
        expect(def.rows).toHaveLength(ROWS);
        const w = def.rows[0].length;
        expect(w).toBeGreaterThanOrEqual(150);
        expect(w).toBeLessThanOrEqual(220);
        for (const r of def.rows) expect(r).toHaveLength(w);
        expect(level.cols).toBe(w);
      });

      it('has exactly one start, one flag and one checkpoint', () => {
        expect(count(def.rows, 'P')).toBe(1);
        expect(count(def.rows, 'F')).toBe(1);
        expect(count(def.rows, 'K')).toBe(1);
        expect(level.checkpoint).not.toBeNull();
      });

      it('starts the hero standing on solid ground with open space above', () => {
        const { x, y } = level.start;
        expect(isSolidTile(tileAt(level.tiles, level.cols, x, y))).toBe(true);
        expect(isSolidTile(tileAt(level.tiles, level.cols, x, y - 1))).toBe(false);
        expect(isSolidTile(tileAt(level.tiles, level.cols, x, y - 2))).toBe(false);
      });

      it('puts the checkpoint on ground, between the start and the flag', () => {
        const cp = level.checkpoint!;
        expect(isSolidTile(tileAt(level.tiles, level.cols, cp.x, cp.y))).toBe(true);
        expect(cp.x).toBeGreaterThan(level.start.x + 20);
        expect(cp.x).toBeLessThan(level.pole.x - 20);
      });

      it('has a full flagpole standing on ground, with room for the bakery after it', () => {
        const p = level.pole;
        expect(p.top).toBe(2);
        for (let y = p.top + 1; y <= p.base; y++) expect(def.rows[y][p.x]).toBe('|');
        expect(isSolidTile(tileAt(level.tiles, level.cols, p.x, p.base + 1))).toBe(true);
        for (let x = p.x; x <= p.x + 9; x++) expect(isSolidTile(tileAt(level.tiles, level.cols, x, p.base + 1))).toBe(true);
        expect(level.cols - p.x).toBeGreaterThanOrEqual(12);
      });

      it('has stairs just before the pole whose top is 8 rows down (the pole top is in reach)', () => {
        const p = level.pole;
        const stairTop = p.x - 4;
        expect(tileAt(level.tiles, level.cols, stairTop, 8)).toBe(TILE.STONE);
        expect(isSolidTile(tileAt(level.tiles, level.cols, stairTop, 7))).toBe(false);
      });

      it('holds exactly one Aura Crown block', () => {
        expect(count(def.rows, 'C')).toBe(1);
      });

      it('stands every enemy on solid ground', () => {
        expect(level.enemies.length).toBeGreaterThan(3);
        for (const e of level.enemies) {
          expect(isSolidTile(tileAt(level.tiles, level.cols, e.x, e.y + 1))).toBe(true);
          expect(isSolidTile(tileAt(level.tiles, level.cols, e.x, e.y))).toBe(false);
        }
      });

      it('has plenty of coins', () => {
        expect(level.coinTotal).toBeGreaterThan(25);
      });
    });
  }

  it('world 1 has rooftop enemies only; frogs appear from the cave on', () => {
    const rooftop = new Set(['doomCrawler', 'adDrone', 'eliteDrone']);
    expect(MAIN_LEVELS[0].enemies.every(e => rooftop.has(e.kind))).toBe(true);
    expect(MAIN_LEVELS[1].enemies.some(e => e.kind === 'frog')).toBe(true);
    expect(MAIN_LEVELS[2].enemies.some(e => e.kind === 'frog')).toBe(true);
  });

  it('the cave has spikes, world 1 has no moving platforms, the sky has moving platforms of both kinds', () => {
    expect(count(LEVELS[0].rows, '^')).toBeGreaterThan(5);
    expect(MAIN_LEVELS[0].platforms).toHaveLength(0);
    const axes = new Set(MAIN_LEVELS[2].platforms.map(p => p.axis));
    expect(axes).toEqual(new Set(['x', 'y']));
  });

  it('records each moving platform run once with its width', () => {
    for (const p of MAIN_LEVELS[2].platforms) expect(p.w).toBe(3);
  });

  it('rejects broken level data', () => {
    const base = LEVELS[0];
    expect(() => parseLevel({ ...base, rows: base.rows.slice(1) })).toThrow(/rows/);
    expect(() => parseLevel({ ...base, rows: base.rows.map((r, i) => (i === 3 ? r + '.' : r)) })).toThrow(/wide/);
    expect(() => parseLevel({ ...base, rows: base.rows.map(r => r.replace('P', '.')) })).toThrow(/start/);
    expect(() => parseLevel({ ...base, rows: base.rows.map(r => r.replace('F', '|')) })).toThrow(/flag/);
    expect(() => parseLevel({ ...base, rows: base.rows.map((r, i) => (i === 0 ? '@' + r.slice(1) : r)) })).toThrow(/unknown/);
  });
});

describe('platformer levels: the secret level', () => {
  it('spells the name in coins, one coin per font pixel', () => {
    const level = secretLevel('Ana');
    let coins = 0;
    for (const t of level.tiles) if (t === TILE.COIN) coins++;
    expect(coins).toBe(textCells('ANA', 0, 0).length);
    expect(level.coinTotal).toBe(coins);
  });

  it('lays the letters exactly as the font draws them', () => {
    const def = secretLevelDef('HI');
    const cells = textCells('HI', 16, 4);
    for (const c of cells) expect(def.rows[c.y][c.x]).toBe('o');
    expect(count(def.rows, 'o')).toBe(cells.length);
  });

  it('is calm: no enemies, no pits, no spikes, low gravity, with a checkpoint and a flag', () => {
    const level = secretLevel('Maya');
    expect(level.enemies).toHaveLength(0);
    expect(level.platforms).toHaveLength(0);
    expect(level.gravity).toBe(SECRET_GRAVITY);
    expect(level.gravity).toBeLessThan(1);
    expect(level.checkpoint).not.toBeNull();
    expect(level.theme).toBe('stars');
    for (let x = 0; x < level.cols; x++) expect(tileAt(level.tiles, level.cols, x, 12)).toBe(TILE.GROUND);
    expect(count(secretLevelDef('Maya').rows, '^')).toBe(0);
  });

  it('fits any name up to 10 letters, and the flag comes after it', () => {
    const long = 'WWWWWWWWWWWW';
    const level = secretLevel(long);
    expect(secretName(long)).toHaveLength(MAX_NAME);
    const cells = textCells(secretName(long), 16, 4);
    const last = Math.max(...cells.map(c => c.x));
    expect(level.pole.x).toBeGreaterThan(last + 5);
    expect(level.cols).toBeLessThanOrEqual(220);
  });

  it('falls back to YOU for an empty or unusable name', () => {
    expect(secretName('')).toBe('YOU');
    expect(secretName(null)).toBe('YOU');
    expect(secretName('123 !!')).toBe('YOU');
    expect(secretName('zoë')).toBe('ZOE');
  });

  it('keeps the name coins within jump reach under low gravity (rows 4 to 8)', () => {
    const cells = textCells('A', 16, 4);
    expect(Math.min(...cells.map(c => c.y))).toBe(4);
    expect(Math.max(...cells.map(c => c.y))).toBe(8);
    expect(Object.keys(FONT)).toContain(' ');
  });
});
