// @vitest-environment jsdom

import '../setup/dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AssistantBubble from '@/components/assistant/AssistantBubble';
import { useAssistantUiStore } from '@/store/assistantUiStore';
import { useChatStore } from '@/store/chatStore';

beforeEach(() => {
  useChatStore.getState().reset();
  useAssistantUiStore.setState({ open: false });
  Element.prototype.scrollIntoView = vi.fn();
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    cb(0);
    return 0;
  });
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('AssistantBubble', () => {
  it('renders collapsed: orb present, panel hidden', () => {
    render(<AssistantBubble />);
    const orb = screen.getByRole('button', { name: 'Ask Devanshu' });
    expect(orb).toBeInTheDocument();
    expect(orb).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Ask me anything about what I build.')).not.toBeInTheDocument();
  });

  it('opens the panel on click and toggles aria-expanded', async () => {
    render(<AssistantBubble />);
    const orb = screen.getByRole('button', { name: 'Ask Devanshu' });

    fireEvent.click(orb);

    // ChatPanel body is now visible (empty-state copy).
    await waitFor(() =>
      expect(screen.getByText('Ask me anything about what I build.')).toBeInTheDocument(),
    );
    expect(orb).toHaveAttribute('aria-expanded', 'true');
  });

  it('closes on Escape', async () => {
    render(<AssistantBubble />);
    const orb = screen.getByRole('button', { name: 'Ask Devanshu' });

    fireEvent.click(orb);
    await waitFor(() =>
      expect(screen.getByText('Ask me anything about what I build.')).toBeInTheDocument(),
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() =>
      expect(screen.queryByText('Ask me anything about what I build.')).not.toBeInTheDocument(),
    );
    expect(orb).toHaveAttribute('aria-expanded', 'false');
  });
});
