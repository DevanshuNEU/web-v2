/**
 * Arcade sound effects, synthesized with Web Audio. No files to download.
 *
 * Off by default (it is a portfolio; nobody wants a surprise noise on a
 * train). The toggle is remembered in localStorage and shared by every game
 * through a tiny external store, so useSyncExternalStore keeps all toggles in
 * step.
 */

import { useSyncExternalStore } from 'react';

const KEY = 'devos-arcade-sound';
const listeners = new Set<() => void>();
let ctx: AudioContext | null = null;
let master: GainNode | null = null;

function read(): boolean {
  if (typeof window === 'undefined') return false;
  try { return localStorage.getItem(KEY) === 'on'; } catch { return false; }
}

let enabled = read();

export function isArcadeSoundOn(): boolean { return enabled; }

export function setArcadeSound(on: boolean) {
  enabled = on;
  try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch { /* private mode */ }
  // iOS only lets audio start inside a user gesture: the toggle tap is one.
  if (on) audio();
  listeners.forEach(l => l());
}

function subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; }

export function useArcadeSound(): [boolean, (on: boolean) => void] {
  const on = useSyncExternalStore(subscribe, isArcadeSoundOn, () => false);
  return [on, setArcadeSound];
}

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!ctx || ctx.state === 'closed') {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, at: number, dur: number, vol = 0.08, type: OscillatorType = 'square', slideTo?: number) {
  const a = audio(); if (!a || !master) return;
  const t0 = a.currentTime + at;
  const osc = a.createOscillator(); const g = a.createGain();
  osc.type = type; osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g); g.connect(master);
  osc.start(t0); osc.stop(t0 + dur + 0.02);
}

function noise(at: number, dur: number, vol = 0.08) {
  const a = audio(); if (!a || !master) return;
  const len = Math.max(1, Math.floor(a.sampleRate * dur));
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = a.createBufferSource(); const g = a.createGain();
  src.buffer = buf; g.gain.value = vol;
  src.connect(g); g.connect(master);
  src.start(a.currentTime + at);
}

const SFX = {
  tap:    () => tone(660, 0, 0.05, 0.05, 'triangle'),
  eat:    () => { tone(520, 0, 0.06, 0.07); tone(780, 0.05, 0.08, 0.06); },
  coin:   () => { tone(988, 0, 0.06, 0.06); tone(1319, 0.06, 0.16, 0.06); },
  jump:   () => tone(300, 0, 0.16, 0.06, 'square', 620),
  stomp:  () => { tone(180, 0, 0.1, 0.09, 'square', 90); noise(0, 0.08, 0.06); },
  bump:   () => tone(140, 0, 0.08, 0.08, 'triangle', 110),
  power:  () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.06, 0.1, 0.06)),
  hurt:   () => tone(400, 0, 0.3, 0.08, 'sawtooth', 120),
  drop:   () => tone(240, 0, 0.07, 0.07, 'triangle', 180),
  perfect:() => { tone(784, 0, 0.07, 0.06); tone(1175, 0.06, 0.14, 0.06); },
  slice:  () => noise(0, 0.07, 0.05),
  merge:  (level = 1) => { const f = 330 * Math.pow(1.12, level); tone(f, 0, 0.08, 0.07); tone(f * 1.5, 0.06, 0.12, 0.06); },
  slide:  () => tone(200, 0, 0.05, 0.03, 'triangle', 260),
  combo:  (n = 1) => tone(440 * Math.pow(1.06, Math.min(n, 16)), 0, 0.1, 0.06),
  over:   () => [392, 330, 262, 196].forEach((f, i) => tone(f, i * 0.12, 0.16, 0.07, 'triangle')),
  win:    () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.09, 0.18, 0.06)),
  // "vine boom" energy without the sample: a low thud with noise
  boom:   () => { tone(110, 0, 0.5, 0.14, 'sine', 40); noise(0, 0.12, 0.08); },
} as const;

export type SfxName = keyof typeof SFX;

/** Play a sound if the player turned sound on. Safe to call anywhere. */
export function sfx(name: SfxName, arg?: number) {
  if (!enabled) return;
  try { (SFX[name] as (a?: number) => void)(arg); } catch { /* audio unavailable */ }
}

/** Short vibration where supported (Android Chrome). iOS Safari ignores it. */
export function buzz(pattern: number | number[] = 10) {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
  try { navigator.vibrate(pattern); } catch { /* not allowed */ }
}
