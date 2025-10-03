'use client';

import { useTheme } from '@/store/themeStore';

export function AnimatedBackground() {
  const { mode } = useTheme();
  
  return (
    <div className="fixed inset-0 w-full h-full -z-10 bg-bg">
      {/* Simple solid background - uses theme colors */}
      {/* Users can later add custom wallpaper images here */}
    </div>
  );
}
