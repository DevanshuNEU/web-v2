/**
 * Music for Main Character: generated in the browser, no files.
 *
 * Off until the player turns on the arcade Sound toggle, and it follows that
 * toggle: off stops it, on resumes whatever track the game last asked for.
 * Notes are scheduled about 100 ms ahead on a 25 ms timer (never from
 * requestAnimationFrame), so frame hitches never reach the audio.
 */

import { arcadeAudio, onArcadeSoundChange } from '../../shared/sound';
import { createPlayer, type Player } from './sequencer';
import type { TrackId } from './tracks';

export type { TrackId } from './tracks';

export interface Music {
  play(track: TrackId): void;   // starts or crossfades; no-op while sound is off
  stop(): void;
  setTempo(mul: number): void;  // 1 normal, 1.25 during Aura Mode; ramps, no clicks
  setIntensity(x: number): void; // 0..1, adds layers (drums, bass, lead)
  beat(): number;                // current beat phase 0..1 for visual pulses, 0 when stopped
  dispose(): void;
}

export interface MusicDeps {
  audio?: () => { ctx: AudioContext; master: GainNode } | null;
  onSoundChange?: (cb: (on: boolean) => void) => () => void;
}

export const LOOKAHEAD = 0.1;
export const TICK_MS = 25;
const FADE_IN = 0.6;
const CROSSFADE = 1.5;
const FADE_OUT = 0.25;
const QUICK_OUT = 0.08;

export function createMusic(deps: MusicDeps = {}): Music {
  const getAudio = deps.audio ?? arcadeAudio;
  const onSound = deps.onSoundChange ?? onArcadeSoundChange;

  let wanted: TrackId | null = null;
  let player: Player | null = null;
  let ctx: AudioContext | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;
  let tempo = 1;
  let intensity = 1;
  let disposed = false;

  function tick() {
    if (!player || !ctx) return;
    const now = ctx.currentTime;
    player.scheduleUntil(now + LOOKAHEAD, now);
  }

  /** Fade a player out, then tear its bus down. */
  function retire(p: Player, at: number, seconds: number) {
    p.fadeOut(at, seconds);
    setTimeout(() => p.dispose(), (seconds + 0.25) * 1000);
  }

  function start(track: TrackId) {
    const a = getAudio();
    if (!a) return;
    if (player && ctx !== a.ctx) { player.dispose(); player = null; } // the context was replaced
    if (player && player.id === track) return;
    const now = a.ctx.currentTime;
    const fade = player ? CROSSFADE : FADE_IN;
    if (player) retire(player, now, CROSSFADE);
    ctx = a.ctx;
    player = createPlayer(a.ctx, a.master, track, { startAt: now + 0.05, tempo, intensity });
    player.fadeIn(now, fade);
    if (!timer) timer = setInterval(tick, TICK_MS);
    tick();
  }

  function halt(seconds: number) {
    if (timer) { clearInterval(timer); timer = null; }
    if (player && ctx) retire(player, ctx.currentTime, seconds);
    player = null;
  }

  const unsubscribe = onSound(on => {
    if (disposed) return;
    if (!on) halt(QUICK_OUT);
    else if (wanted) start(wanted);
  });

  // A hidden tab throttles timers to about once a second, which would stutter:
  // stop while hidden and pick the track back up when visible again.
  const doc = typeof document !== 'undefined' ? document : null;
  const onVisibility = () => {
    if (disposed || !doc) return;
    if (doc.hidden) halt(QUICK_OUT);
    else if (wanted) start(wanted);
  };
  doc?.addEventListener('visibilitychange', onVisibility);

  return {
    play(track) {
      if (disposed) return;
      wanted = track;
      start(track);
    },
    stop() {
      wanted = null;
      halt(FADE_OUT);
    },
    setTempo(mul) {
      tempo = Number.isFinite(mul) ? Math.min(2, Math.max(0.5, mul)) : 1;
      player?.setTempo(tempo);
    },
    setIntensity(x) {
      intensity = Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : 1;
      if (player && ctx) player.setIntensity(intensity, ctx.currentTime);
    },
    beat() {
      return player && ctx ? player.beat(ctx.currentTime) : 0;
    },
    dispose() {
      if (disposed) return;
      wanted = null;
      halt(QUICK_OUT);
      unsubscribe();
      doc?.removeEventListener('visibilitychange', onVisibility);
      disposed = true;
    },
  };
}
