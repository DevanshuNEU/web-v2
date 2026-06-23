// @vitest-environment jsdom

import '../setup/dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import TerminalApp from '@/components/apps/TerminalApp';
import { useTerminalStore } from '@/store/terminalStore';

beforeEach(() => {
  useTerminalStore.setState({ pendingCommand: null });
  Element.prototype.scrollIntoView = vi.fn();
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: async () => ({}) })) as unknown as typeof fetch);
});

describe('TerminalApp overhaul', () => {
  it('uses data-no-focus-ring on the input (no stray focus-outline box)', () => {
    render(<TerminalApp />);
    expect(screen.getByRole('textbox')).toHaveAttribute('data-no-focus-ring');
  });

  it('renders clickable links in command output', () => {
    useTerminalStore.getState().setPendingCommand('contact');
    render(<TerminalApp />);
    const mail = screen.getAllByRole('link').find((a) => a.getAttribute('href')?.startsWith('mailto:'));
    expect(mail).toBeTruthy();
  });

  it('inline autosuggest: typing a prefix shows the ghost and ArrowRight accepts it', async () => {
    render(<TerminalApp />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    await userEvent.type(input, 'pro');
    expect(screen.getByText('jects')).toBeInTheDocument(); // ghost suffix
    await userEvent.keyboard('{ArrowRight}');
    expect(input.value).toBe('projects');
  });
});
