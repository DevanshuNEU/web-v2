'use client';

import { useEffect, useState } from 'react';
import { Signal, Wifi, BatteryFull } from 'lucide-react';

/**
 * iOS-style status bar. Time on the left, signal/wifi/battery on the right.
 * Sits in the safe-area-top region of the phone shell.
 */
export default function StatusBar({ light = true }: { light?: boolean }) {
  const [time, setTime] = useState<string>(() => formatTime(new Date()));

  useEffect(() => {
    const tick = () => setTime(formatTime(new Date()));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  // `light` = rendered over the (always-dark) phone wallpaper → white for legibility
  // in both palettes. Otherwise the bar sits on the app surface and derives its ink
  // from the semantic `--color-text` token, so it adapts to mono/color automatically.
  const color = light ? 'text-white' : 'text-text';

  return (
    <div className={`flex items-center justify-between px-6 h-11 text-[15px] font-semibold ${color} select-none`}>
      <span className="tabular-nums">{time}</span>
      <div className="flex items-center gap-1.5">
        <Signal size={14} strokeWidth={2.5} />
        <Wifi size={14} strokeWidth={2.5} />
        <BatteryFull size={20} strokeWidth={2} />
      </div>
    </div>
  );
}

function formatTime(d: Date): string {
  const h = d.getHours();
  const m = d.getMinutes();
  const hh = ((h + 11) % 12) + 1;
  return `${hh}:${m.toString().padStart(2, '0')}`;
}
