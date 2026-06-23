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
  it('renders editorial chrome: a Terminal title label', () => {
    render(<TerminalApp />);
    const labels = screen.getAllByTestId('meta-label');
    expect(labels.some((el) => /terminal/i.test(el.textContent ?? ''))).toBe(true);
  });

  it('renders the full boot greeting instantly under reduced motion', () => {
    mockReduced = true;
    render(<TerminalApp />);
    expect(
      screen.getByText(/real terminal with a little soul/i),
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
    expect(screen.getByText(/devOS Terminal\s+:: help/)).toBeInTheDocument();
  });

  it('reports unknown commands without crashing the loop', () => {
    render(<TerminalApp />);
    type('definitely-not-a-command');
    enter();
    expect(
      screen.getByText(/Command not found: definitely-not-a-command/),
    ).toBeInTheDocument();
  });

  it('clear empties the feed', () => {
    render(<TerminalApp />);
    type('help');
    enter();
    expect(screen.getByText(/devOS Terminal\s+:: help/)).toBeInTheDocument();
    type('clear');
    enter();
    expect(screen.queryByText(/devOS Terminal\s+:: help/)).not.toBeInTheDocument();
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
  it('matrix renders the special canvas (easter egg preserved)', () => {
    const { container } = render(<TerminalApp />);
    type('matrix');
    enter();
    expect(container.querySelector('canvas')).not.toBeNull();
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
