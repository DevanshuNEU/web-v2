// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { stubCanvas } from '../setup/canvas';
import { SKY_IDS, SKY_PRESETS, luma, skyOf } from '@/components/apps/games/platformer/render/pixel/timeofday';
import { drawFrame } from '@/components/apps/games/platformer/render/frame';
import { frameStats, resetWorld1 } from '@/components/apps/games/platformer/render/pixel/world1';
import { createWorld, type World } from '@/components/apps/games/platformer/sim/world';
import { Juice } from '@/components/apps/games/shared/juice';

beforeEach(() => { stubCanvas(); resetWorld1(); });

describe('time of day', () => {
  it('a level picks its preset by `sky`; night by default and for anything unknown', () => {
    expect(skyOf({}).id).toBe('night');
    expect(skyOf({ sky: 'sunrise' }).id).toBe('sunrise');
    expect(skyOf({ sky: 'teatime' }).id).toBe('night');
  });

  it('the darkness lifts through the day and the lights matter less', () => {
    const order = ['lateNight', 'night', 'preDawn', 'sunrise', 'morning'] as const;
    for (let i = 1; i < order.length; i++) {
      expect(luma(SKY_PRESETS[order[i]].ambient)).toBeGreaterThanOrEqual(luma(SKY_PRESETS[order[i - 1]].ambient));
      expect(SKY_PRESETS[order[i]].lightK).toBeLessThanOrEqual(SKY_PRESETS[order[i - 1]].lightK);
    }
    expect(SKY_PRESETS.lateNight.fog).toBeGreaterThan(SKY_PRESETS.night.fog);
    expect(SKY_PRESETS.sunrise.disc).toBe('sun');
  });

  it('every preset draws a rooftop frame, and the frame reports the preset in use', () => {
    for (const id of SKY_IDS) {
      resetWorld1();
      const w = createWorld();
      w.level = { ...w.level, theme: 'rooftops', sky: id } as World['level'];
      const ctx = document.createElement('canvas').getContext('2d') as unknown as CanvasRenderingContext2D;
      expect(() => drawFrame(ctx, w, { w: 390, h: 520, mono: false, reduced: false, alpha: 1, dpr: 3 }, new Juice())).not.toThrow();
      expect(frameStats().sky).toBe(id);
    }
  });
});
