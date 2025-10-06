'use client';

import Image from 'next/image';
import { useTheme } from '@/store/themeStore';

export function AnimatedBackground() {
  const { wallpaper } = useTheme();
  
  if (wallpaper && wallpaper.type === 'static' && wallpaper.imageUrl) {
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
  
  // Fallback to solid color
  return <div className="fixed inset-0 w-full h-full -z-10 bg-bg" />;
}
