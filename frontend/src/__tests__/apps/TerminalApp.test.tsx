// @vitest-environment jsdom

import '../setup/dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Store + hook mocks. The terminal pulls several Zustand stores; we stub them
// so the test can assert the command loop wiring (openWindow / openAssistant /
// toggleTheme) without standing up the whole OS shell.
// ---------------------------------------------------------------------------

const trackEvent = vi.fn();
const openWindow = vi.fn();
const openApp = vi.fn();
const openAssistant = vi.fn();
const toggleMode = vi.fn();

vi.mock('@/store/analyticsStore', () => ({
  useAnalyticsStore: (sel: (s: { trackEvent: typeof trackEvent }) => unknown) =>
    sel({ trackEvent }),
}));
vi.mock('@/store/osStore', () => ({
  useOSStore: (sel: (s: { openWindow: typeof openWindow }) => unknown) =>
    sel({ openWindow }),
}));
vi.mock('@/store/mobileStore', () => ({
  useMobileStore: (sel: (s: { openApp: typeof openApp }) => unknown) =>
    sel({ openApp }),
}));
vi.mock('@/store/assistantUiStore', () => ({
  useAssistantUiStore: (sel: (s: { openAssistant: typeof openAssistant }) => unknown) =>
    sel({ openAssistant }),
}));
vi.mock('@/store/themeStore', () => ({
  useTheme: () => ({ mode: 'dark', toggleMode }),
}));

// Reduced-motion flag is driven per-test.
let mockReduced = true;
vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>();
  return { ...actual, useReducedMotion: () => mockReduced };
});

// Mono is the default palette for the portfolio.
let mockMono = true;
vi.mock('@/hooks/usePalette', () => ({
  useIsMono: () => mockMono,
  usePalette: () => (mockMono ? 'mono' : 'color'),
}));

import TerminalApp from '@/components/apps/TerminalApp';

function input() {
  return screen.getByLabelText('Terminal command input') as HTMLInputElement;
}

function type(value: string) {
  fireEvent.change(input(), { target: { value } });
}

function enter() {
  fireEvent.keyDown(input(), { key: 'Enter' });
}

