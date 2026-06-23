// @vitest-environment jsdom

import '../setup/dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import TerminalApp from '@/components/apps/TerminalApp';
import { useTerminalStore } from '@/store/terminalStore';

/**
 * The pending-command handoff is what makes Spotlight "command" rows (e.g.
 * "hire devanshu") actually RUN instead of opening a blank terminal. The
 * Terminal consumes terminalStore.pendingCommand on mount and clears it.
 */

beforeEach(() => {
  useTerminalStore.setState({ pendingCommand: null });
  // jsdom lacks scrollIntoView; the terminal scrolls to the latest line.
  Element.prototype.scrollIntoView = vi.fn();
  // 'hire devanshu' fire-and-forgets a notify fetch — stub it.
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: async () => ({}) })) as unknown as typeof fetch);
});

describe('Terminal pending-command handoff', () => {
  it('runs the pending command on mount and clears the slot', () => {
    useTerminalStore.getState().setPendingCommand('help');
    render(<TerminalApp />);
    // The terminal mounted (its input is present) and the consume effect ran
    // handleCommand(...) then cleared the slot — proving the command executed.
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(useTerminalStore.getState().pendingCommand).toBeNull();
  });

  it('leaves the terminal idle when no command is pending', () => {
    render(<TerminalApp />);
    expect(useTerminalStore.getState().pendingCommand).toBeNull();
  });
});
