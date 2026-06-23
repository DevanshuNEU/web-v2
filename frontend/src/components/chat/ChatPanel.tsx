'use client';

/**
 * ChatPanel — "Chat with Devanshu" conversation body.
 *
 * A real multi-turn conversation that answers in the first person as Devanshu
 * (an AI, disclosed). Premium and strictly monochrome: no chat bubbles, no
 * color, no accent. A calm speaker-grouped thread, a grayscale presence, and a
 * clean composer. Streams /api/concierge with the running thread.
 *
 * Pure black-and-white by construction: it uses only the neutral theme tokens
 * (text / text-secondary / surface / bg / border), never the accent token.
 *
 * This is the reusable body hosted by both the desktop AssistantBubble panel
 * and the mobile AssistantSheet. It carries all of the chat logic; the host
 * provides the chrome (orb / FAB / sheet, close affordance).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useReducedMotion } from 'framer-motion';
import { ArrowUp, ArrowUpRight, X } from 'lucide-react';
import { clampMessages, sanitizeVoice } from '@/lib/conciergeContext';
import { useChatStore } from '@/store/chatStore';
import { TypingDots, StreamCaret } from '@/components/os/TypingDots';

const STARTERS = [
  'What do you build?',
  'How is your RAG different?',
  'Are you good at systems?',
  'What are you looking for?',
] as const;

type Err = null | 'offline' | 'rate_limited' | 'error';

interface ChatPanelProps {
  /** Render a close affordance in the header (the host wires the action). */
  onClose?: () => void;
  /** Focus the composer when the panel mounts (default true). */
  autoFocusComposer?: boolean;
  /** Render the presence header (default true). */
  showHeader?: boolean;
}

