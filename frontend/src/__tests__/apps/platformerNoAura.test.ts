import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';
import { createWorld } from '@/components/apps/games/platformer/sim/world';
import { ROOFTOP_CHUNKS } from '@/components/apps/games/platformer/sim/chunks/rooftops';
import { generateLevel } from '@/components/apps/games/platformer/sim/generate';

const SIM = path.resolve(__dirname, '../../components/apps/games/platformer/sim');

function files(dir: string): string[] {
  return readdirSync(dir).flatMap(f => {
    const p = path.join(dir, f);
    return statSync(p).isDirectory() ? files(p) : p.endsWith('.ts') ? [p] : [];
  });
}

describe('Main Character: the old Aura Mode system is gone', () => {
  it('no sim code names Aura Mode, its orb, or its effects', () => {
    const banned = [/Aura Mode/, /AURA MODE/, /auraOrb/i, /grantPower/, /stepPowers/, /fleeRadius/, /killsOnTouch/, /blocksDamage/,
      /Sky Boots/, /Rizz Magnet/, /Spark Shot/, /Ground Pound/, /'aura'/];
    for (const f of files(SIM)) {
      const src = readFileSync(f, 'utf8');
      for (const re of banned) expect(re.test(src), `${path.relative(SIM, f)} matches ${re}`).toBe(false);
    }
  });

  it('a new world has no running power, and Endless places none', () => {
    expect(createWorld({ seed: 5 }).power).toBeNull();
    for (const c of ROOFTOP_CHUNKS) expect(c.rows.join('')).not.toMatch(/[awt]/);
    for (let s = 1; s <= 50; s++) expect(generateLevel('rooftops', s).rows.join('')).not.toMatch(/[awt]/);
  });
});
