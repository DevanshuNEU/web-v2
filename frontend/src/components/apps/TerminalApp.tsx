'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Copy, Check } from 'lucide-react';
import { useAnalyticsStore } from '@/store/analyticsStore';
import { useOSStore } from '@/store/osStore';
import { useMobileStore } from '@/store/mobileStore';
import { useAssistantUiStore } from '@/store/assistantUiStore';
import { useTerminalStore } from '@/store/terminalStore';
import { useTheme } from '@/store/themeStore';
import { useIsMono, usePalette } from '@/hooks/usePalette';
import {
  resolveCommand,
  getCompletions,
  suggestCommand,
  CONTACT,
  TERMINAL_SUGGESTIONS,
} from '@/lib/terminalCommands';
import { renderLine } from '@/lib/linkifyTerminal';
import MatrixFullscreen from '@/components/effects/MatrixFullscreen';
import type { AppType } from '../../../../shared/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface HistoryEntry {
  id: number;
  command?: string;       // undefined = welcome banner
  output: string[];
  special?: 'matrix' | 'hire';
  /** ASCII-art output: lines are aria-hidden and this is read instead. */
  alt?: string;
}

// Strong editorial ease-out, mirrored from STANDARDS.md / HireOutput's curve.
const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];

// Glyphs that mark box-drawing / ASCII-art output. Lines containing any of
// these must scroll horizontally instead of wrapping (which would shear the
// boxes apart on a narrow viewport).
const BOX_GLYPHS = /[║│╔╚╗╝└┌┐┘─┤├]/;

// ---------------------------------------------------------------------------
// Matrix rain special effect
// ---------------------------------------------------------------------------

