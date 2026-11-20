import { describe, it, expect } from 'vitest';
import { STORY_TEXT, storyText, cardIdBefore, cardIdAfter, memoryCaptionId } from '@/components/apps/games/platformer/story/text';

const CARDS = ['card-1-intro', 'card-1-1', 'card-1-2', 'card-1-3', 'card-2-intro', 'card-2-1', 'card-2-2', 'card-3-intro', 'card-3-1', 'card-3-2', 'card-3-3', 'card-boss', 'card-4-intro', 'card-4-1', 'card-season-boss', 'card-ending'];
const LEVELS = ['1-1', '1-2', '1-3', '2-1', '2-2', '3-1', '3-2', '3-3', '4-1'];
const MEMS = LEVELS.flatMap(l => ['a', 'b', 'c'].map(k => `mem-${l}-${k}`));

describe('story text', () => {
  it('has a generic line for every card and every world 1 memory', () => {
    for (const id of [...CARDS, ...MEMS]) expect(storyText(id).length, id).toBeGreaterThan(0);
  });

  it('cards are 2 to 3 short lines; captions one line', () => {
    for (const id of CARDS) {
      const lines = storyText(id).split('\n');
      expect(lines.length, id).toBeGreaterThanOrEqual(2);
      expect(lines.length, id).toBeLessThanOrEqual(3);
    }
    for (const id of MEMS) expect(storyText(id).split('\n').length, id).toBe(1);
  });

  it('a quiet voice: no dashes, no exclamation marks, nothing the pixel font cannot draw, lines fit a phone', () => {
    for (const [id, t] of Object.entries(STORY_TEXT)) {
      expect(t, id).not.toMatch(/[\u2013\u2014!]/);
      // prose has no hyphens at all; a given name may (The Ex-Bestie)
      if (!id.endsWith('-name')) expect(t, id).not.toMatch(/-/);
      expect(t, id).toMatch(/^[A-Za-z0-9 .,?'\n-]+$/);
      for (const line of t.split('\n')) expect(line.length, `${id}: ${line}`).toBeLessThanOrEqual(28);
    }
  });

  it('the public names are generic', () => {
    expect(storyText('boss-gorilla-name')).toBe('The Ex-Bestie');
    expect(storyText('concert-headliner-name')).toBe('The Headliner');
  });

  it('an override from the server replaces the generic line for that id only', () => {
    const o = { 'card-1-1': 'You laughed at the rain\nlike it owed you money.', 'mem-1-1-a': 'The first night.' };
    expect(storyText('card-1-1', o)).toBe(o['card-1-1']);
    expect(storyText('mem-1-1-a', o)).toBe('The first night.');
    expect(storyText('card-1-2', o)).toBe(storyText('card-1-2'));
  });

  it('ignores empty or non-string overrides', () => {
    const o = { 'card-1-1': '', 'card-1-2': 42 } as unknown as Record<string, string>;
    expect(storyText('card-1-1', o)).toBe(storyText('card-1-1'));
    expect(storyText('card-1-2', o)).toBe(storyText('card-1-2'));
  });

  it('an unknown id reads as nothing, not a crash', () => {
    expect(storyText('card-9-9')).toBe('');
  });

  it('names cards and captions by the agreed scheme', () => {
    expect(cardIdBefore('1-1')).toBe('card-1-intro');
    expect(cardIdBefore('2-1')).toBe('card-2-intro');
    expect(cardIdBefore('1-2')).toBeNull();
    expect(cardIdAfter('1-3')).toBe('card-1-3');
    expect(cardIdAfter('boss')).toBe('card-boss');
    expect(memoryCaptionId('1-1-a')).toBe('mem-1-1-a');
  });
});
