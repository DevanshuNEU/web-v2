'use client';

/**
 * Full-screen digital rain for the terminal's `matrix` command.
 *
 * Portals a fixed overlay over the whole OS (desktop and phone), runs until the
 * visitor presses any key, clicks or taps, and auto-exits after MAX_MS so it
 * can never trap anyone. The keypress that exits is swallowed so it does not
 * also land in the terminal input. Reduced motion skips the rain and shows the
 * message on black.
 */

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useReducedMotion } from 'framer-motion';

const MAX_MS = 30_000;
const COL_PX = 18;
const FONT_PX = 16;

/** Lines that type in over the rain, with the ms they appear at. */
export const MATRIX_LINES: Array<{ text: string; at: number }> = [
  { text: 'Wake up, recruiter...', at: 1200 },
  { text: 'The Matrix has you.', at: 3000 },
  { text: 'Follow the white rabbit: type hire devanshu', at: 4800 },
];

export default function MatrixFullscreen({ mono, onExit }: { mono: boolean; onExit: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(reduced ? MATRIX_LINES.length : 0);
  const exited = useRef(false);

  // Any key, click or tap exits. Capture phase so the key never reaches the
  // terminal input underneath. Click (not pointerdown) so the release cannot
  // land on whatever sits under the overlay once it unmounts.
  useEffect(() => {
    const exit = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      if (exited.current) return;
      exited.current = true;
      onExit();
    };
    const auto = setTimeout(() => {
      if (!exited.current) { exited.current = true; onExit(); }
    }, MAX_MS);
    window.addEventListener('keydown', exit, true);
    window.addEventListener('click', exit, true);
    return () => {
      clearTimeout(auto);
      window.removeEventListener('keydown', exit, true);
      window.removeEventListener('click', exit, true);
    };
  }, [onExit]);

  // Message lines type in on a schedule.
  useEffect(() => {
    if (reduced) return;
    const timers = MATRIX_LINES.map((l, i) => setTimeout(() => setShown(i + 1), l.at));
    return () => timers.forEach(clearTimeout);
  }, [reduced]);

  // The rain itself: one canvas, DPR-aware, resized with the viewport.
  useEffect(() => {
    if (reduced) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    let drops: number[] = [];
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cols = Math.ceil(window.innerWidth / COL_PX);
      // Stagger the start so the first frame is not one flat line.
      drops = Array.from({ length: cols }, (_, i) => drops[i] ?? -Math.floor(Math.random() * 40));
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
    };
    resize();
    window.addEventListener('resize', resize);

    const glyph = mono ? '#f5f5f5' : '#00ff41';
    const head = mono ? '#ffffff' : '#d7ffd9';
    let raf = 0;
    let last = 0;
    const frame = (t: number) => {
      raf = requestAnimationFrame(frame);
      if (t - last < 45) return;
      last = t;
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.fillStyle = 'rgba(0,0,0,0.06)';
      ctx.fillRect(0, 0, w, h);
      ctx.font = `${FONT_PX}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      for (let i = 0; i < drops.length; i++) {
        const y = drops[i] * COL_PX;
        if (y > 0) {
          ctx.fillStyle = Math.random() > 0.92 ? head : glyph;
          ctx.fillText(String.fromCharCode(0x30a0 + Math.random() * 96), i * COL_PX, y);
        }
        if (y > h && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [mono, reduced]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Matrix. Press any key to exit."
      className="fixed inset-0 z-[100000] bg-black cursor-pointer select-none"
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" aria-hidden />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center pointer-events-none">
        {MATRIX_LINES.slice(0, shown).map(l => (
          <p
            key={l.text}
            className="font-mono text-[15px] sm:text-lg tracking-wide px-3 py-1"
            style={{
              color: mono ? '#ffffff' : '#00ff41',
              background: 'rgba(0,0,0,0.78)',
              textShadow: mono ? '0 0 12px rgba(255,255,255,0.35)' : '0 0 12px rgba(0,255,65,0.45)',
            }}
          >
            {l.text}
          </p>
        ))}
      </div>
      <p
        className="absolute bottom-6 inset-x-0 text-center font-mono text-[11px] uppercase tracking-[0.18em] pointer-events-none"
        style={{ color: 'rgba(255,255,255,0.45)' }}
      >
        press any key to exit
      </p>
    </div>,
    document.body,
  );
}
