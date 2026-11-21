'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import { useIsMono } from '@/hooks/usePalette';
import { MetaLabel } from '@/components/editorial';
import { withReduced } from '@/lib/motion';
import { bestScore, FUN, HudStat, GameHeader, OVERLAY_EASE, OverlayButton, ControlsHint } from '../shared/chrome';

// ─────────────────────────────────────────────────────────────────────────────
// TYPE RACER
// ─────────────────────────────────────────────────────────────────────────────

const CODE_SNIPPETS = [
  {
    label: 'React Hook',
    code: `const [count, setCount] = useState(0);\n\nuseEffect(() => {\n  document.title = \`Count: \${count}\`;\n}, [count]);`,
  },
  {
    label: 'Async Fetch',
    code: `async function fetchUser(id: string) {\n  const res = await fetch(\`/api/users/\${id}\`);\n  if (!res.ok) throw new Error('Not found');\n  return res.json();\n}`,
  },
  {
    label: 'Array Magic',
    code: `const result = users\n  .filter(u => u.active)\n  .map(u => ({ ...u, name: u.name.trim() }))\n  .sort((a, b) => a.name.localeCompare(b.name));`,
  },
  {
    label: 'Binary Search',
    code: `function binarySearch(arr: number[], target: number) {\n  let lo = 0, hi = arr.length - 1;\n  while (lo <= hi) {\n    const mid = (lo + hi) >> 1;\n    if (arr[mid] === target) return mid;\n    arr[mid] < target ? lo = mid + 1 : hi = mid - 1;\n  }\n  return -1;\n}`,
  },
  {
    label: 'Debounce',
    code: `function debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number) {\n  let timer: ReturnType<typeof setTimeout>;\n  return (...args: Parameters<T>) => {\n    clearTimeout(timer);\n    timer = setTimeout(() => fn(...args), delay);\n  };\n}`,
  },
];

