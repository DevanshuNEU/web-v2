/**
 * Sound Effects — Web Audio API synthetic sounds.
 * No audio files needed. All tones are generated programmatically.
 *
 * Off by default. User can toggle in Preferences.
 */

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!audioCtx || audioCtx.state === 'closed') {
      audioCtx = new AudioContext();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

function tone(
  freq: number,
  startAt: number,
  duration: number,
  volume = 0.05,
  type: OscillatorType = 'sine',
) {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    osc.type = type;
    gain.gain.setValueAtTime(volume, ctx.currentTime + startAt);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + startAt + duration);
    osc.start(ctx.currentTime + startAt);
    osc.stop(ctx.currentTime + startAt + duration + 0.05);
  } catch {
    // AudioContext not available
  }
}

// Sound library
const SOUNDS = {
  windowOpen() {
    tone(523.25, 0,    0.07, 0.04); // C5
    tone(659.25, 0.06, 0.07, 0.04); // E5
    tone(783.99, 0.12, 0.10, 0.03); // G5
  },
  windowClose() {
    tone(523.25, 0,    0.08, 0.04); // C5
    tone(392.00, 0.07, 0.12, 0.03); // G4
  },
  notify() {
    tone(880.00, 0,    0.08, 0.05); // A5
    tone(1108.7, 0.09, 0.12, 0.04); // C#6
  },
  error() {
    tone(220.00, 0,    0.08, 0.04, 'sawtooth');
    tone(196.00, 0.07, 0.12, 0.03, 'sawtooth');
  },
  bootChime() {
    tone(261.63, 0,    0.5, 0.04); // C4
    tone(329.63, 0.1,  0.5, 0.03); // E4
    tone(392.00, 0.2,  0.5, 0.03); // G4
    tone(523.25, 0.3,  0.6, 0.04); // C5
  },
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'devos-sound-enabled';

export function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  // Default: OFF (subtle but user must opt in)
  return localStorage.getItem(STORAGE_KEY) === 'true';
}

export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
  // Warm up AudioContext on enable (browsers need user gesture)
  if (enabled) getCtx();
}

export type SoundName = keyof typeof SOUNDS;

export function playSound(name: SoundName): void {
  if (!isSoundEnabled()) return;
  SOUNDS[name]?.();
}
