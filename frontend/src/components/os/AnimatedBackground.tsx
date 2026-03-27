'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { useTheme } from '@/store/themeStore';

// ---------------------------------------------------------------------------
// Canvas Animations
// ---------------------------------------------------------------------------

function ParticlesCanvas({ colors }: { colors: string[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

    const color = colors[0] ?? '#4facfe';
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
      ctx.fillStyle = '#080818';
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

      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [colors]);

  return <canvas ref={canvasRef} className="fixed inset-0 w-full h-full -z-10" />;
}

// ---------------------------------------------------------------------------

function StarfieldCanvas({ speed }: { speed: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

      ctx.fillStyle = 'rgba(4,4,16,0.25)';
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
        const col = `rgb(${brightness},${brightness},${Math.min(255, brightness + 30)})`;

        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(sx, sy);
        ctx.strokeStyle = col;
        ctx.lineWidth = size;
        ctx.stroke();
      });

      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [speed]);

  return <canvas ref={canvasRef} className="fixed inset-0 w-full h-full -z-10" />;
}

// ---------------------------------------------------------------------------

function MeshCanvas({ colors, speed }: { colors: string[]; speed: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

    const blobs = colors.map((color, i) => ({
      x: canvas.width * (0.15 + i * 0.28),
      y: canvas.height * (0.3 + (i % 2) * 0.35),
      vx: ((Math.random() - 0.5) * speed) / 20,
      vy: ((Math.random() - 0.5) * speed) / 20,
      r: Math.min(canvas.width, canvas.height) * 0.55,
      color,
    }));

    let raf: number;
    const draw = () => {
      ctx.fillStyle = '#07071a';
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

      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [colors, speed]);

  return <canvas ref={canvasRef} className="fixed inset-0 w-full h-full -z-10" />;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function AnimatedBackground() {
  const { wallpaper } = useTheme();

  if (!wallpaper) return <div className="fixed inset-0 -z-10 bg-bg" />;

  if (wallpaper.type === 'animated' && wallpaper.animatedConfig) {
    const { pattern, colors, speed } = wallpaper.animatedConfig;

    if (pattern === 'particles') {
      return <ParticlesCanvas colors={colors} />;
    }
    if (pattern === 'starfield') {
      return <StarfieldCanvas speed={speed} />;
    }
    // mesh / radial / wave → gradient blobs
    return <MeshCanvas colors={colors} speed={speed} />;
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
        />
      </div>
    );
  }

  return <div className="fixed inset-0 -z-10 bg-bg" />;
}
