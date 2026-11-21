/**
 * Touch control settings, saved per device: swap sides (left-handed),
 * control opacity, haptics, and whether the first-run controls overlay has
 * been seen. Versioned; anything unreadable falls back to the defaults.
 */

import { useEffect, useState } from 'react';

export const CONTROLS_KEY = 'devos-mc-controls';

export interface ControlsSettings { swap: boolean; opacity: number; haptics: boolean; seenIntro: boolean }

export const DEFAULT_CONTROLS: ControlsSettings = { swap: false, opacity: 0.85, haptics: true, seenIntro: false };

export function loadControls(): ControlsSettings {
  try {
    const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(CONTROLS_KEY);
    if (!raw) return { ...DEFAULT_CONTROLS };
    const o = JSON.parse(raw) as Partial<ControlsSettings> & { v?: number };
    if (!o || typeof o !== 'object' || o.v !== 1) return { ...DEFAULT_CONTROLS };
    const op = typeof o.opacity === 'number' && Number.isFinite(o.opacity) ? Math.min(1, Math.max(0.3, o.opacity)) : DEFAULT_CONTROLS.opacity;
    return {
      swap: typeof o.swap === 'boolean' ? o.swap : DEFAULT_CONTROLS.swap,
      opacity: op,
      haptics: typeof o.haptics === 'boolean' ? o.haptics : DEFAULT_CONTROLS.haptics,
      seenIntro: typeof o.seenIntro === 'boolean' ? o.seenIntro : DEFAULT_CONTROLS.seenIntro,
    };
  } catch {
    return { ...DEFAULT_CONTROLS };
  }
}

const listeners = new Set<(c: ControlsSettings) => void>();

export function saveControls(c: ControlsSettings) {
  try { localStorage.setItem(CONTROLS_KEY, JSON.stringify({ v: 1, ...c })); } catch { /* private mode */ }
  listeners.forEach(l => l(c));
}

/** The settings, live: every component using it sees a change at once. */
export function useControls(): [ControlsSettings, (patch: Partial<ControlsSettings>) => void] {
  const [c, setC] = useState<ControlsSettings>(() => loadControls());
  useEffect(() => {
    listeners.add(setC);
    return () => { listeners.delete(setC); };
  }, []);
  const update = (patch: Partial<ControlsSettings>) => saveControls({ ...loadControls(), ...patch });
  return [c, update];
}

/** A short buzz where vibration exists. */
export function buzzPress(on: boolean, ms = 8) {
  if (!on) return;
  try { (navigator as Navigator & { vibrate?: (p: number) => boolean }).vibrate?.(ms); } catch { /* not supported */ }
}
