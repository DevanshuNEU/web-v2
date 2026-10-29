// @vitest-environment jsdom

import '../setup/dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ChatPanel from '@/components/chat/ChatPanel';
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

describe('ChatPanel', () => {
  it('renders the empty state with starter chips and a composer', () => {
    render(<ChatPanel />);
    expect(screen.getByText('Ask me anything about what I build.')).toBeInTheDocument();
    expect(screen.getByText('What do you build?')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ask Devanshu anything')).toBeInTheDocument();
  });

  it('sends a question and streams the reply into the thread', async () => {
    const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () =>
      streamingResponse('I build AI dev tools at the MCP layer.'),
    );
    vi.stubGlobal('fetch', fetchMock);

    render(<ChatPanel />);
    fireEvent.click(screen.getByText('What do you build?'));

    // The streamed assistant reply appears in the thread. The thread is a
    // polite log that is no longer busy once the reply is done, so screen
    // readers hear the finished answer once.
    await waitFor(() =>
      expect(screen.getByText(/I build AI dev tools at the MCP layer\./)).toBeInTheDocument(),
    );
    const log = screen.getByRole('log');
    expect(log).toHaveAttribute('aria-live', 'polite');
    await waitFor(() => expect(log).toHaveAttribute('aria-busy', 'false'));
    expect(log).toHaveTextContent('I build AI dev tools at the MCP layer.');

    // It posted a multi-turn messages payload, not a one-shot {query}.
    expect(fetchMock).toHaveBeenCalledWith('/api/concierge', expect.any(Object));
    const init = fetchMock.mock.calls[0][1]!;
    const payload = JSON.parse(init.body as string);
    expect(payload.messages[0]).toMatchObject({ role: 'user', content: 'What do you build?' });
  });

  it('shows an offline message when the API is unconfigured (503)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 503 })));

    render(<ChatPanel />);
    fireEvent.click(screen.getByText('What roles are you open to?'));

    await waitFor(() => expect(screen.getByText(/offline/i)).toBeInTheDocument());
    // A way to reach a person, not a dead end.
    expect(screen.getByRole('button', { name: 'Copy email' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open Contact' })).toBeInTheDocument();
  });

  it('shows a typing indicator and a Stop button while waiting for the reply', async () => {
    // A fetch that never resolves until aborted: the panel stays "thinking".
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_input: unknown, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () =>
              reject(Object.assign(new Error('aborted'), { name: 'AbortError' })),
            );
          }),
      ),
    );

    render(<ChatPanel />);
    fireEvent.click(screen.getByText('What do you build?'));

    expect(await screen.findByLabelText('Thinking')).toBeInTheDocument();
    expect(screen.getByRole('log')).toHaveAttribute('aria-busy', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Stop reply' }));
    await waitFor(() => expect(screen.queryByLabelText('Thinking')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Send' })).toBeInTheDocument();
  });

  it('labels the composer visibly', () => {
    render(<ChatPanel />);
    expect(screen.getByLabelText("Message to Devanshu's AI")).toBe(screen.getByPlaceholderText('Ask Devanshu anything'));
  });
});
