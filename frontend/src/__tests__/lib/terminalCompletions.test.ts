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

describe('help output', () => {
  it('prints an aligned plain list with no box glyphs', async () => {
    const { commandRegistry, HELP_ROWS } = await import('@/lib/terminalCommands');
    const ctx = { openWindow: () => {}, toggleTheme: () => {}, currentTheme: 'dark' as const };
    const lines = commandRegistry.help([], ctx) as string[];
    expect(lines.join('\n')).not.toMatch(/[║│╔╚╗╝═]/);
    const rows = lines.filter((l) => HELP_ROWS.some(([cmd]) => l.startsWith(`  ${cmd} `)));
    expect(rows).toHaveLength(HELP_ROWS.length);
    // Every description starts in the same column.
    const cols = new Set(rows.map((l, i) => l.indexOf(HELP_ROWS[i][1])));
    expect(cols.size).toBe(1);
  });

  it('suggests close commands and stays quiet for far ones', async () => {
    const { suggestCommand } = await import('@/lib/terminalCommands');
    expect(suggestCommand('hlep')).toBe('help');
    expect(suggestCommand('projcts')).toBe('projects');
    expect(suggestCommand('x')).toBeNull();
    expect(suggestCommand('foo')).toBeNull();
  });

  it('lists every open alias target in the error', async () => {
    const { commandRegistry } = await import('@/lib/terminalCommands');
    const ctx = { openWindow: () => {}, toggleTheme: () => {}, currentTheme: 'dark' as const };
    const out = (commandRegistry.open(['nope'], ctx) as string[]).join(' ');
    for (const name of ['about', 'help', 'browser', 'activity', 'devai']) expect(out).toContain(name);
  });
});
