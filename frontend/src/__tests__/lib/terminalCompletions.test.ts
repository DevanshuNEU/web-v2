import { describe, it, expect } from 'vitest';
import { getCompletions } from '@/lib/terminalCommands';

/**
 * getCompletions powers the terminal's inline autosuggest + Tab-completion.
 * Pure string logic over the command names and the open/theme arg vocab.
 */

describe('getCompletions', () => {
  it('returns empty state for empty input', () => {
    expect(getCompletions('')).toEqual({ ghost: '', candidates: [], commonPrefix: '' });
  });

  it('ghosts the remainder of a uniquely-matched command', () => {
    const r = getCompletions('pro');
    expect(r.ghost).toBe('jects');
    expect(r.candidates).toContain('projects');
  });

  it('lists multiple candidates with their common prefix', () => {
    const r = getCompletions('h');
    expect(r.candidates).toEqual(expect.arrayContaining(['help', 'hire']));
    expect(r.commonPrefix).toBe('h');
    expect(r.ghost).toBe('elp'); // first registry match is "help"
  });

  it('completes open <app> arguments', () => {
    const r = getCompletions('open pro');
    expect(r.ghost).toBe('jects');
    expect(r.candidates).toContain('projects');
  });

  it('completes theme arguments', () => {
    expect(getCompletions('theme da').ghost).toBe('rk');
  });

  it('does not ghost on a case mismatch (avoids a completion that would not apply)', () => {
    expect(getCompletions('PRO').ghost).toBe('');
  });
});