beforeEach(() => {
  mockReduced = true;
  mockMono = true;
  trackEvent.mockClear();
  openWindow.mockClear();
  openApp.mockClear();
  openAssistant.mockClear();
  toggleMode.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('TerminalApp chrome', () => {
  it('has one intro line and no in-app header (the window title says Terminal)', () => {
    render(<TerminalApp />);
    expect(screen.queryAllByTestId('meta-label')).toHaveLength(0);
    expect(screen.queryByText(/devOS Terminal :: v2.0/)).toBeNull();
  });

  it('marks the output feed as a polite log', () => {
    render(<TerminalApp />);
    const log = screen.getByRole('log');
    expect(log).toHaveAttribute('aria-live', 'polite');
  });

  it('renders the full boot greeting instantly under reduced motion', () => {
    mockReduced = true;
    render(<TerminalApp />);
    expect(
      screen.getByText(/type help to see commands/i),
    ).toBeInTheDocument();
  });

  it('shows a rotating example-command placeholder hint on an empty input', () => {
    render(<TerminalApp />);
    // The hint now rotates through TERMINAL_SUGGESTIONS (one pick per mount),
    // so assert the "try: <suggestion>" shape rather than a fixed command.
    expect(screen.getByText(/^try: \S/)).toBeInTheDocument();
  });
});

describe('TerminalApp command loop (must keep working)', () => {
  it('runs a known command (help) and prints output', () => {
    render(<TerminalApp />);
    type('help');
    enter();
    expect(trackEvent).toHaveBeenCalledWith(
      'terminal_command',
      expect.stringContaining('help'),
      expect.objectContaining({ command: 'help' }),
    );
    expect(screen.getByText(/^Commands$/)).toBeInTheDocument();
  });

  it('reports unknown commands without crashing the loop', () => {
    render(<TerminalApp />);
    type('definitely-not-a-command');
    enter();
    expect(
      screen.getByText(/definitely-not-a-command: command not found/),
    ).toBeInTheDocument();
  });

  it('suggests the closest command for a typo', () => {
    render(<TerminalApp />);
    type('abuot');
    enter();
    expect(screen.getByText(/abuot: command not found\. Did you mean about\?/)).toBeInTheDocument();
  });

  it('clear empties the feed', () => {
    render(<TerminalApp />);
    type('help');
    enter();
    expect(screen.getByText(/^Commands$/)).toBeInTheDocument();
    type('clear');
    enter();
    expect(screen.queryByText(/^Commands$/)).not.toBeInTheDocument();
  });

  it('open <app> dispatches openWindow on desktop', () => {
    render(<TerminalApp variant="desktop" />);
    type('open projects');
    enter();
    expect(openWindow).toHaveBeenCalledWith('projects');
  });

  it('open <app> dispatches openApp on mobile', () => {
    render(<TerminalApp variant="mobile" />);
    type('open projects');
    enter();
    expect(openApp).toHaveBeenCalledWith('projects');
  });

  it('ask <q> opens the assistant with the question (ask wiring intact)', () => {
    render(<TerminalApp />);
    // resolveCommand lowercases args before dispatch (existing parser
    // behavior); the assistant receives the normalized question.
    type('ask what did he build with MCP');
    enter();
    expect(openAssistant).toHaveBeenCalledWith('what did he build with mcp');
  });

  it('theme <mode> toggles the theme', () => {
    render(<TerminalApp />);
    type('theme light');
    enter();
    expect(toggleMode).toHaveBeenCalled();
  });
});

describe('TerminalApp easter egg + history', () => {
  it('matrix takes over the whole screen and any key exits it', () => {
    render(<TerminalApp />);
    type('matrix');
    enter();
    // Portaled to <body>, above the whole OS, with its own canvas.
    const overlay = screen.getByRole('dialog', { name: /matrix/i });
    expect(overlay.parentElement).toBe(document.body);
    expect(overlay.querySelector('canvas')).not.toBeNull();

    fireEvent.keyDown(window, { key: 'x' });
    expect(screen.queryByRole('dialog', { name: /matrix/i })).toBeNull();
    // The exiting key never reaches the terminal input.
    expect(input().value).toBe('');
    expect(screen.getByText(/follow the white rabbit/i)).toBeInTheDocument();
  });

  it('ArrowUp / ArrowDown navigate command history', () => {
    render(<TerminalApp />);
    type('help');
    enter();
    type('about');
    enter();

    fireEvent.keyDown(input(), { key: 'ArrowUp' });
    expect(input().value).toBe('about');
    fireEvent.keyDown(input(), { key: 'ArrowUp' });
    expect(input().value).toBe('help');
    fireEvent.keyDown(input(), { key: 'ArrowDown' });
    expect(input().value).toBe('about');
  });
});

describe('TerminalApp keyboard: no Tab trap (WCAG 2.1.2)', () => {
  const tab = (shiftKey = false) => fireEvent.keyDown(input(), { key: 'Tab', shiftKey });

  it('lets Tab through on an empty line', () => {
    render(<TerminalApp />);
    expect(tab()).toBe(true); // not default-prevented
  });

  it('never intercepts Shift+Tab', () => {
    render(<TerminalApp />);
    type('pro');
    expect(tab(true)).toBe(true);
  });

  it('lets Tab through when there is nothing to complete', () => {
    render(<TerminalApp />);
    type('zzz');
    expect(tab()).toBe(true);
    type('projects');
    expect(tab()).toBe(true);
  });

  it('completes a unique match and captures that Tab only', () => {
    render(<TerminalApp />);
    type('pro');
    expect(tab()).toBe(false);
    expect(input().value).toBe('projects');
    expect(tab()).toBe(true);
  });

  it('on an ambiguous match shows the candidates instead of picking one', () => {
    render(<TerminalApp />);
    type('open s');
    expect(tab()).toBe(false);
    // "skills", "skill-tree", "settings" share only "s": cycling starts at
    // the first and the candidate row stays up.
    expect(input().value).toBe('open skills');
    expect(screen.getByRole('button', { name: /settings/ })).toBeInTheDocument();
    tab();
    expect(input().value).toBe('open skill-tree');
  });
});

describe('TerminalApp output', () => {
  it('hides ASCII art from screen readers and reads a plain alt instead', () => {
    render(<TerminalApp />);
    type('cowsay hi');
    enter();
    expect(screen.getByText('A cow says: hi')).toHaveClass('sr-only');
  });

  it('open devai starts a chat instead of failing', () => {
    render(<TerminalApp />);
    type('open devai');
    enter();
    expect(openAssistant).toHaveBeenCalled();
  });
});
