'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import Image from 'next/image';
import { useTheme } from '@/store/themeStore';
import { useIsMono } from '@/hooks/usePalette';
import { PARALLAX_DEPTH } from '@/lib/motion';
import { useParallaxDepth } from '@/hooks/useParallaxDepth';
import { tintForHour } from '@/lib/livingDesktop';

// ---------------------------------------------------------------------------
// Palette helper — luminance-preserving grayscale for the mono palette
// ---------------------------------------------------------------------------

/**
 * toGrayscale — convert a hex color to its perceptual-luma gray.
 *
 * Pure: hex (#rgb or #rrggbb) → '#gggggg' where g is the Rec. 601 luma
 * 0.299r + 0.587g + 0.114b. Used at render time to make any wallpaper render
 * in premium black & white when the palette is 'mono'; the source wallpaper
 * data is never mutated, so the 'color' (Fun) path reads the originals.
 * Returns the input unchanged if it is not a parseable hex string.
 */
export function toGrayscale(hex: string): string {
  if (typeof hex !== 'string') return hex;
  let h = hex.trim().replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  if (h.length !== 6 || /[^0-9a-fA-F]/.test(h)) return hex;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const luma = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  const hexLuma = Math.max(0, Math.min(255, luma)).toString(16).padStart(2, '0');
  return `#${hexLuma}${hexLuma}${hexLuma}`;
}

/** Map an array of hex colors through toGrayscale only when mono is active. */
function paletteColors(colors: string[], mono: boolean): string[] {
  return mono ? colors.map(toGrayscale) : colors;
}

// ---------------------------------------------------------------------------
// Living desktop — shared pointer parallax + time-of-day ambient tint
// ---------------------------------------------------------------------------
//
// Parallax drift now comes from the shared ParallaxProvider via
// useParallaxDepth(PARALLAX_DEPTH.wallpaper); each canvas no longer owns its own
// pointer listener. The wallpaper is still overscanned (scale 1.06) so the drift
// never exposes an edge, and overscan collapses to 1 under reduced motion. When
// the provider source rests at 0 (reduced / coarse pointer) the drift is 0.

