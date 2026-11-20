/**
 * Hero state (contract section D) to a sprite animation and frame. Frame
 * timing comes from `animT`, seconds in the current state, so a state change
 * always starts its animation from the first frame.
 */

import { HERO, type HeroAnim } from '../sprites';
import type { HeroPose } from './read';

export type { HeroPose } from './read';

export interface AnimPick { anim: HeroAnim | string; frame: number; facing: 1 | -1 }

/** Seconds after landing that show the squash frame. */
export const LAND_SHOW = 0.08;
/** Vertical speed (tiles/s) under which an airborne hero shows the apex frame. */
const APEX_V = 2.5;
const RUN_V = 0.6;

function frameAt(anim: HeroAnim, t: number): number {
  const a = HERO.anims[anim];
  const n = a.frames.length;
  if (n <= 1 || a.fps <= 0) return 0;
  const i = Math.floor(Math.max(0, t) * a.fps + 1e-6);
  return a.loop ? i % n : Math.min(n - 1, i);
}

function set(out: AnimPick, anim: HeroAnim, t: number, facing: 1 | -1): AnimPick {
  out.anim = anim;
  out.frame = frameAt(anim, t);
  out.facing = facing;
  return out;
}

export function pickHeroAnim(out: AnimPick, p: HeroPose): AnimPick {
  const f = p.facing;
  switch (p.state) {
    case 'ground':
      if (p.landT >= 0 && p.landT < LAND_SHOW) return set(out, 'land', 0, f);
      return set(out, Math.abs(p.vx) > RUN_V ? 'run' : 'idle', p.animT, f);
    case 'air':
      if (p.vy < -APEX_V) return set(out, 'rise', 0, f);
      if (p.vy <= APEX_V) return set(out, 'apex', 0, f);
      return set(out, 'fall', p.animT, f);
    case 'wallSlide':
      // Drawn pressed to a wall on his right; a wall on the left mirrors it.
      return set(out, 'wallSlide', p.animT, p.wallDir === -1 ? -1 : p.wallDir === 1 ? 1 : f);
    case 'dash': return set(out, 'dash', p.animT, f);
    case 'pound': return set(out, 'pound', p.animT, f);
    case 'hurt': case 'dead': return set(out, 'hurt', 0, f);
    case 'victory': return set(out, 'victory', p.animT, f);
    // The blade: each attack plays its own frames once.
    case 'attack1': case 'attack2': case 'attack3': case 'airSlash': case 'downStrike':
      return set(out, p.state as HeroAnim, p.animT, f);
    // The up swing borrows the air slash pose until it has frames of its own.
    case 'upSlash': return set(out, 'airSlash', p.animT, f);
    default: return set(out, 'idle', p.animT, f);
  }
}
