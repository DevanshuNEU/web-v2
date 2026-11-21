// The "earthquake" loop: hold right through a story level, render frames at a
// phone's 60 Hz (with a little timestamp jitter) and at a Mac's
// 120 Hz, and measure how evenly the world and the hero move on screen, in
// device pixels. A smooth run moves the same distance every frame; shake is
// the frame to frame unevenness (the second difference of position).

import { describe, it, expect } from 'vitest';
import { createWorld, stepWorld } from '@/components/apps/games/platformer/sim/world';
import { FIXED_DT } from '@/components/apps/games/shared/useGameLoop';
import { placeFrame, screenPlacement, subPixels, type Placement, type ScreenPlacement } from '@/components/apps/games/platformer/render/pixel/camera';

const RIGHT = { move: 1, jumpHeld: false, jumpPressed: false, dashPressed: false, actionPressed: false };

interface Track { worldX: number[]; heroX: number[]; worldY: number[]; heroY: number[] }

/** Run `seconds` holding right, rendering at `hz` with +-`jitterMs` on each frame time; k device px per art px. */
function run(levelId: string, hz: number, jitterMs: number, k: number, seconds = 4, q = subPixels(k)): Track {
  const w = createWorld({ mode: 'story', levelId, abilities: { blade: true } });
  while (w.phase !== 'play') stepWorld(w, RIGHT, FIXED_DT);
  // get up to speed first
  for (let i = 0; i < 120; i++) stepWorld(w, RIGHT, FIXED_DT);
  const pl: Placement = { hx: 0, hy: 0, camX: 0, camY: 0, anchorX: 0, anchorY: 0, rx: 0, ry: 0 };
  const sp: ScreenPlacement = { worldX: 0, worldY: 0, heroX: 0, heroY: 0 };
  const out: Track = { worldX: [], heroX: [], worldY: [], heroY: [] };
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  let acc = 0, now = 0, last = 0;
  const frames = Math.round(seconds * hz);
  for (let f = 0; f < frames; f++) {
    now += 1000 / hz;
    const t = now + (rnd() * 2 - 1) * jitterMs;
    acc += Math.min(0.1, (t - last) / 1000);
    last = t;
    while (acc >= FIXED_DT) { stepWorld(w, RIGHT, FIXED_DT); acc -= FIXED_DT; }
    placeFrame(w, acc / FIXED_DT, pl, q);
    screenPlacement(pl, k, sp, q);
    out.worldX.push(sp.worldX); out.heroX.push(sp.heroX); out.worldY.push(sp.worldY); out.heroY.push(sp.heroY);
  }
  return out;
}

/** 95th percentile of |x[i+1] - 2 x[i] + x[i-1]|, in device pixels. */
function shake(xs: number[]): number {
  const d: number[] = [];
  for (let i = 1; i < xs.length - 1; i++) d.push(Math.abs(xs[i + 1] - 2 * xs[i] + xs[i - 1]));
  d.sort((a, b) => a - b);
  return d[Math.floor(d.length * 0.95)];
}

const report = (t: Track) => ({ world: shake(t.worldX), hero: shake(t.heroX), worldY: shake(t.worldY), heroY: shake(t.heroY) });

describe('moving on a phone does not shake', () => {
  // an iPhone in portrait: k = 6 device px per art px at 60 Hz; a Mac: k = 4 at 120 Hz
  it('the old whole-art-pixel camera (q = 1) shakes by a full art pixel: the bug this guards', () => {
    expect(report(run('1-1', 60, 0.5, 6, 4, 1)).world).toBeGreaterThanOrEqual(6);
  });

  for (const id of ['1-1', '2-1']) {
    it(`${id}: the world and the hero move evenly at 60 Hz with jitter (within 2 device px a frame)`, () => {
      const phone = report(run(id, 60, 0.5, 6));
      const mac = report(run(id, 120, 0.5, 4));
      expect(phone.world).toBeLessThanOrEqual(2);
      expect(phone.hero).toBeLessThanOrEqual(2);
      expect(phone.worldY).toBeLessThanOrEqual(2);
      expect(phone.heroY).toBeLessThanOrEqual(2);
      expect(mac.world).toBeLessThanOrEqual(2);
      expect(mac.hero).toBeLessThanOrEqual(2);
    });
  }
});
