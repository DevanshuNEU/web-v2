'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useAnalyticsStore } from '@/store/analyticsStore';
import { useOSStore } from '@/store/osStore';
import { useMobileStore } from '@/store/mobileStore';
import { useAssistantUiStore } from '@/store/assistantUiStore';
import { useTheme } from '@/store/themeStore';
import { useIsMono } from '@/hooks/usePalette';
import { MetaLabel, Hairline } from '@/components/editorial';
import { resolveCommand, type CommandResult } from '@/lib/terminalCommands';
import type { AppType } from '../../../../shared/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface HistoryEntry {
  id: number;
  command?: string;       // undefined = welcome banner
  output: string[];
  special?: CommandResult extends { type: 'special'; id: infer T } ? T : never;
}

// ---------------------------------------------------------------------------
// Matrix rain special effect
// ---------------------------------------------------------------------------

function MatrixRain({ onDone }: { onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mono = useIsMono();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const cols = Math.floor(canvas.width / 14);
    const drops = Array(cols).fill(1);

    // Fun keeps the classic Matrix green; mono falls to glowing white on black.
    const glyphColor = mono ? '#f5f5f5' : '#00ff41';

    const draw = () => {
      ctx.fillStyle = 'rgba(0,0,0,0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = glyphColor;
      ctx.font = '13px monospace';

      drops.forEach((y, i) => {
        const char = String.fromCharCode(0x30a0 + Math.random() * 96);
        ctx.fillText(char, i * 14, y * 14);
        if (y * 14 > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      });
    };

    const interval = setInterval(draw, 40);
    const timeout = setTimeout(() => {
      clearInterval(interval);
      onDone();
    }, 4000);

    return () => { clearInterval(interval); clearTimeout(timeout); };
  }, [onDone, mono]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-32 rounded-lg overflow-hidden"
      style={{ background: 'black' }}
    />
  );
}

// ---------------------------------------------------------------------------
// Hire animation
//
// Staged reveal: "processing" checks appear one by one (150ms apart), then
// the contact card fades in after all checks pass. This rewards the visitor
// who typed the command and makes the payoff feel earned.
// ---------------------------------------------------------------------------

const HIRE_CHECKS = [
  { label: 'vibe check',            result: 'passed' },
  { label: 'github activity',       result: 'impressive' },
  { label: 'distributed systems',   result: 'yes' },
  { label: 'ships on time',         result: 'usually' },
  { label: 'coffee dependency',     result: 'critical (healthy)' },
  { label: 'open to opportunities', result: 'very much so' },
];

