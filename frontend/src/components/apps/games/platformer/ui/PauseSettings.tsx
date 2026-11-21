'use client';

import { useControls } from './controls';

/** Control settings in the pause card, saved per device. */
export function PauseSettings({ touch }: { touch: boolean }) {
  const [c, set] = useControls();
  if (!touch) return null;
  const row = 'flex min-h-11 w-full items-center justify-between gap-4 font-mono text-[12px] uppercase tracking-wider text-[#d8f8ff]';
  return (
    <div className="flex w-full max-w-[17rem] flex-col gap-1 border-t border-[#3df2ff]/30 pt-3">
      <label className={row}>
        Swap sides
        <input type="checkbox" checked={c.swap} onChange={(e) => set({ swap: e.target.checked })} className="h-5 w-5 accent-[#ff3d9a]" />
      </label>
      <label className={row}>
        Haptics
        <input type="checkbox" checked={c.haptics} onChange={(e) => set({ haptics: e.target.checked })} className="h-5 w-5 accent-[#ff3d9a]" />
      </label>
      <label className={row}>
        Controls
        <input
          type="range" min={30} max={100} step={5} value={Math.round(c.opacity * 100)}
          onChange={(e) => set({ opacity: Number(e.target.value) / 100 })}
          aria-label="Control opacity" className="w-28 accent-[#3df2ff]"
        />
      </label>
    </div>
  );
}