export default function TypeRacerGame({ onBack, isMobile }: { onBack: () => void; isMobile: boolean }) {
  const mono = useIsMono();
  const reduced = useReducedMotion();
  const [snippetIdx, setSnippetIdx] = useState(0);
  const [typed,      setTyped]      = useState('');
  const [status,     setStatus]     = useState<'idle' | 'typing' | 'done'>('idle');
  const [startTime,  setStartTime]  = useState<number | null>(null);
  const [elapsed,    setElapsed]    = useState(0);
  const [finalWpm,   setFinalWpm]   = useState(0);
  const [accuracy,   setAccuracy]   = useState(100);
  const [best,       setBest]       = useState(() => bestScore('devos-typeracer-hs'));
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const startRef = useRef<number | null>(null);

  const snippet = CODE_SNIPPETS[snippetIdx].code;

  const reset = useCallback(() => {
    clearInterval(timerRef.current);
    setTyped(''); setStatus('idle'); setStartTime(null); setElapsed(0); setFinalWpm(0); setAccuracy(100);
    startRef.current = null;
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 100); }, []);
  useEffect(() => { reset(); }, [snippetIdx, reset]);

  useEffect(() => {
    if (status === 'typing' && startTime !== null) {
      timerRef.current = setInterval(() => setElapsed((Date.now() - startTime) / 1000), 100);
      return () => clearInterval(timerRef.current);
    }
  }, [status, startTime]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (status === 'done') return;
    if (status === 'idle') { const now = Date.now(); setStatus('typing'); setStartTime(now); startRef.current = now; }
    setTyped(value);
    let correct = 0;
    for (let i = 0; i < value.length; i++) if (value[i] === snippet[i]) correct++;
    setAccuracy(value.length > 0 ? Math.round((correct / value.length) * 100) : 100);
    if (value === snippet) {
      clearInterval(timerRef.current);
      const secs = (Date.now() - (startRef.current ?? Date.now())) / 1000;
      const wpm = Math.round((snippet.length / 5) / (secs / 60));
      setFinalWpm(wpm); setStatus('done');
      setBest(b => { const nb = Math.max(b, wpm); localStorage.setItem('devos-typeracer-hs', nb.toString()); return nb; });
    }
  };

  const currentWpm = status === 'typing' && elapsed > 0 ? Math.round((typed.length / 5) / (elapsed / 60)) : finalWpm;
  const progress = (typed.length / snippet.length) * 100;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <GameHeader
        title="Type Racer"
        score={currentWpm > 0 ? `${currentWpm} WPM` : '--'}
        best={best > 0 ? `${best} WPM` : '--'}
        scoreLabel="Current" bestLabel="Best" bestNarrowHidden
        onBack={onBack} onReset={reset}
      >
        {/* Accuracy keeps its color-not-only quality tiering (mono: opacity). */}
        <HudStat
          label="Accuracy"
          value={
            <span className={
              mono
                ? (accuracy >= 95 ? 'text-text' : accuracy >= 80 ? 'text-text/80' : 'text-text/55')
                : (accuracy >= 95 ? 'text-green-400' : accuracy >= 80 ? 'text-yellow-400' : 'text-red-400')
            }>{accuracy}%</span>
          }
        />
        <HudStat label="Time" value={`${elapsed.toFixed(1)}s`} narrowHidden />
      </GameHeader>

      <div className="flex-1 flex flex-col gap-4 p-5 bg-surface/20 overflow-auto">
        {/* Snippet selector - mono uppercase tabs with a hairline underline marker. */}
        <div className="flex items-center gap-x-5 gap-y-3 flex-wrap" role="group" aria-label="Snippet">
          {CODE_SNIPPETS.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSnippetIdx(i)}
              aria-pressed={snippetIdx === i}
              className="group relative font-mono-meta transition-[opacity,transform] duration-150 ease-out active:scale-[0.97]"
            >
              <span className={snippetIdx === i ? 'text-text font-semibold' : 'text-text-secondary group-hover:text-text'}>
                {s.label}
              </span>
              <span
                aria-hidden
                className={`absolute -bottom-1 left-0 right-0 h-px bg-text origin-left transition-transform duration-200 ease-out motion-reduce:transition-none
                            ${snippetIdx === i ? 'scale-x-100' : reduced ? 'scale-x-0' : 'scale-x-0 group-hover:scale-x-50'}`}
              />
            </button>
          ))}
        </div>

        {/* Progress bar - flat hairline track + ink fill (no per-frame easing pop). */}
        <div className="w-full h-px bg-border overflow-hidden">
          <div className={`h-full transition-[width] duration-100 ${mono ? 'bg-text' : 'bg-emerald-500'}`} style={{ width: `${Math.min(progress, 100)}%` }} />
        </div>

        {/* Snippet display */}
        <div className="border border-border p-4 font-mono text-sm leading-loose select-none overflow-auto max-h-48 bg-bg/40 whitespace-pre-wrap">
          {snippet.split('').map((char, i) => {
            const typedChar = typed[i];
            const isCursor = i === typed.length;
            let cls = 'text-text-secondary';
            if (typedChar !== undefined) {
              if (typedChar === char) {
                // Correct: bright foreground in mono, emerald in Fun.
                cls = mono ? 'text-text' : 'text-emerald-400';
              } else {
                // Wrong: in mono the underline + box + dim tone flag the error
                // without hue (color-not-only); Fun keeps the red box.
                cls = mono
                  ? 'text-text bg-text/15 rounded-sm underline decoration-2 underline-offset-2'
                  : 'text-red-400 bg-red-500/25 rounded-sm';
              }
            }
            // Typing cursor is chrome: ink in mono, the single accent only in Fun.
            if (isCursor && status !== 'done') cls += mono ? ' border-l-2 border-text' : ' border-l-2 border-accent';
            if (char === '\n') return <span key={i}><span className={cls}>↵</span>{'\n'}</span>;
            return <span key={i} className={cls}>{char === ' ' ? '\u00A0' : char}</span>;
          })}
        </div>

        {/* Input */}
        <textarea
          ref={inputRef}
          value={typed}
          onChange={handleChange}
          disabled={status === 'done'}
          placeholder={status === 'idle' ? 'Type the code above. The timer starts on your first key.' : ''}
          aria-label="Type the snippet here"
          className="w-full h-24 font-mono text-sm p-3 bg-bg/40 border border-border focus:border-text/40 focus:outline-none text-text resize-none placeholder:text-text-tertiary disabled:opacity-60 transition-colors"
          autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
        />

        {/* Completion - occasional surface: a single ease-out entrance, mono. */}
        <AnimatePresence>
          {status === 'done' && (
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={withReduced({ duration: 0.24, ease: OVERLAY_EASE }, reduced)}
              className={`border p-4 ${mono ? 'border-border bg-white/[0.03]' : 'border-emerald-500/30 bg-emerald-500/5'}`}
            >
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 size={20} className={`flex-shrink-0 ${mono ? 'text-text' : 'text-emerald-400'}`} />
                  <div className="flex flex-col gap-1">
                    <span className="font-display text-text text-base leading-none">
                      {finalWpm >= best && finalWpm > 0 ? 'New personal best' : 'Snippet complete'}
                    </span>
                    <MetaLabel className="text-text-secondary">
                      {elapsed.toFixed(1)}s · {accuracy}% accuracy · <span className={mono ? 'text-text' : 'text-emerald-400'}>{finalWpm} WPM</span>
                    </MetaLabel>
                  </div>
                </div>
                <div className="flex gap-2">
                  <OverlayButton onClick={reset} variant="ghost" mono={mono}>Retry</OverlayButton>
                  <OverlayButton onClick={() => setSnippetIdx(i => (i + 1) % CODE_SNIPPETS.length)} mono={mono} accent={FUN.typer.fill} accentHover={FUN.typer.hover}>Next snippet</OverlayButton>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ControlsHint>{isMobile ? 'Tap the field and type' : 'Type it exactly. Enter for ↵, spaces for indents.'}</ControlsHint>
    </div>
  );
}
