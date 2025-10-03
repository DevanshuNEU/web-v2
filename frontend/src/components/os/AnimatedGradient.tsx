'use client';

import { useEffect, useRef } from 'react';

interface AnimatedGradientProps {
  colors: string[];
  speed: number;
}

export function AnimatedGradient({ colors, speed }: AnimatedGradientProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  
  return (
    <div 
      ref={canvasRef}
      className="absolute inset-0 w-full h-full transition-opacity duration-1000"
      style={{
        background: `linear-gradient(135deg, ${colors[0]} 0%, ${colors[1]} 50%, ${colors[2]} 100%)`,
        animation: `gradient-shift ${speed}s ease infinite`,
        backgroundSize: '400% 400%',
      }}
    >
      <style jsx>{`
        @keyframes gradient-shift {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
      `}</style>
    </div>
  );
}
