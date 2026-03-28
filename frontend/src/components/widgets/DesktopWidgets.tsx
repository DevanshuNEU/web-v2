'use client';

/**
 * DesktopWidgets — Clock + rotating dev quotes
 * Top-right corner of the desktop, theme-aware so it reads on any wallpaper.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/store/themeStore';

const QUOTES = [
  { text: 'Any fool can write code a computer understands. Good programmers write code humans understand.', author: 'Martin Fowler' },
  { text: 'First, solve the problem. Then, write the code.', author: 'John Johnson' },
  { text: 'Make it work, make it right, make it fast.', author: 'Kent Beck' },
  { text: 'Code is like humor. When you have to explain it, it\'s bad.', author: 'Cory House' },
  { text: 'Programs must be written for people to read, and only incidentally for machines to execute.', author: 'Harold Abelson' },
  { text: 'Premature optimization is the root of all evil.', author: 'Donald Knuth' },
  { text: 'Simplicity is the soul of efficiency.', author: 'Austin Freeman' },
  { text: 'The best code is no code at all.', author: 'Jeff Atwood' },
  { text: 'Deleted code is debugged code.', author: 'Jeff Sickel' },
  { text: 'It\'s not a bug — it\'s an undocumented feature.', author: 'Anonymous' },
  { text: 'One of the best programming skills you can have is knowing when to walk away for a while.', author: 'Oscar Godson' },
  { text: 'Walking on water and developing software from a spec are easy if both are frozen.', author: 'Edward V. Berard' },
];

export function DesktopWidgets() {
  const [time, setTime] = useState<Date | null>(null);
  const [quoteIdx, setQuoteIdx] = useState(0);
  const { mode } = useTheme();

  const isDark = mode === 'dark';

  useEffect(() => {
    setTime(new Date());
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setQuoteIdx(i => (i + 1) % QUOTES.length), 18000);
    return () => clearInterval(t);
  }, []);

  const hours   = time?.getHours().toString().padStart(2, '0')   ?? '--';
  const minutes = time?.getMinutes().toString().padStart(2, '0') ?? '--';
  const seconds = time?.getSeconds().toString().padStart(2, '0') ?? '--';
  const date    = time?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) ?? '';
  const quote   = QUOTES[quoteIdx];

  // Theme-aware pill card — frosted glass so it reads on any wallpaper
  const card = isDark
    ? 'bg-black/25 border-white/10'
    : 'bg-white/40 border-black/8';

  const clockColor   = isDark ? 'text-white/80'  : 'text-gray-800/80';
  const sepColor     = isDark ? 'text-white/25'  : 'text-gray-500/40';
  const secColor     = isDark ? 'text-white/35'  : 'text-gray-500/50';
  const dateColor    = isDark ? 'text-white/45'  : 'text-gray-600/70';
  const quoteColor   = isDark ? 'text-white/30'  : 'text-gray-700/55';
  const authorColor  = isDark ? 'text-white/20'  : 'text-gray-500/50';

  return (
    <div className="absolute right-5 top-10 flex flex-col items-end gap-3 pointer-events-none select-none z-[1]">

      {/* Clock card */}
      <div className={`rounded-2xl border backdrop-blur-md px-5 py-4 text-right ${card}`}>
        {/* Time */}
        <div className="font-mono leading-none tracking-tight" style={{ fontSize: 'clamp(36px, 4vw, 60px)' }}>
          <span className={`font-extralight ${clockColor}`}>{hours}</span>
          <span className={`font-extralight ${sepColor}`}>:</span>
          <span className={`font-extralight ${clockColor}`}>{minutes}</span>
          <span className={`font-extralight text-xl ml-2 align-baseline ${secColor}`}>{seconds}</span>
        </div>

        {/* Date */}
        <div className={`text-xs font-medium tracking-wide mt-1.5 ${dateColor}`}>{date}</div>

        {/* Divider */}
        <div className={`my-3 h-px ${isDark ? 'bg-white/10' : 'bg-black/8'}`} />

        {/* Quote */}
        <AnimatePresence mode="wait">
          <motion.div
            key={quoteIdx}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
            className="max-w-[220px] ml-auto space-y-1"
          >
            <p className={`text-[10px] leading-relaxed italic ${quoteColor}`}>
              &ldquo;{quote.text}&rdquo;
            </p>
            <p className={`text-[9px] ${authorColor}`}>— {quote.author}</p>
          </motion.div>
        </AnimatePresence>

      </div>

    </div>
  );
}
