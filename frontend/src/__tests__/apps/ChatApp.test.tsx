// @vitest-environment jsdom

import '../setup/dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ChatApp from '@/components/apps/ChatApp';
import { useChatStore } from '@/store/chatStore';

const encoder = new TextEncoder();

/** A streamed plain-text Response, like /api/concierge returns. */
function streamingResponse(text: string, status = 200) {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
  return new Response(body, { status });
}

beforeEach(() => {
  useChatStore.getState().reset();
  // jsdom doesn't implement these; the component touches them.
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

describe('ChatApp', () => {
  it('renders the empty state with starter chips and a composer', () => {
    render(<ChatApp />);
    expect(screen.getByText('Ask me anything about what I build.')).toBeInTheDocument();
    expect(screen.getByText('What do you build?')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ask Devanshu anything')).toBeInTheDocument();
  });

  it('sends a question and streams the reply into the thread', async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) =>
      streamingResponse('I build AI dev tools at the MCP layer.'),
    );
    vi.stubGlobal('fetch', fetchMock);

    render(<ChatApp />);
    fireEvent.click(screen.getByText('What do you build?'));

    // The streamed assistant reply appears in the thread.
    await waitFor(() =>
      expect(screen.getByText(/I build AI dev tools at the MCP layer\./)).toBeInTheDocument(),
    );

    // It posted a multi-turn messages payload, not a one-shot {query}.
    expect(fetchMock).toHaveBeenCalledWith('/api/concierge', expect.any(Object));
    const init = fetchMock.mock.calls[0][1]!;
    const payload = JSON.parse(init.body as string);
    expect(payload.messages[0]).toMatchObject({ role: 'user', content: 'What do you build?' });
  });

  it('shows an offline message when the API is unconfigured (503)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 503 })));

    render(<ChatApp />);
    fireEvent.click(screen.getByText('What are you looking for?'));

    await waitFor(() => expect(screen.getByText(/offline/i)).toBeInTheDocument());
  });
});
