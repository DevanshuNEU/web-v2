'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAnalyticsStore } from '@/store/analyticsStore';
import { useOSStore } from '@/store/osStore';
import { useTheme } from '@/store/themeStore';
import { resolveCommand, type CommandResult } from '@/lib/terminalCommands';

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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const cols = Math.floor(canvas.width / 14);
    const drops = Array(cols).fill(1);

    const draw = () => {
      ctx.fillStyle = 'rgba(0,0,0,0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#00ff41';
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
  }, [onDone]);

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
// ---------------------------------------------------------------------------

function HireOutput() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="my-2 p-4 border border-green-500/30 rounded-lg bg-green-500/5"
    >
      <div className="text-green-400 text-lg font-bold mb-2">[ hire devanshu ]</div>
      <div className="space-y-1 text-sm text-gray-300">
        <div><span className="text-green-600/70 mr-2">mail</span><a href="mailto:chicholikar.d@northeastern.edu" className="text-blue-400 hover:underline">chicholikar.d@northeastern.edu</a></div>
        <div><span className="text-green-600/70 mr-2">link</span><a href="https://linkedin.com/in/devanshuchicholikar" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">linkedin.com/in/devanshuchicholikar</a></div>
        <div><span className="text-green-600/70 mr-2">code</span><a href="https://github.com/DevanshuNEU" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">github.com/DevanshuNEU</a></div>
        <div className="pt-2 text-green-400/80 italic">Seriously though, let&apos;s talk.</div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

let nextId = 0;

export default function TerminalApp() {
  const trackEvent = useAnalyticsStore(state => state.trackEvent);
  const openWindow = useOSStore(state => state.openWindow);
  const { mode, toggleMode } = useTheme();

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

    const ctx = { openWindow, toggleTheme: toggleMode, currentTheme: mode };
    const result = resolved.handler(resolved.args, ctx);

    if (Array.isArray(result)) {
      setHistory(prev => [...prev, { id, command: trimmed, output: result }]);
    } else if (result.type === 'action') {
      if (result.action === 'openWindow') openWindow(result.payload as any);
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
  }, [trackEvent, openWindow, toggleMode, mode]);

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

  return (
    <div
      className="h-full bg-black flex flex-col -m-px font-mono text-sm"
      onClick={() => inputRef.current?.focus()}
    >
      <div ref={scrollRef} className="flex-1 overflow-auto p-5 space-y-1 text-green-400">
        {history.map((entry) => (
          <div key={entry.id}>
            {entry.command !== undefined && (
              <div className="flex gap-2 mb-1">
                <span className="text-blue-400">devanshu</span>
                <span className="text-white/40">@</span>
                <span className="text-purple-400">devOS</span>
                <span className="text-white/40">~$</span>
                <span className="text-green-300 ml-1">{entry.command}</span>
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
        <div className="flex gap-2 mt-2">
          <span className="text-blue-400">devanshu</span>
          <span className="text-white/40">@</span>
          <span className="text-purple-400">devOS</span>
          <span className="text-white/40">~$</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent outline-none text-green-300 caret-green-400 ml-1"
            autoFocus
            spellCheck={false}
            autoComplete="off"
          />
        </div>
      </div>
    </div>
  );
}