function MatrixRain({ onDone }: { onDone: () => void }) {
  const mono = useIsMono();
  // Starts full screen; once the visitor exits it collapses to one line in the
  // scrollback, so re-renders of older blocks never relaunch it.
  const [active, setActive] = useState(true);
  const exit = useCallback(() => {
    setActive(false);
    onDone();
  }, [onDone]);

  if (active) return <MatrixFullscreen mono={mono} onExit={exit} />;
  return (
    <p className={mono ? 'text-white/55' : 'text-green-400/70'}>
      Wake up, recruiter. Follow the white rabbit: hire devanshu
    </p>
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
  // Every tier stays at or above 4.5:1 on black.
  const cmd      = mono ? 'text-white/55'  : 'text-green-400/80';
  const check    = mono ? 'text-white'     : 'text-green-500';
  const checkLbl = mono ? 'text-white/60'  : 'text-green-400/80';
  const checkVal = mono ? 'text-white/80'  : 'text-green-300/80';
  const cardBox  = mono ? 'border-white/20 bg-white/[0.04]' : 'border-green-500/30 bg-green-500/5';
  const grant    = mono ? 'text-white'     : 'text-green-400';
  const sigil    = mono ? 'text-white/55'  : 'text-green-500/80';
  const link     = mono ? 'text-white underline-offset-2' : 'text-blue-400';
  const footer   = mono ? 'text-white/60'  : 'text-green-400/80';

  useEffect(() => {
    // Reveal each check line 150ms apart, then the contact block after a
    // short pause. Every timer is cleared on unmount.
    const timers = HIRE_CHECKS.map((_, i) =>
      setTimeout(() => setVisibleChecks(i + 1), i * 150)
    );
    timers.push(setTimeout(() => setShowContact(true), HIRE_CHECKS.length * 150 + 300));
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="my-2 font-mono text-sm space-y-0.5">
      {/* Processing header */}
      <div className={`${cmd} mb-2`}>$ hire devanshu --evaluate</div>

      {/* Animated check lines */}
      {HIRE_CHECKS.slice(0, visibleChecks).map(({ label, result }) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, transform: 'translateX(-6px)' }}
          animate={{ opacity: 1, transform: 'translateX(0px)' }}
          transition={{ duration: 0.18, ease: EASE_OUT }}
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
            transition={{ duration: 0.28, ease: EASE_OUT }}
            className={`mt-4 p-4 border rounded-lg ${cardBox}`}
          >
            <div className={`${grant} font-bold mb-3`}>
              ACCESS GRANTED: candidate approved for hire
            </div>
            <div className="space-y-1.5 text-sm">
              <div>
                <span className={`${sigil} mr-3 inline-block w-6`}>@</span>
                <a
                  href={`mailto:${CONTACT.email}`}
                  className={`${link} hover:underline`}
                >
                  {CONTACT.email}
                </a>
              </div>
              <div>
                <span className={`${sigil} mr-3 inline-block w-6`}>in</span>
                <a
                  href={`https://${CONTACT.linkedin}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${link} hover:underline`}
                >
                  {CONTACT.linkedin}
                </a>
              </div>
              <div>
                <span className={`${sigil} mr-3 inline-block w-6`}>{'{}'}</span>
                <a
                  href={`https://${CONTACT.github}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${link} hover:underline`}
                >
                  {CONTACT.github}
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

const BOOT_GREETING = 'Type help to see commands. Try: hire devanshu';

function BootGreeting({ reduced, mono }: { reduced: boolean | null; mono: boolean }) {
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
    <p className={`leading-snug mb-3 ${mono ? 'text-white/70' : 'text-green-400/80'}`}>
      <span aria-hidden className={`mr-2 ${mono ? 'text-white/55' : 'text-green-500'}`}>&#9656;</span>
      {BOOT_GREETING.slice(0, count)}
      {typing && (
        <span aria-hidden className="terminal-caret inline-block">&#9608;</span>
      )}
    </p>
  );
}

// ---------------------------------------------------------------------------
// Output line — ink ramp + linkify
//
// A single output line. Routes through renderLine() so URLs/emails become
// clickable while preserving whitespace-pre alignment. The ink tier is chosen
// per-line so the feed reads as edited prose, not flat monospace:
//   - emphasis (white/90): a header line ("Things I've shipped:") — ends ':'
//     with no leading space.
//   - muted (white/45): a parenthetical aside ("(It's better.)").
//   - body (white/70): everything else.
// In Fun mode the original green ink is preserved.
// ---------------------------------------------------------------------------

function inkClass(line: string, mono: boolean): string {
  if (!mono) return 'text-green-400';
  const trimmedStart = line.replace(/\s+$/, '');
  if (trimmedStart.endsWith(':') && !/^\s/.test(line)) return 'text-white/90';
  if (/^\s*\(.*\)\s*$/.test(line)) return 'text-white/45';
  return 'text-white/70';
}

/**
 * Width (in characters) of a line's hanging indent: the leading spaces plus,
 * for two-column rows ("  Languages     TypeScript ..."), the key column. A
 * wrapped description then lines up under itself instead of column 0.
 */
export function hangingIndent(line: string): number {
  const col = /^(\s*(?:->\s+)?\S+(?: \S+)*\s{2,})(?=\S)/.exec(line);
  if (col) return col[1].length;
  return /^\s*/.exec(line)?.[0].length ?? 0;
}

function OutputLine({ line, mono, art }: { line: string; mono: boolean; art?: boolean }) {
  // Box-drawing and ASCII-art lines keep their exact spacing and scroll
  // sideways on their own; everything else wraps with a hanging indent so a
  // narrow window never scrolls the whole feed.
  if (art || BOX_GLYPHS.test(line)) {
    return (
      <div className={`whitespace-pre leading-snug overflow-x-auto ${inkClass(line, mono)}`}>
        {renderLine(line, mono)}
      </div>
    );
  }
  const indent = hangingIndent(line);
  return (
    <div
      className={`whitespace-pre-wrap break-words leading-snug ${inkClass(line, mono)}`}
      style={indent ? { paddingLeft: `${indent}ch`, textIndent: `-${indent}ch` } : undefined}
    >
      {renderLine(line, mono)}
    </div>
  );
}

// ---------------------------------------------------------------------------
// History block — prompt + output, with per-block copy + newest-block reveal
// ---------------------------------------------------------------------------

function HistoryBlock({
  entry,
  mono,
  isLatest,
  reduced,
  onMatrixDone,
  promptUser,
  promptHost,
  promptCmd,
}: {
  entry: HistoryEntry;
  mono: boolean;
  isLatest: boolean;
  reduced: boolean | null;
  onMatrixDone: () => void;
  promptUser: string;
  promptHost: string;
  promptCmd: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(() => {
    const text = entry.output.join('\n');
    if (!text) return;
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    }).catch(() => {/* clipboard unavailable — silently no-op */});
  }, [entry.output]);

  // Newest block only reveals (opacity + tiny rise), capped at the first six
  // lines with a 28ms stagger. Older blocks render instantly so re-renders
  // (e.g. the matrix-done callback) never re-trigger the entrance.
  const animate = isLatest && !reduced;
  const hasCopyableText = entry.output.some((l) => l.trim() !== '');

  // One row inside the block: a command prompt, a special render, or a line.
  let rowIdx = 0;
  const rowMotion = (children: React.ReactNode, key: React.Key) => {
    if (!animate) return <div key={key}>{children}</div>;
    const i = rowIdx++;
    return (
      <motion.div
        key={key}
        initial={{ opacity: 0, transform: 'translateY(4px)' }}
        animate={{ opacity: 1, transform: 'translateY(0px)' }}
        transition={{
          duration: 0.16,
          ease: EASE_OUT,
          delay: Math.min(i, 5) * 0.028,
        }}
      >
        {children}
      </motion.div>
    );
  };

  return (
    <div className="group relative">
      {/* Per-block copy. Hover-only and gated to fine-pointer devices so it
          never appears on touch (where there's no hover to dismiss it). */}
      {hasCopyableText && (
        <button
          type="button"
          onClick={copy}
          aria-label="Copy output"
          className="terminal-copy absolute right-0 top-0 z-10 p-1 text-white/55 opacity-0 [@media(hover:none)]:hidden transition-[color,opacity] duration-150 hover:text-white/80 focus-visible:opacity-100 focus-visible:text-white/80"
        >
          {copied ? <Check size={13} aria-hidden /> : <Copy size={13} aria-hidden />}
        </button>
      )}

      {entry.command !== undefined &&
        rowMotion(
          <div className="flex gap-2 mb-1">
            <span aria-hidden className={mono ? 'text-white/55' : 'text-green-500'}>&#9656;</span>
            <span className={promptUser}>devanshu</span>
            <span className="text-white/55">@</span>
            <span className={promptHost}>devOS</span>
            <span className="text-white/55">~$</span>
            <span className={`${promptCmd} ml-1`}>{entry.command}</span>
          </div>,
          'cmd'
        )}

      {/* Special renders (not part of the staggered text ramp) */}
      {entry.special === 'matrix' && <MatrixRain onDone={onMatrixDone} />}
      {entry.special === 'hire' && <HireOutput />}

      {/* Plain text output, linkified + ink-ramped. ASCII art is hidden
          from screen readers, which get the plain-text alt instead. */}
      {entry.alt ? (
        <>
          <div aria-hidden>
            {entry.output.map((line, i) =>
              rowMotion(<OutputLine line={line} mono={mono} art />, `out-${i}`)
            )}
          </div>
          <p className="sr-only">{entry.alt}</p>
        </>
      ) : (
        entry.output.map((line, i) =>
          rowMotion(<OutputLine line={line} mono={mono} />, `out-${i}`)
        )
      )}
    </div>
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
  const pendingCommand = useTerminalStore(s => s.pendingCommand);
  const setPendingCommand = useTerminalStore(s => s.setPendingCommand);
  const { mode, toggleMode } = useTheme();
  const mono = useIsMono();
  const palette = usePalette();
  // Whether this terminal's window is maximized: maximize / restore blurs the
  // input, so focus is handed back when it changes.
  const maximized = useOSStore(
    (s) => s.windows?.some((w) => w.appType === 'terminal' && w.isOpen && w.isMaximized) ?? false,
  );
  const reduced = useReducedMotion();

  // Fun keeps the colored shell prompt; mono is foreground-on-black graphite,
  // legibility carried by weight and the white/30 separators.
  const promptUser = mono ? 'text-white'    : 'text-blue-400';
  const promptHost = mono ? 'text-white/70' : 'text-purple-400';
  const promptCmd  = mono ? 'text-white'    : 'text-green-300';
  const feedText   = mono ? 'text-white/70' : 'text-green-400';
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

  // The boot greeting is the only intro; the feed starts empty.
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [input, setInput] = useState('');
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [matrixDone, setMatrixDone] = useState(true);
  const [focused, setFocused] = useState(true);
  const [typing, setTyping] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Tab-cycle state: idx -1 = not cycling. While cycling, `pool` and `head`
  // hold the candidates and the text before the token being completed, so
  // each Tab steps through the same list even though `input` has changed.
  const tabIdx = useRef(-1);
  const cycle = useRef<{ head: string; pool: string[] } | null>(null);
  // The id of the newest block, so only it animates its entrance.
  const latestId = useRef<number>(-1);

  // Empty-state rotating hint: pick ONE suggestion per mount (no per-keystroke
  // churn). Recomputed only when the component remounts.
  const emptyHintRef = useRef(
    TERMINAL_SUGGESTIONS[Math.floor(Math.random() * TERMINAL_SUGGESTIONS.length)]
  );

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 10);
  }, []);

  useEffect(scrollToBottom, [history, scrollToBottom]);

  // matrixDone gates nothing visually here but is consumed by MatrixRain's
  // lifecycle; reference it so the lint stays quiet without changing behavior.
  void matrixDone;

  const resetCycle = () => {
    tabIdx.current = -1;
    cycle.current = null;
  };

  const clearScreen = useCallback(() => {
    setHistory([]);
    setInput('');
    tabIdx.current = -1;
    cycle.current = null;
  }, []);

  const handleCommand = useCallback((raw: string) => {
    const trimmed = raw.trim();
    tabIdx.current = -1;
    cycle.current = null;
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
    latestId.current = id;

    if (!resolved) {
      setHistory(prev => [
        ...prev,
        {
          id,
          command: trimmed,
          output: (() => {
            const word = trimmed.split(/\s+/)[0];
            const guess = suggestCommand(word);
            return [
              guess ? `${word}: command not found. Did you mean ${guess}?` : `${word}: command not found.`,
              'Type help for the full list.',
              '',
            ];
          })(),
        },
      ]);
      setInput('');
      return;
    }

    const ctx = { openWindow: openWindowOrApp, toggleTheme: toggleMode, currentTheme: mode, palette };
    const result = resolved.handler(resolved.args, ctx);

    if (Array.isArray(result)) {
      setHistory(prev => [...prev, { id, command: trimmed, output: result }]);
    } else if (result.type === 'art') {
      setHistory(prev => [...prev, { id, command: trimmed, output: result.lines, alt: result.alt }]);
    } else if (result.type === 'action') {
      if (result.action === 'openWindow') openWindowOrApp(result.payload as string);
      if (result.action === 'openAssistant') openAssistant(result.payload);
      if (result.action === 'toggleTheme') toggleMode();
      setHistory(prev => [...prev, { id, command: trimmed, output: [] }]);
    } else if (result.type === 'special') {
      if (result.id === 'matrix') setMatrixDone(false);
      setHistory(prev => [
        ...prev,
        { id, command: trimmed, output: [], special: result.id },
      ]);
    }

    setInput('');
  }, [trackEvent, openWindowOrApp, openAssistant, toggleMode, mode, palette]);

  // Consume a Spotlight / App Library "command" handoff: if a command was
  // stashed in terminalStore before this mount (e.g. "hire devanshu"), run it
  // once then clear the slot. Mirrors ChatPanel's seed consumption. Works on
  // both desktop and mobile since both mount this shared component.
  useEffect(() => {
    if (pendingCommand) {
      handleCommand(pendingCommand);
      setPendingCommand(null);
    }
  }, [pendingCommand, handleCommand, setPendingCommand]);

  // -------------------------------------------------------------------------
  // Inline autosuggest ghost (the completion remainder shown after the caret).
  //
  // Priority: the most-recent matching command-history entry (fish-style),
  // then the lib's static getCompletions ghost. Never includes the typed text,
  // so it can never overlap the caret. Empty input shows no ghost (the empty
  // hint is shown separately).
  // -------------------------------------------------------------------------
  const ghost = (() => {
    if (input === '') return '';
    const fromHistory = cmdHistory.find(
      (c) => c.startsWith(input) && c.length > input.length
    );
    if (fromHistory) return fromHistory.slice(input.length);
    return getCompletions(input).ghost;
  })();

  // Tab-completion candidates (for the candidate row + cycling).
  const completions = getCompletions(input);

  const markTyping = useCallback(() => {
    setTyping(true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => setTyping(false), 500);
  }, []);

  useEffect(() => () => {
    if (typingTimer.current) clearTimeout(typingTimer.current);
  }, []);

  const acceptGhost = useCallback(() => {
    if (!ghost) return;
    setInput((prev) => prev + ghost);
    tabIdx.current = -1;
    cycle.current = null;
    markTyping();
    inputRef.current?.focus();
  }, [ghost, markTyping]);

  // Last whitespace-split token of the current input (what Tab operates on).
  const currentToken = input.replace(/^\s+/, '').split(/\s+/).pop() ?? '';

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const el = e.currentTarget;
    const caretAtEnd =
      el.selectionStart === input.length && el.selectionEnd === input.length;

    // Ctrl/Cmd+L → clear the screen (same path as `clear`).
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'l') {
      e.preventDefault();
      clearScreen();
      return;
    }

    if (e.key === 'Enter') {
      handleCommand(input);
      return;
    }

    // Esc clears a typed line. On an empty line it does nothing here (the
    // window-level Esc ignores text fields).
    if (e.key === 'Escape' && input !== '') {
      e.preventDefault();
      e.stopPropagation();
      setInput('');
      resetCycle();
      return;
    }

    // ArrowRight at end of input accepts the inline ghost (if any).
    if (e.key === 'ArrowRight' && caretAtEnd && ghost) {
      e.preventDefault();
      acceptGhost();
      return;
    }

    // Tab completes only when there is something to complete. Shift+Tab, Tab
    // on an empty line, and Tab with nothing left to fill all fall through to
    // the browser, so keyboard focus can always leave the terminal (no
    // keyboard trap, WCAG 2.1.2).
    if (e.key === 'Tab') {
      if (e.shiftKey || e.altKey || e.metaKey || e.ctrlKey || input.trim() === '') return;

      // Mid-cycle: step through the same candidate list.
      if (cycle.current && tabIdx.current >= 0) {
        e.preventDefault();
        const { head, pool } = cycle.current;
        tabIdx.current = (tabIdx.current + 1) % pool.length;
        setInput(head + pool[tabIdx.current]);
        markTyping();
        return;
      }

      const { candidates, commonPrefix } = completions;
      const head = input.slice(0, input.length - currentToken.length);

      // Ambiguous (bash-style): fill the common prefix first; if that adds
      // nothing, start cycling. The candidate row shows the options.
      if (candidates.length > 1) {
        e.preventDefault();
        if (commonPrefix.length > currentToken.length) {
          setInput(head + commonPrefix);
        } else {
          cycle.current = { head, pool: candidates };
          tabIdx.current = 0;
          setInput(head + candidates[0]);
        }
        markTyping();
        return;
      }

      // One answer: the inline ghost (history or registry) or the single
      // candidate.
      if (ghost) {
        e.preventDefault();
        acceptGhost();
        return;
      }
      if (candidates.length === 1 && candidates[0] !== currentToken) {
        e.preventDefault();
        setInput(head + candidates[0]);
        markTyping();
        return;
      }
      // Nothing to complete: let Tab move focus.
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const newIdx = Math.min(historyIdx + 1, cmdHistory.length - 1);
      setHistoryIdx(newIdx);
      setInput(cmdHistory[newIdx] ?? '');
      resetCycle();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const newIdx = Math.max(historyIdx - 1, -1);
      setHistoryIdx(newIdx);
      setInput(newIdx === -1 ? '' : cmdHistory[newIdx] ?? '');
      resetCycle();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    resetCycle();
    markTyping();
  };

  // Maximize / restore blurs the input (the click lands on the title bar), so
  // hand focus back and the next keystroke is not lost.
  const firstMaxRender = useRef(true);
  useEffect(() => {
    if (firstMaxRender.current) { firstMaxRender.current = false; return; }
    const t = setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 60);
    return () => clearTimeout(t);
  }, [maximized]);

  // The block caret blinks only while focused and idle. It goes steady while
  // typing (so it doesn't strobe under fast input) and under reduced motion.
  const caretSteady = reduced || !focused || typing;

  // Candidate row only when there's a real ambiguity to disambiguate.
  // While Tab-cycling, keep showing the pool being cycled through.
  const candidateList = cycle.current?.pool ?? completions.candidates;
  const showCandidates = input.trim() !== '' && candidateList.length > 1;

  return (
    <div
      data-testid="terminal-app"
      className={`h-full bg-black flex flex-col -m-px font-mono ${variant === 'mobile' ? 'text-base' : 'text-sm'}`}
      onClick={() => {
        // Don't steal focus mid text-selection (lets the feed stay copyable).
        if (window.getSelection()?.toString()) return;
        inputRef.current?.focus();
      }}
    >
      {/* Scoped caret blink + the focus-ring kill for the transparent input.
          Kept local to honor the file-only scope; no global CSS is touched.
          The blink is gated by the .is-steady class and reduced-motion. */}
      <style>{`
        @keyframes terminal-caret-blink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
        .terminal-caret { animation: terminal-caret-blink 1.05s steps(1) infinite; }
        .terminal-caret.is-steady { animation: none; opacity: 1; }
        [data-no-focus-ring]:focus,
        [data-no-focus-ring]:focus-visible { outline: none; box-shadow: none; }
        @media (prefers-reduced-motion: reduce) {
          .terminal-caret { animation: none; opacity: 1; }
        }
        @media (hover: hover) and (pointer: fine) {
          .group:hover .terminal-copy { opacity: 1; }
        }
      `}</style>

      <div ref={scrollRef} className={`flex-1 overflow-y-auto overflow-x-hidden select-text p-5 space-y-4 ${feedText}`}>
        {/* Typed boot greeting (chrome, mount-based, reduced-motion safe). */}
        <BootGreeting reduced={reduced} mono={mono} />

        {/* The feed is a log: new output is announced politely, once. */}
        <div role="log" aria-live="polite" aria-relevant="additions" aria-label="Terminal output" className="space-y-4">
        {history.map((entry) => (
          <HistoryBlock
            key={entry.id}
            entry={entry}
            mono={mono}
            isLatest={entry.id === latestId.current}
            reduced={reduced}
            onMatrixDone={() => setMatrixDone(true)}
            promptUser={promptUser}
            promptHost={promptHost}
            promptCmd={promptCmd}
          />
        ))}
        </div>

        {/* ── Live input line ──────────────────────────────────────────────
            ONE inline run: visible typed text + an inline block caret + an
            inline ghost SUFFIX, with a transparent content-width <input> on
            top driving state. No ch-math, no inset-0, no focus ring. */}
        <div
          className={`flex flex-wrap items-baseline gap-x-2 gap-y-1 mt-2 transition-opacity duration-150 ${
            focused ? '' : 'opacity-70'
          }`}
        >
          <span aria-hidden className={mono ? 'text-white/60' : 'text-green-500'}>&#9656;</span>
          <span className={promptUser}>devanshu</span>
          <span className="text-white/55">@</span>
          <span className={promptHost}>devOS</span>
          <span className="text-white/55">~$</span>

          <span
            className="relative inline-flex items-baseline ml-1 leading-none"
            style={{ lineHeight: 1 }}
          >
            {/* Visible typed text (the source of truth is `input`). */}
            <span className={`whitespace-pre ${inputText.split(' ')[0]}`}>{input}</span>

            {/* Inline block caret, right after the typed text so it never
                collides with the ghost. Unfocused, it becomes a hollow outline
                so you can tell typing will not land. */}
            {focused ? (
              <span
                aria-hidden
                className={`terminal-caret inline-block ${caretSteady ? 'is-steady' : ''} ${
                  mono ? 'text-white' : 'text-green-400'
                }`}
              >
                &#9608;
              </span>
            ) : (
              <span
                aria-hidden
                data-testid="terminal-caret-blurred"
                className={`inline-block h-[1.1em] w-[0.6em] translate-y-[0.15em] border ${
                  mono ? 'border-white/70' : 'border-green-400/80'
                }`}
              />
            )}

            {/* Inline ghost SUFFIX (completion remainder) OR the empty hint.
                Tapping it accepts the completion (mobile-friendly). */}
            {ghost ? (
              <span
                aria-hidden
                onClick={acceptGhost}
                className="whitespace-pre text-white/50 cursor-pointer"
              >
                {ghost}
              </span>
            ) : (
              input === '' && (
                <span aria-hidden className="whitespace-pre text-white/50">
                  {`try: ${emptyHintRef.current}`}
                </span>
              )
            )}

            {/* Transparent real input: content-width (not inset-0), drives all
                state, carries data-no-focus-ring to kill the stray outline. */}
            <input
              ref={inputRef}
              data-no-focus-ring
              type="text"
              value={input}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              // Transparent text + caret: the visible typed text and the block
              // caret are rendered by the spans above; this input only drives
              // state and capture, so it must not paint its own (overlapping) text.
              className="absolute left-0 top-0 h-full w-full bg-transparent text-transparent caret-transparent outline-none p-0"
              autoFocus
              spellCheck={false}
              autoComplete="off"
              aria-label="Terminal command input"
            />
          </span>
        </div>

        {/* Candidate row — compact, borderless, monochrome. Each entry is
            tappable (mobile) and applies the completion on click. */}
        {showCandidates && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 -mt-2 pl-6 font-mono">
            {candidateList.map((cand) => {
              const matched = cand.slice(0, currentToken.length);
              const rest = cand.slice(currentToken.length);
              return (
                <button
                  key={cand}
                  type="button"
                  onClick={() => {
                    const head = input.slice(0, input.length - currentToken.length);
                    setInput(head + cand);
                    resetCycle();
                    markTyping();
                    inputRef.current?.focus();
                  }}
                  className="whitespace-pre text-left transition-colors duration-150"
                >
                  <span className="text-white/90">{matched}</span>
                  <span className="text-white/60">{rest}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
