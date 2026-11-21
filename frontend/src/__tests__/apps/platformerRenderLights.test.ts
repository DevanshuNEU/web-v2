import { describe, it, expect } from 'vitest';
import { LightList, MAX_LIGHTS } from '@/components/apps/games/platformer/render/pixel/lights';

/** At most 24 lights are drawn a frame: the visible ones that matter most. */
describe('light culling', () => {
  const view = { x: 0, y: 0, w: 200, h: 120 };

  it('the cap is 24', () => {
    expect(MAX_LIGHTS).toBe(24);
  });

  it('keeps at most 24 of many visible lights', () => {
    const l = new LightList();
    l.begin(view.x, view.y, view.w, view.h, 100, 60);
    for (let i = 0; i < 80; i++) l.add((i * 37) % 200, (i * 11) % 120, 20, '#ff3d9a', 1, 0);
    expect(l.count).toBe(24);
  });

  it('skips lights whose glow does not reach the view', () => {
    const l = new LightList();
    l.begin(view.x, view.y, view.w, view.h, 100, 60);
    l.add(-50, 60, 20, '#fff', 1, 0); // 30 px left of the view
    l.add(215, 60, 20, '#fff', 1, 0); // 15 px right of it, but its radius reaches in
    l.add(100, 300, 40, '#fff', 1, 0);
    expect(l.count).toBe(1);
    expect(l.slots[0].x).toBe(215);
  });

  it('when over the cap, keeps the lights nearest the hero', () => {
    const l = new LightList();
    l.begin(view.x, view.y, view.w, view.h, 0, 60);
    for (let i = 0; i < 40; i++) l.add(199 - i * 5, 60, 10, '#fff', 1, 0);
    const xs = l.slots.slice(0, l.count).map(s => s.x);
    expect(Math.max(...xs)).toBeLessThanOrEqual(199 - 16 * 5);
    expect(Math.min(...xs)).toBe(199 - 39 * 5);
  });

  it('a level light outranks a nearer coin glow', () => {
    const l = new LightList();
    l.begin(view.x, view.y, view.w, view.h, 0, 60);
    for (let i = 0; i < 30; i++) l.add(i, 60, 6, '#ffb347', 1, 0);
    l.add(190, 60, 30, '#3df2ff', 1, 2);
    expect(l.slots.slice(0, l.count).some(s => s.x === 190)).toBe(true);
    expect(l.count).toBe(24);
  });

  it('reuses its slots: no new slot objects frame to frame', () => {
    const l = new LightList();
    const slots = l.slots;
    const first = slots[0];
    for (let f = 0; f < 3; f++) {
      l.begin(view.x, view.y, view.w, view.h, 100, 60);
      for (let i = 0; i < 50; i++) l.add(i * 4, 60, 10, '#fff', 1, 0);
    }
    expect(l.slots).toBe(slots);
    expect(l.slots[0]).toBe(first);
    expect(l.slots.length).toBe(24);
  });
});
