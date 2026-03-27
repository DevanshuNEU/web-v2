'use client';

/**
 * DesktopWidgets — Clock + rotating dev quotes
 * Sits on the desktop behind all windows, top-right corner.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const QUOTES = [
  { text: 'Any fool can write code a computer understands. Good programmers write code humans understand.', author: 'Martin Fowler' },
  { text: 'First, solve the problem. Then, write the code.', author: 'John Johnson' },
  { text: 'Make it work, make it right, make it fast.', author: 'Kent Beck' },
  { text: 'Code is like humor. When you have to explain it, it\'s bad.', author: 'Cory House' },
  { text: 'Programs must be written for people to read, and only incidentally for machines to execute.', author: 'Harold Abelson' },
  { text: 'Simplicity is the soul of efficiency.', author: 'Austin Freeman' },
  { text: 'Premature optimization is the root of all evil.', author: 'Donald Knuth' },
  { text: 'The best code is no code at all.', author: 'Jeff Atwood' },
  { text: 'Deleted code is debugged code.', author: 'Jeff Sickel' },
  { text: 'Walking on water and developing software from a specification are easy if both are frozen.', author: 'Edward V. Berard' },
  { text: 'It\'s not a bug — it\'s an undocumented feature.', author: 'Anonymous' },
  { text: 'One of the best programming skills you can have is knowing when to walk away for a while.', author: 'Oscar Godson' },
];

export function DesktopWidgets() {
  const [time, setTime] = useState<Date | null>(null);
  const [quoteIdx, setQuoteIdx] = useState(0);

  // Mount time on client only to avoid hydration mismatch
  useEffect(() => {
    setTime(new Date());
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setQuoteIdx(i => (i + 1) % QUOTES.length);
    }, 18000);
    return () => clearInterval(timer);
  }, []);

  const hours = time?.getHours().toString().padStart(2, '0') ?? '--';
  const minutes = time?.getMinutes().toString().padStart(2, '0') ?? '--';
  const seconds = time?.getSeconds().toString().padStart(2, '0') ?? '--';
  const date = time?.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  }) ?? '';

  const quote = QUOTES[quoteIdx];

  return (
    <div className="absolute right-6 top-6 flex flex-col items-end gap-5 pointer-events-none select-none z-[1]">
      {/* Clock */}
      <div className="text-right">
        <div className="font-mono leading-none tracking-tight" style={{ fontSize: 'clamp(42px, 5vw, 72px)' }}>
          <span className="text-white/65 font-extralight">{hours}</span>
          <span className="text-white/25 font-extralight">:</span>
          <span className="text-white/65 font-extralight">{minutes}</span>
          <span className="text-white/30 font-extralight text-2xl ml-2 align-middle">{seconds}</span>
        </div>
        <div className="text-white/35 text-sm mt-1 font-medium tracking-wide">{date}</div>
      </div>

      {/* Rotating quote */}
      <AnimatePresence mode="wait">
        <motion.div
          key={quoteIdx}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          className="max-w-[240px] text-right space-y-1"
        >
          <p className="text-white/25 text-[11px] leading-relaxed italic">
            &ldquo;{quote.text}&rdquo;
          </p>
          <p className="text-white/18 text-[10px]">— {quote.author}</p>
        </motion.div>
      </AnimatePresence>

      {/* devOS version */}
      <p className="text-white/20 text-[10px] font-mono tracking-widest">devOS v2.1</p>
    </div>
  );
}