function HireOutput() {
  const [visibleChecks, setVisibleChecks] = useState(0);
  const [showContact,   setShowContact]   = useState(false);
  const mono = useIsMono();

  // In mono the whole hire payoff is white-on-black graphite: the check glyph
  // and "ACCESS GRANTED" still carry meaning by glyph + weight, not by green.
  const cmd      = mono ? 'text-white/40'  : 'text-green-400/60';
  const check    = mono ? 'text-white'     : 'text-green-500';
  const checkLbl = mono ? 'text-white/50'  : 'text-green-400/50';
  const checkVal = mono ? 'text-white/80'  : 'text-green-300/80';
  const cardBox  = mono ? 'border-white/20 bg-white/[0.04]' : 'border-green-500/30 bg-green-500/5';
  const grant    = mono ? 'text-white'     : 'text-green-400';
  const sigil    = mono ? 'text-white/40'  : 'text-green-600/60';
  const link     = mono ? 'text-white underline-offset-2' : 'text-blue-400';
  const footer   = mono ? 'text-white/50'  : 'text-green-400/60';

  useEffect(() => {
    // Reveal each check line 150ms apart
    HIRE_CHECKS.forEach((_, i) => {
      const t = setTimeout(() => setVisibleChecks(i + 1), i * 150);
      return () => clearTimeout(t);
    });
    // Show contact block after all checks complete + a short pause
    const contactTimer = setTimeout(
      () => setShowContact(true),
      HIRE_CHECKS.length * 150 + 300
    );
    return () => clearTimeout(contactTimer);
  }, []);

  return (
    <div className="my-2 font-mono text-sm space-y-0.5">
      {/* Processing header */}
      <div className={`${cmd} mb-2`}>$ hire devanshu --evaluate</div>

      {/* Animated check lines */}
      {HIRE_CHECKS.slice(0, visibleChecks).map(({ label, result }, i) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, transform: 'translateX(-6px)' }}
          animate={{ opacity: 1, transform: 'translateX(0px)' }}
          transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
          className="flex gap-2"
        >
          <span className={check}>✓</span>
          <span className={`${checkLbl} w-40 flex-shrink-0`}>{label}</span>
          <span className={checkVal}>{result}</span>
        </motion.div>
      ))}

      {/* Contact block — fades in after all checks */}
      <AnimatePresence>
        {showContact && (
          <motion.div
            initial={{ opacity: 0, transform: 'translateY(6px)' }}
            animate={{ opacity: 1, transform: 'translateY(0px)' }}
            transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
            className={`mt-4 p-4 border rounded-lg ${cardBox}`}
          >
            <div className={`${grant} font-bold mb-3`}>
              ACCESS GRANTED: candidate approved for hire
            </div>
            <div className="space-y-1.5 text-sm">
              <div>
                <span className={`${sigil} mr-3 inline-block w-6`}>@</span>
                <a
                  href="mailto:chicholikar.d@northeastern.edu"
                  className={`${link} hover:underline`}
                >
                  chicholikar.d@northeastern.edu
                </a>
              </div>
              <div>
                <span className={`${sigil} mr-3 inline-block w-6`}>in</span>
                <a
                  href="https://linkedin.com/in/devanshuchicholikar"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${link} hover:underline`}
                >
                  linkedin.com/in/devanshuchicholikar
                </a>
              </div>
              <div>
                <span className={`${sigil} mr-3 inline-block w-6`}>{'{}'}</span>
                <a
                  href="https://github.com/DevanshuNEU"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${link} hover:underline`}
                >
                  github.com/DevanshuNEU
                </a>
              </div>
            </div>
            <div className={`mt-3 ${footer} italic font-mono-meta`}>
              Seriously though, let&apos;s build something.
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Boot greeting (typewriter)
//
// A warm, one-time typed greeting that runs on first open. Mount-based only
// (no scroll/in-view trigger): a timer reveals one more character every ~22ms.
// Under reduced motion the full string is rendered instantly with no timer,
// so the terminal is fully usable without waiting on any animation. The text
// is purely chrome; it lives above the command feed and never touches history
// or the parser.
// ---------------------------------------------------------------------------

const BOOT_GREETING = "Welcome. You've reached a real terminal with a little soul.";

function BootGreeting({ reduced }: { reduced: boolean | null }) {
  const [count, setCount] = useState(reduced ? BOOT_GREETING.length : 0);

  useEffect(() => {
    if (reduced) {
      setCount(BOOT_GREETING.length);
      return;
    }
    let i = 0;
    const tick = setInterval(() => {
      i += 1;
      setCount(i);
      if (i >= BOOT_GREETING.length) clearInterval(tick);
    }, 22);
    return () => clearInterval(tick);
  }, [reduced]);

  const typing = !reduced && count < BOOT_GREETING.length;

  return (
    <p className="text-gray-300 leading-snug">
      <span aria-hidden className="text-white/40 mr-2">&#9656;</span>
      {BOOT_GREETING.slice(0, count)}
      {typing && (
        <span aria-hidden className="terminal-caret inline-block">&#9608;</span>
      )}
    </p>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

let nextId = 0;

export default function TerminalApp({ variant }: { variant?: 'desktop' | 'mobile' } = {}) {
  const trackEvent = useAnalyticsStore(state => state.trackEvent);
  const openWindow = useOSStore(state => state.openWindow);
  const openApp = useMobileStore(state => state.openApp);
  const openAssistant = useAssistantUiStore(state => state.openAssistant);
  const { mode, toggleMode } = useTheme();
  const mono = useIsMono();
  const reduced = useReducedMotion();

  // Fun keeps the colored shell prompt; mono is foreground-on-black graphite,
  // legibility carried by weight and the existing white/40 separators.
  const promptUser = mono ? 'text-white'    : 'text-blue-400';
  const promptHost = mono ? 'text-white/70' : 'text-purple-400';
  const promptCmd  = mono ? 'text-white'    : 'text-green-300';
  const feedText   = mono ? 'text-gray-200' : 'text-green-400';
  // Hide the native caret: a steady editorial block caret is rendered at the
  // prompt instead (see the input line). Color still tracks the palette.
  const inputText  = mono
    ? 'text-white caret-transparent'
    : 'text-green-300 caret-transparent';

  // On mobile, redirect window-open commands to the mobile app system
  const openWindowOrApp = useCallback((appId: string) => {
    if (variant === 'mobile') {
      openApp(appId as AppType);
    } else {
      openWindow(appId as AppType);
    }
  }, [variant, openApp, openWindow]);

  const [history, setHistory] = useState<HistoryEntry[]>([
    {
      id: nextId++,
      output: [
        'devOS Terminal :: v2.0',
        "Type 'help' for available commands.",
        '',
      ],
    },
  ]);
  const [input, setInput] = useState('');
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [matrixDone, setMatrixDone] = useState(true);
  const [focused, setFocused] = useState(true);

  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 10);
  }, []);

  useEffect(scrollToBottom, [history, scrollToBottom]);

  const handleCommand = useCallback((raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;

    trackEvent('terminal_command', `Terminal: ${trimmed}`, { command: trimmed.split(' ')[0] });

    if (trimmed.toLowerCase() === 'clear') {
      setHistory([]);
      setInput('');
      return;
    }

    setCmdHistory(prev => [trimmed, ...prev]);
    setHistoryIdx(-1);

    const resolved = resolveCommand(trimmed);
    const id = nextId++;

    if (!resolved) {
      setHistory(prev => [
        ...prev,
        {
          id,
          command: trimmed,
          output: [
            `Command not found: ${trimmed.split(' ')[0]}`,
            "Type 'help' for available commands.",
            '',
          ],
        },
      ]);
      setInput('');
      return;
    }

    const ctx = { openWindow: openWindowOrApp, toggleTheme: toggleMode, currentTheme: mode };
    const result = resolved.handler(resolved.args, ctx);

    if (Array.isArray(result)) {
      setHistory(prev => [...prev, { id, command: trimmed, output: result }]);
    } else if (result.type === 'action') {
      if (result.action === 'openWindow') openWindowOrApp(result.payload as string);
      if (result.action === 'openAssistant') openAssistant(result.payload);
      if (result.action === 'toggleTheme') toggleMode();
      setHistory(prev => [...prev, { id, command: trimmed, output: [] }]);
    } else if (result.type === 'special') {
      if (result.id === 'matrix') setMatrixDone(false);
      setHistory(prev => [
        ...prev,
        { id, command: trimmed, output: [], special: result.id as any },
      ]);
    }

    setInput('');
  }, [trackEvent, openWindowOrApp, openAssistant, toggleMode, mode]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleCommand(input);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const newIdx = Math.min(historyIdx + 1, cmdHistory.length - 1);
      setHistoryIdx(newIdx);
      setInput(cmdHistory[newIdx] ?? '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const newIdx = Math.max(historyIdx - 1, -1);
      setHistoryIdx(newIdx);
      setInput(newIdx === -1 ? '' : cmdHistory[newIdx] ?? '');
    }
  };

  // Steady block caret. Blinks via a scoped keyframe; under reduced motion it
  // holds a solid block (animation suppressed) so nothing depends on motion.
  // It only blinks while the input is focused, matching native terminal feel.
  const caretAnimated = !reduced && focused;

  return (
    <div
      data-testid="terminal-app"
      className={`h-full bg-black flex flex-col -m-px font-mono ${variant === 'mobile' ? 'text-base' : 'text-sm'}`}
      onClick={() => inputRef.current?.focus()}
    >
      {/* Scoped caret blink. Kept local to honor the file-only scope; no global
          CSS is touched. The animation is gated by the .is-steady class below. */}
      <style>{`
        @keyframes terminal-caret-blink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
        .terminal-caret { animation: terminal-caret-blink 1.05s steps(1) infinite; }
        .terminal-caret.is-steady { animation: none; opacity: 1; }
        @media (prefers-reduced-motion: reduce) {
          .terminal-caret { animation: none; opacity: 1; }
        }
      `}</style>

      {/* ── Window chrome (editorial register) ──────────────────────────────
          Reskinned-only header: a MetaLabel title + a hairline-separated meta
          status. The body below stays a true monospace terminal. */}
      <div className="flex items-center gap-3 px-5 pt-3.5 pb-3 shrink-0">
        <MetaLabel
          className="text-white"
          glyph={<span aria-hidden className="block h-2 w-2 bg-white" />}
        >
          Terminal
        </MetaLabel>
        <span aria-hidden className="font-mono-meta text-white/30">&middot;</span>
        <MetaLabel className="text-white/45">type help</MetaLabel>
      </div>
      <Hairline className="border-white/15 shrink-0" />

      <div ref={scrollRef} className={`flex-1 overflow-auto p-5 space-y-1 ${feedText}`}>
        {/* Warm typed boot greeting (chrome, mount-based, reduced-motion safe). */}
        <BootGreeting reduced={reduced} />

        {history.map((entry) => (
          <div key={entry.id}>
            {entry.command !== undefined && (
              <div className="flex gap-2 mb-1">
                <span aria-hidden className={mono ? 'text-white/45' : 'text-green-500/60'}>&#9656;</span>
                <span className={promptUser}>devanshu</span>
                <span className="text-white/40">@</span>
                <span className={promptHost}>devOS</span>
                <span className="text-white/40">~$</span>
                <span className={`${promptCmd} ml-1`}>{entry.command}</span>
              </div>
            )}

            {/* Special renders */}
            {entry.special === 'matrix' && (
              <MatrixRain onDone={() => setMatrixDone(true)} />
            )}
            {entry.special === 'hire' && <HireOutput />}

            {/* Plain text output */}
            {entry.output.map((line, i) => (
              <div key={i} className="text-gray-300 whitespace-pre leading-snug">{line}</div>
            ))}
          </div>
        ))}

        {/* Input line */}
        <div className="flex gap-2 mt-2 items-center">
          <span aria-hidden className={mono ? 'text-white/45' : 'text-green-500/60'}>&#9656;</span>
          <span className={promptUser}>devanshu</span>
          <span className="text-white/40">@</span>
          <span className={promptHost}>devOS</span>
          <span className="text-white/40">~$</span>
          {/* Mirror wrapper: an invisible sizing span pins width to the typed
              text so the block caret lands right after the last character. The
              real <input> overlays the whole area and stays the focus target. */}
          <span className="relative ml-1 flex-1 min-w-0">
            <span aria-hidden className="invisible whitespace-pre">
              {input || ''}
            </span>
            {!input && (
              <span aria-hidden className="pointer-events-none absolute left-0 top-0 text-white/25">
                try: projects
              </span>
            )}
            <span
              aria-hidden
              className={`terminal-caret pointer-events-none absolute top-0 inline-block ${caretAnimated ? '' : 'is-steady'} ${mono ? 'text-white' : 'text-green-400'}`}
              style={{ left: `${input.length}ch` }}
            >
              &#9608;
            </span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              className={`absolute inset-0 w-full bg-transparent outline-none ${inputText}`}
              autoFocus
              spellCheck={false}
              autoComplete="off"
              aria-label="Terminal command input"
            />
          </span>
        </div>
      </div>
    </div>
  );
}