function TimeOfDayTint({ mono }: { mono: boolean }) {
  const [tint, setTint] = useState<string | null>(null);
  useEffect(() => {
    const update = () => setTint(tintForHour(new Date().getHours()));
    update();
    const t = setInterval(update, 5 * 60 * 1000); // re-evaluate every 5 min
    return () => clearInterval(t);
  }, []);
  if (!tint) return null;
  // The ambient tint is a colored rgba(...) string; mono renders it as a neutral
  // wash via a grayscale filter so it keeps the time-of-day brightness cue
  // without introducing hue.
  return (
    <div
      aria-hidden
      className="fixed inset-0 -z-10 pointer-events-none transition-[background] duration-1000"
      style={{
        background: `radial-gradient(120% 90% at 50% 0%, ${tint}, transparent 70%)`,
        filter: mono ? 'grayscale(1)' : undefined,
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Canvas Animations
// ---------------------------------------------------------------------------

function ParticlesCanvas({ colors, reduced, mono }: { colors: string[]; reduced: boolean; mono: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const parallax = useParallaxDepth(PARALLAX_DEPTH.wallpaper);
  const overscan = reduced ? 1 : 1.06;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const palette = paletteColors(colors, mono);
    const fallback = mono ? toGrayscale('#4facfe') : '#4facfe';
    const color = palette[0] ?? fallback;
    const bg = mono ? toGrayscale('#080818') : '#080818';
    const N = 75;
    const MAX_DIST = 130;

    const pts = Array.from({ length: N }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.45,
      vy: (Math.random() - 0.5) * 0.45,
      r: Math.random() * 1.8 + 0.8,
    }));

    let raf: number;
    const draw = () => {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < N; i++) {
        const p = pts[i];
        p.x = (p.x + p.vx + canvas.width) % canvas.width;
        p.y = (p.y + p.vy + canvas.height) % canvas.height;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = color + 'bb';
        ctx.fill();

        for (let j = i + 1; j < N; j++) {
          const q = pts[j];
          const dx = p.x - q.x, dy = p.y - q.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < MAX_DIST) {
            const alpha = Math.floor((1 - d / MAX_DIST) * 80).toString(16).padStart(2, '0');
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = color + alpha;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }

      if (!reduced) raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [colors, reduced, mono]);

  return (
    <motion.canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full -z-10"
      style={{ x: parallax.x, y: parallax.y, scale: overscan }}
    />
  );
}

// ---------------------------------------------------------------------------

function StarfieldCanvas({ speed, reduced, mono }: { speed: number; reduced: boolean; mono: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const parallax = useParallaxDepth(PARALLAX_DEPTH.wallpaper);
  const overscan = reduced ? 1 : 1.06;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const N = 220;
    const stars = Array.from({ length: N }, () => ({
      x: (Math.random() - 0.5) * canvas.width,
      y: (Math.random() - 0.5) * canvas.height,
      z: Math.random() * canvas.width,
      pz: 0,
    }));
    stars.forEach(s => { s.pz = s.z; });

    const velocity = speed * 0.8;
    let raf: number;

    const draw = () => {
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Trail fade. The colorful path keeps its faint navy cast; mono neutralizes it.
      ctx.fillStyle = mono ? 'rgba(8,8,8,0.25)' : 'rgba(4,4,16,0.25)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      stars.forEach(s => {
        s.pz = s.z;
        s.z -= velocity;

        if (s.z <= 0) {
          s.x = (Math.random() - 0.5) * canvas.width;
          s.y = (Math.random() - 0.5) * canvas.height;
          s.z = canvas.width;
          s.pz = s.z;
        }

        const sx = (s.x / s.z) * canvas.width + cx;
        const sy = (s.y / s.z) * canvas.height + cy;
        const px = (s.x / s.pz) * canvas.width + cx;
        const py = (s.y / s.pz) * canvas.height + cy;

        const size = Math.max(0.1, (1 - s.z / canvas.width) * 3);
        const brightness = Math.floor((1 - s.z / canvas.width) * 255);
        // Colorful stars carry a faint blue lift; mono stars are pure gray.
        const blue = mono ? brightness : Math.min(255, brightness + 30);
        const col = `rgb(${brightness},${brightness},${blue})`;

        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(sx, sy);
        ctx.strokeStyle = col;
        ctx.lineWidth = size;
        ctx.stroke();
      });

      if (!reduced) raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [speed, reduced, mono]);

  return (
    <motion.canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full -z-10"
      style={{ x: parallax.x, y: parallax.y, scale: overscan }}
    />
  );
}

// ---------------------------------------------------------------------------

function MeshCanvas({ colors, speed, reduced, mono }: { colors: string[]; speed: number; reduced: boolean; mono: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const parallax = useParallaxDepth(PARALLAX_DEPTH.wallpaper);
  const overscan = reduced ? 1 : 1.06;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const palette = paletteColors(colors, mono);
    const bg = mono ? toGrayscale('#07071a') : '#07071a';
    const blobs = palette.map((color, i) => ({
      x: canvas.width * (0.15 + i * 0.28),
      y: canvas.height * (0.3 + (i % 2) * 0.35),
      vx: ((Math.random() - 0.5) * speed) / 20,
      vy: ((Math.random() - 0.5) * speed) / 20,
      r: Math.min(canvas.width, canvas.height) * 0.55,
      color,
    }));

    let raf: number;
    const draw = () => {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (const b of blobs) {
        b.x += b.vx;
        b.y += b.vy;
        if (b.x < -b.r / 2 || b.x > canvas.width + b.r / 2) b.vx *= -1;
        if (b.y < -b.r / 2 || b.y > canvas.height + b.r / 2) b.vy *= -1;

        const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
        g.addColorStop(0, b.color + '55');
        g.addColorStop(1, b.color + '00');
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();
      }

      if (!reduced) raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [colors, speed, reduced, mono]);

  return (
    <motion.canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full -z-10"
      style={{ x: parallax.x, y: parallax.y, scale: overscan }}
    />
  );
}

// ---------------------------------------------------------------------------
// Grid — PostHog-inspired dark navy base + drifting color glows + dot grid
// ---------------------------------------------------------------------------

function GridCanvas({ colors, reduced, mono }: { colors: string[]; reduced: boolean; mono: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const parallax = useParallaxDepth(PARALLAX_DEPTH.wallpaper);
  const overscan = reduced ? 1 : 1.06;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const palette = paletteColors(colors, mono);

    // Parse hex → [r, g, b] once
    const parsed = palette.map(hex => {
      const h = hex.replace('#', '');
      return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)] as [number,number,number];
    });

    // Seed blob positions differently so they spread across the canvas
    const startPositions = [[0.18, 0.28], [0.72, 0.18], [0.45, 0.78], [0.88, 0.65]];
    const blobs = palette.map((color, i) => ({
      color,
      rgb: parsed[i],
      x: (startPositions[i % 4][0]) * window.innerWidth,
      y: (startPositions[i % 4][1]) * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.35,
    }));

    const GRID = 38;  // dot grid spacing px

    const base = mono ? toGrayscale('#07091a') : '#07091a';

    let raf: number;
    const draw = () => {
      const W = canvas.width, H = canvas.height;

      // Deep navy base (graphite in mono)
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, W, H);

      // Move blobs + draw glow
      for (const b of blobs) {
        b.x += b.vx;
        b.y += b.vy;
        if (b.x < 0 || b.x > W) b.vx *= -1;
        if (b.y < 0 || b.y > H) b.vy *= -1;

        const R = Math.min(W, H) * 0.72;
        const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, R);
        g.addColorStop(0,   b.color + '26'); // ~15%
        g.addColorStop(0.5, b.color + '0d'); // ~5%
        g.addColorStop(1,   b.color + '00');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      }

      // Dot grid — each dot brightens near blobs and takes a color tint
      const cols = Math.ceil(W / GRID) + 1;
      const rows = Math.ceil(H / GRID) + 1;

      for (let ci = 0; ci < cols; ci++) {
        for (let ri = 0; ri < rows; ri++) {
          const dx0 = ci * GRID, dy0 = ri * GRID;

          let alpha = 0.07;
          let tr = 255, tg = 255, tb = 255;

          for (const b of blobs) {
            const dx = dx0 - b.x, dy = dy0 - b.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const prox = Math.max(0, 1 - dist / 280);
            if (prox > 0) {
              alpha += prox * 0.28;
              tr = Math.min(255, tr * (1 - prox * 0.5) + b.rgb[0] * prox * 0.5);
              tg = Math.min(255, tg * (1 - prox * 0.5) + b.rgb[1] * prox * 0.5);
              tb = Math.min(255, tb * (1 - prox * 0.5) + b.rgb[2] * prox * 0.5);
            }
          }

          alpha = Math.min(alpha, 0.52);
          ctx.beginPath();
          ctx.arc(dx0, dy0, 1.1, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${tr|0},${tg|0},${tb|0},${alpha.toFixed(3)})`;
          ctx.fill();
        }
      }

      if (!reduced) raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [colors, reduced, mono]);

  return (
    <motion.canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full -z-10"
      style={{ x: parallax.x, y: parallax.y, scale: overscan }}
    />
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function AnimatedBackground() {
  const { wallpaper } = useTheme();
  // Mono palette renders every wallpaper in luminance-preserving grayscale at
  // render time; the Fun (color) path keeps the original hardcoded hues.
  const mono = useIsMono();
  // When the OS requests reduced motion, canvases render a single static frame
  // instead of running their requestAnimationFrame loop.
  const reduced = !!useReducedMotion();

  if (!wallpaper) return <div className="fixed inset-0 -z-10 bg-bg" />;

  if (wallpaper.type === 'animated' && wallpaper.animatedConfig) {
    const { pattern, colors, speed } = wallpaper.animatedConfig;

    const canvas =
      pattern === 'particles' ? <ParticlesCanvas colors={colors} reduced={reduced} mono={mono} />
      : pattern === 'starfield' ? <StarfieldCanvas speed={speed} reduced={reduced} mono={mono} />
      : pattern === 'grid' ? <GridCanvas colors={colors} reduced={reduced} mono={mono} />
      // mesh / radial / wave → gradient blobs
      : <MeshCanvas colors={colors} speed={speed} reduced={reduced} mono={mono} />;

    return (
      <>
        {canvas}
        <TimeOfDayTint mono={mono} />
      </>
    );
  }

  if (wallpaper.type === 'static' && wallpaper.imageUrl) {
    return (
      <div className="fixed inset-0 w-full h-full -z-10">
        <Image
          src={wallpaper.imageUrl}
          alt={wallpaper.name}
          fill
          priority
          quality={100}
          className="object-cover"
          // Mono renders photographic wallpapers in grayscale so the desktop
          // stays premium black & white; the Fun path keeps full color.
          style={mono ? { filter: 'grayscale(1)' } : undefined}
        />
      </div>
    );
  }

  return <div className="fixed inset-0 -z-10 bg-bg" />;
}
