// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { PROGRESS_KEY, loadProgress, saveProgress, recordClear, recordMemory, recordAbility, recordPowerSeen, nextLevelId, emptyProgress } from '@/components/apps/games/platformer/ui/progress';

beforeEach(() => localStorage.clear());

describe('story progress, per device', () => {
  it('starts empty and tolerates junk', () => {
    expect(loadProgress()).toEqual(emptyProgress());
    localStorage.setItem(PROGRESS_KEY, 'not json');
    expect(loadProgress()).toEqual(emptyProgress());
    localStorage.setItem(PROGRESS_KEY, JSON.stringify({ v: 1, levels: { '1-1': { best: 'fast', memories: [3, '1-1-a'] } }, memories: 'x', abilities: { blade: 'yes', dash: true } }));
    const p = loadProgress();
    expect(p.levels['1-1'].best).toBeNull();
    expect(p.levels['1-1'].memories).toEqual(['1-1-a']);
    expect(p.memories).toEqual([]);
    expect(p.abilities).toEqual({ wallJump: false, dash: true, blade: false });
  });

  it('a different version is ignored, not misread', () => {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify({ v: 99, levels: { '1-1': { best: 10, memories: [] } } }));
    expect(loadProgress()).toEqual(emptyProgress());
  });

  it('records clears with the best time, memories, abilities and seen powers, and saves them', () => {
    let p = emptyProgress();
    p = recordClear(p, '1-1', 92.4, ['1-1-a']);
    p = recordClear(p, '1-1', 120, ['1-1-b']);
    p = recordMemory(p, '1-2-a');
    p = recordAbility(p, 'blade');
    p = recordPowerSeen(p, 'batWings');
    saveProgress(p);
    const q = loadProgress();
    expect(q.levels['1-1'].best).toBeCloseTo(92.4);
    expect(q.levels['1-1'].memories.sort()).toEqual(['1-1-a', '1-1-b']);
    expect(q.memories.sort()).toEqual(['1-1-a', '1-1-b', '1-2-a']);
    expect(q.abilities.blade).toBe(true);
    expect(q.powersSeen).toEqual(['batWings']);
  });

  it('continues from the first level not yet cleared', () => {
    const order = ['1-1', '1-2', '1-3', '2-1'];
    let p = emptyProgress();
    expect(nextLevelId(p, order)).toBe('1-1');
    p = recordClear(p, '1-1', 80, []);
    expect(nextLevelId(p, order)).toBe('1-2');
    p = recordClear(p, '1-2', 80, []);
    p = recordClear(p, '1-3', 80, []);
    expect(nextLevelId(p, order)).toBe('2-1');
  });
});