export default function ChatPanel({
  onClose,
  autoFocusComposer = true,
  showHeader = true,
}: ChatPanelProps) {
  const reduced = useReducedMotion();
  const messages = useChatStore((s) => s.messages);
  const status = useChatStore((s) => s.status);
  const addUser = useChatStore((s) => s.addUser);
  const startAssistant = useChatStore((s) => s.startAssistant);
  const appendAssistant = useChatStore((s) => s.appendAssistant);
  const setStatus = useChatStore((s) => s.setStatus);
  const setSeed = useChatStore((s) => s.setSeed);

  const [input, setInput] = useState('');
  const [error, setError] = useState<Err>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const resizeInput = () => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  };

  // Run a completion against the current thread. Used by both send and retry,
  // so retry re-asks the existing question instead of duplicating it.
  const runCompletion = useCallback(async () => {
    // Clear any stale/partial assistant turn left by a previous failed attempt
    // so the thread ends on the user's question.
    const state = useChatStore.getState();
    if (state.messages.at(-1)?.role === 'assistant') state.dropLastAssistant();

    const thread = clampMessages(useChatStore.getState().messages);
    if (thread.length === 0) return;
    setError(null);
    setStatus('thinking');

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const res = await fetch('/api/concierge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: thread }),
        signal: ctrl.signal,
      });
      if (res.status === 503) { setStatus('idle'); setError('offline'); return; }
      if (res.status === 429) { setStatus('idle'); setError('rate_limited'); return; }
      if (!res.ok || !res.body) { setStatus('idle'); setError('error'); return; }

      startAssistant();
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        appendAssistant(decoder.decode(value, { stream: true }));
      }
      setStatus('idle');
    } catch (e) {
      if ((e as Error)?.name !== 'AbortError') { setStatus('idle'); setError('error'); }
    }
  }, [appendAssistant, setStatus, startAssistant]);

  const send = useCallback(
    async (raw: string) => {
      const content = raw.trim();
      if (!content || useChatStore.getState().status !== 'idle') return;
      addUser(content);
      setInput('');
      requestAnimationFrame(resizeInput);
      await runCompletion();
    },
    [addUser, runCompletion],
  );

  // Consume a question handed off from Spotlight / Terminal on mount. The panel
  // mounts fresh each time the assistant opens, so this stays a mount effect.
  useEffect(() => {
    const { seed } = useChatStore.getState();
    if (seed) { setSeed(null); send(seed); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Focus the composer on mount when requested.
  useEffect(() => {
    if (autoFocusComposer) taRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the latest turn in view as the thread grows / streams.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  }, [messages, status, reduced]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const canSend = input.trim().length > 0 && status === 'idle';
  const busy = status !== 'idle';
  const empty = messages.length === 0;
  const lastUser = [...messages].reverse().find((m) => m.role === 'user');

  return (
    // `container-type: size` makes the panel its own query container so the
    // empty-state rhythm scales off the panel's OWN height (cqh) — roomy on the
    // full-screen DevAI app, compact in the 380×560 desktop orb — with no
    // breakpoints and no coupling to the host.
    <div className="flex flex-col h-full w-full overflow-hidden bg-surface text-text [container-type:size]">
      {/* Presence header */}
      {showHeader && (
        <header className="flex items-center gap-3 px-5 py-4 border-b border-border flex-shrink-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-semibold tracking-[-0.01em] text-text leading-none">
                Devanshu
              </span>
              <span className="text-[9.5px] font-medium uppercase tracking-[0.14em] text-text-secondary border border-border rounded-[5px] px-1.5 py-1 leading-none">
                AI
              </span>
            </div>
            <div className="text-[11.5px] text-text-secondary mt-1.5 leading-none transition-colors">
              {busy ? 'thinking…' : 'Trained on my work, answering as me'}
            </div>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="grid place-items-center w-7 h-7 -mr-1 rounded-full text-text-secondary hover:text-text hover:bg-border/50 transition-colors flex-shrink-0"
            >
              <X size={16} strokeWidth={2.25} />
            </button>
          )}
        </header>
      )}

      {/* Thread */}
      <div className="flex-1 min-h-0 overflow-auto">
        {empty ? (
          <EmptyState reduced={!!reduced} onPick={send} />
        ) : (
          <div className="px-5 py-6 space-y-7">
            {messages.map((m, i) => {
              if (m.role === 'user') {
                return (
                  <div key={i} className="space-y-1.5">
                    <div className="text-[11px] font-medium uppercase tracking-wider text-text-secondary/70">
                      You
                    </div>
                    <p className="text-[15px] leading-relaxed text-text-secondary whitespace-pre-wrap">
                      {m.content}
                    </p>
                  </div>
                );
              }
              const clean = sanitizeVoice(m.content);
              const paras = clean.split(/\n{2,}/).filter(Boolean);
              const isLast = i === messages.length - 1;
              const streaming = isLast && status === 'streaming';
              return (
                <div key={i} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium uppercase tracking-wider text-text-secondary/70">
                      Devanshu
                    </span>
                  </div>
                  <div className="text-[15px] leading-relaxed text-text space-y-3 max-w-[64ch]">
                    {clean.length === 0 && streaming ? (
                      <TypingDots reduced={!!reduced} />
                    ) : (
                      paras.map((p, pi) => (
                        <motion.p
                          key={pi}
                          initial={reduced ? false : { opacity: 0, y: 3 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, ease: 'easeOut' }}
                          className="whitespace-pre-wrap"
                        >
                          {p}
                          {streaming && pi === paras.length - 1 && <StreamCaret reduced={!!reduced} />}
                        </motion.p>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Error / composer. The bottom safe-area inset keeps the input clear of
          the iOS home indicator on the full-screen surface; it resolves to 0 in
          the desktop orb, so the same tree is correct in both hosts. */}
      <div className="flex-shrink-0 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 border-t border-border">
        {error && (
          <div className="flex items-center gap-3 px-1 pb-2 text-[12px] text-text-secondary">
            <span>
              {error === 'offline' && 'Chat is offline right now.'}
              {error === 'rate_limited' && 'A lot of questions are coming in. Give it a minute.'}
              {error === 'error' && 'Something went wrong.'}
            </span>
            {lastUser && (
              <button
                onClick={runCompletion}
                className="underline underline-offset-2 hover:text-text transition-colors"
              >
                Try again
              </button>
            )}
          </div>
        )}
        <form
          onSubmit={(e) => { e.preventDefault(); send(input); }}
          className="flex items-end gap-2 rounded-2xl border border-border bg-bg px-3 py-2 transition-colors focus-within:border-text-secondary"
        >
          <textarea
            ref={taRef}
            value={input}
            onChange={(e) => { setInput(e.target.value); resizeInput(); }}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder="Ask Devanshu anything"
            spellCheck={false}
            data-no-focus-ring
            // 16px min so iOS Safari never pinch-zooms on focus.
            className="flex-1 bg-transparent resize-none outline-none text-[16px] text-text placeholder:text-text-secondary/60 leading-relaxed py-1.5 max-h-32"
          />
          <button
            type="submit"
            disabled={!canSend}
            aria-label="Send"
            className={`grid place-items-center w-8 h-8 rounded-full flex-shrink-0 transition-all active:scale-95 ${
              canSend ? 'bg-text text-bg' : 'bg-border/60 text-text-secondary cursor-not-allowed'
            }`}
          >
            <ArrowUp size={16} strokeWidth={2.5} />
          </button>
        </form>
      </div>
    </div>
  );
}

function EmptyState({ reduced, onPick }: { reduced: boolean; onPick: (q: string) => void }) {
  // Strong custom ease-out (the shell's --ease-out token) for the entrance; the
  // children stagger in just behind the container. Reduced-motion drops all
  // movement and shows everything at rest.
  const ease = [0.23, 1, 0.32, 1] as const;
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, ease }}
      // Editorial, calm: a single left-aligned column that sits a fluid distance
      // from the top (off-centre reads as a real surface, not a cramped sheet),
      // with rhythm that opens up on the full-screen app and tightens in the orb
      // via cqh — the panel is its own size container.
      className="flex min-h-full flex-col justify-start px-6 pt-[clamp(2rem,14cqh,6rem)] pb-8 gap-[clamp(1.25rem,4cqh,2rem)]"
    >
      <div className="space-y-[clamp(0.5rem,1.5cqh,0.75rem)]">
        <motion.p
          initial={reduced ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: reduced ? 0 : 0.04, ease }}
          className="text-[clamp(1.0625rem,5cqh,1.375rem)] font-medium tracking-[-0.01em] leading-snug text-text text-balance"
        >
          Ask me anything about what I build.
        </motion.p>
        <motion.p
          initial={reduced ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: reduced ? 0 : 0.09, ease }}
          className="text-[13px] leading-relaxed text-text-secondary max-w-[42ch]"
        >
          An AI trained on my work, answering in the first person as me. Pick a
          thread to start, or just type below.
        </motion.p>
      </div>

      <div className="flex flex-col items-stretch gap-2">
        {STARTERS.map((s, i) => (
          <motion.button
            key={s}
            type="button"
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.26, delay: reduced ? 0 : 0.14 + i * 0.05, ease }}
            onClick={() => onPick(s)}
            className="group flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-bg/40 px-4 py-3 text-left text-[14px] text-text-secondary transition-[color,border-color,transform] duration-150 ease-[var(--ease-out)] hover:text-text hover:border-text-secondary active:scale-[0.99]"
          >
            <span className="leading-snug">{s}</span>
            <ArrowUpRight
              size={15}
              strokeWidth={2}
              className="flex-shrink-0 text-text-secondary/40 transition-colors duration-150 group-hover:text-text"
            />
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
