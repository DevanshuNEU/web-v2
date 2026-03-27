'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { bootMessages } from '@/data/copy';
import { useOSStore } from '@/store/osStore';

export default function BootSequence() {
  const setBooted = useOSStore(state => state.setBooted);
  const [visibleLines, setVisibleLines] = useState<number>(0);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<'boot' | 'fade'>('boot');

  // Reveal lines one by one
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    bootMessages.forEach((msg, i) => {
      timers.push(
        setTimeout(() => {
          setVisibleLines(i + 1);
          setProgress(((i + 1) / bootMessages.length) * 100);
        }, msg.delay)
      );
    });

    // Start fade after last message
    const lastDelay = bootMessages[bootMessages.length - 1].delay;
    timers.push(
      setTimeout(() => {
        setPhase('fade');
      }, lastDelay + 600)
    );

    // Complete boot
    timers.push(
      setTimeout(() => {
        setBooted();
      }, lastDelay + 1200)
    );

    return () => timers.forEach(clearTimeout);
  }, [setBooted]);

  return (
    <AnimatePresence>
      {phase !== 'fade' ? (
        <motion.div
          key="boot"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center overflow-hidden"
        >
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="mb-12 text-center"
          >
            <h1 className="text-4xl font-bold text-white tracking-tight">
              dev<span className="text-blue-400">OS</span>
            </h1>
            <p className="text-white/30 text-xs mt-1 font-mono">v2.0</p>
          </motion.div>

          {/* Terminal output */}
          <div className="w-full max-w-lg px-8 font-mono text-sm space-y-1 mb-8">
            {bootMessages.slice(0, visibleLines).map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.15 }}
                className="text-green-400/80"
              >
                <span className="text-green-600/50 mr-2">{'>'}</span>
                {msg.text}
              </motion.div>
            ))}
            {/* Blinking cursor */}
            {visibleLines < bootMessages.length && (
              <span className="inline-block w-2 h-4 bg-green-400/80 animate-pulse" />
            )}
          </div>

          {/* Progress bar */}
          <div className="w-full max-w-lg px-8">
            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-blue-400 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              />
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
