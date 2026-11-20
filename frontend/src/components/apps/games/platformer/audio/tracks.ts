/**
 * Music for Main Character, as data. One step is a 16th note, 16 steps a bar.
 *
 * Notes are MIDI numbers (60 is middle C). A Note is [step, midi, length in
 * steps, velocity]. Drum bars are 16 character strings: 'x' full, 'o' soft,
 * '-' ghost, 'O' open hat, '.' rest.
 *
 * Variation so a loop survives a five minute session: lead phrases rotate by
 * loop, the last bar takes a drum fill that rotates by loop, the bass has a
 * walk-up for the last bar on odd loops, and `drops` silences the drums for a
 * bar on some loops.
 */

export type TrackId = 'rooftops' | 'caves' | 'ruins' | 'boss' | 'secret';

export type Note = readonly [step: number, midi: number, len: number, vel?: number];
export type Chord = readonly [step: number, notes: readonly number[], len: number];

export interface DrumBar { kick: string; snare: string; hat: string }

export type LeadStyle = 'soft' | 'bell' | 'pluck';

export interface TrackDef {
  id: TrackId;
  bpm: number;
  bars: number;
  /** Delay on odd 16ths, as a fraction of a step (lo-fi swing). */
  swing: number;
  /** Bus output gain relative to the arcade master. Never above 0.25. */
  level: number;
  pad: {
    chords: readonly Chord[];
    wave: OscillatorType;
    detune: number;   // cents, each of the two voices goes +/- this much
    cutoff: number;   // Hz, shared lowpass
    sway: number;     // slow filter LFO depth as a fraction of the cutoff
    attack: number;   // s
    release: number;  // s
    gain: number;     // per oscillator
  };
  bass: {
    notes: readonly Note[];
    /** Replaces the last bar's bass on odd loops. Steps relative to that bar. */
    fill?: readonly Note[];
    cutoff: number;
    decay: number;
    gain: number;
  };
  drums?: {
    beat: DrumBar;
    /** Last bar of the loop, picked by loop index. */
    fills: readonly DrumBar[];
    /** [mod, rem, bar]: drums are silent in `bar` when loop % mod === rem. */
    drops: readonly (readonly [mod: number, rem: number, bar: number])[];
    kick: number;
    snare: number;
    hat: number;
    /** Intensity at which the drums are fully in. */
    enter: number;
  };
  lead: {
    /** Phrases across the whole loop, picked by loop index. */
    phrases: readonly (readonly Note[])[];
    style: LeadStyle;
    gain: number;
    vibrato: number;  // cents
    /** Intensity at which the lead is fully in (0 = always on). */
    enter: number;
  };
  space: {
    echoSteps: number;  // delay time in steps
    feedback: number;
    echo: number;       // lead send into the delay
    reverb: number;     // pad and lead send into the room
    reverbSeconds: number;
  };
}

/** Repeat a one-bar figure over the given roots, one root per bar. */
function perBar(roots: readonly number[], figure: (root: number) => readonly Note[]): Note[] {
  const out: Note[] = [];
  roots.forEach((r, bar) => {
    for (const [s, m, len, vel] of figure(r)) out.push([bar * 16 + s, m, len, vel]);
  });
  return out;
}

/** Offset phrase notes written as [bar, step in bar, midi, len, vel]. */
function phrase(notes: readonly (readonly [number, number, number, number, number?])[]): Note[] {
  return notes.map(([bar, s, m, len, vel]) => [bar * 16 + s, m, len, vel ?? 0.85] as Note);
}

// ---------------------------------------------------------------- rooftops
// Night synthwave and lo-fi, A minor, 100 BPM, 8 bars:
// Am9 | Fmaj9 | Cmaj7 | G6 | Am9 | Fmaj9 | Dm9 | Esus4 E7

const ROOF_ROOTS = [45, 41, 48, 43, 45, 41, 38, 40];

const rooftops: TrackDef = {
  id: 'rooftops',
  bpm: 100,
  bars: 8,
  swing: 0.1,
  level: 0.2,
  pad: {
    chords: [
      [0, [60, 64, 67, 71], 16],
      [16, [57, 60, 64, 67], 16],
      [32, [55, 59, 60, 64], 16],
      [48, [55, 59, 62, 64], 16],
      [64, [60, 64, 67, 71], 16],
      [80, [57, 60, 64, 67], 16],
      [96, [53, 57, 60, 64], 16],
      [112, [57, 59, 62, 64], 8],
      [120, [56, 59, 62, 64], 8],
    ],
    wave: 'sawtooth',
    detune: 7,
    cutoff: 1100,
    sway: 0.35,
    attack: 0.55,
    release: 0.9,
    gain: 0.032,
  },
  bass: {
    notes: perBar(ROOF_ROOTS, r => [
      [0, r, 3, 1], [3, r, 1, 0.5], [6, r, 2, 0.8], [8, r, 2, 0.9], [11, r + 12, 1, 0.45], [14, r + 7, 2, 0.7],
    ]),
    // E walk-up back to A: E G# B D E
    fill: [[0, 40, 3, 1], [6, 40, 2, 0.8], [8, 44, 2, 0.8], [10, 47, 2, 0.8], [12, 50, 2, 0.85], [14, 52, 2, 0.9]],
    cutoff: 650,
    decay: 0.22,
    gain: 0.34,
  },
  drums: {
    beat: { kick: 'x.......x.x.....', snare: '....x.......x...', hat: 'o.x.o.x.o.x.o.xo' },
    fills: [
      { kick: 'x.......x.x.....', snare: '....x.....o.x.ox', hat: 'o.x.o.x.o.x.O...' },
      // the drop: one kick, then air for the bass walk-up and the lead pickup
      { kick: 'x...............', snare: '................', hat: '................' },
    ],
    drops: [[4, 2, 4]],
    kick: 0.5,
    snare: 0.2,
    hat: 0.06,
    enter: 0.5,
  },
  lead: {
    phrases: [
      // A: the hook
      phrase([
        [0, 6, 76, 2], [0, 8, 79, 4], [0, 12, 76, 4],
        [1, 2, 74, 2], [1, 4, 72, 6],
        [2, 8, 71, 2], [2, 10, 72, 2], [2, 12, 76, 4],
        [3, 0, 74, 8],
        [4, 6, 76, 2], [4, 8, 79, 4], [4, 12, 81, 4],
        [5, 0, 79, 4], [5, 4, 76, 6],
        [6, 8, 74, 2], [6, 10, 72, 2], [6, 12, 69, 4],
        [7, 0, 71, 6], [7, 8, 68, 4, 0.7],
      ]),
      // B: the answer, lower and sparser
      phrase([
        [0, 10, 72, 2], [0, 12, 71, 2], [0, 14, 69, 6],
        [1, 8, 72, 4], [1, 12, 74, 4],
        [2, 4, 76, 8],
        [3, 8, 79, 2, 0.7], [3, 10, 76, 2, 0.7], [3, 12, 74, 4],
        [5, 4, 72, 4], [5, 8, 76, 4], [5, 12, 77, 4],
        [6, 0, 76, 8], [6, 12, 74, 4],
        [7, 0, 71, 4], [7, 4, 74, 4], [7, 8, 76, 8, 0.75],
      ]),
      // C: the hook again, thinned out, ending up high
      phrase([
        [0, 8, 79, 4], [0, 12, 76, 4],
        [1, 4, 72, 8],
        [2, 12, 76, 4],
        [3, 0, 74, 8],
        [4, 8, 79, 4], [4, 12, 81, 4],
        [5, 0, 84, 6, 0.7], [5, 8, 83, 4, 0.7],
        [6, 12, 81, 4],
        [7, 0, 80, 8, 0.7],
      ]),
      // rest: a loop with no lead at all, so the hook stays fresh
      [],
    ],
    style: 'soft',
    gain: 0.07,
    vibrato: 9,
    enter: 1,
  },
  space: { echoSteps: 3, feedback: 0.36, echo: 0.32, reverb: 0.22, reverbSeconds: 2.2 },
};

// ---------------------------------------------------------------- caves
// Sparse and echoing. D minor, 80 BPM: Dm9 | Bbmaj7 | Gm9 | A7sus4

const caves: TrackDef = {
  id: 'caves',
  bpm: 80,
  bars: 4,
  swing: 0,
  level: 0.2,
  pad: {
    chords: [
      [0, [53, 57, 60, 64], 16],
      [16, [53, 57, 62, 65], 16],
      [32, [57, 58, 62, 65], 16],
      [48, [55, 57, 62, 64], 16],
    ],
    wave: 'triangle',
    detune: 5,
    cutoff: 800,
    sway: 0.4,
    attack: 1.2,
    release: 2,
    gain: 0.05,
  },
  bass: {
    notes: perBar([38, 46, 43, 45], r => [[0, r, 12, 0.8], [12, r + 12, 4, 0.35]]),
    cutoff: 450,
    decay: 0.5,
    gain: 0.3,
  },
  drums: {
    beat: { kick: 'x...............', snare: '............o...', hat: '........-.......' },
    fills: [{ kick: 'x.......x.......', snare: '..........o...o.', hat: '........-...-...' }],
    drops: [],
    kick: 0.35,
    snare: 0.1,
    hat: 0.04,
    enter: 0.5,
  },
  lead: {
    phrases: [
      phrase([[0, 4, 74, 2], [0, 10, 81, 2], [1, 4, 77, 4], [2, 2, 76, 2], [2, 8, 72, 4], [3, 6, 69, 6]]),
      phrase([[0, 8, 77, 2], [1, 0, 81, 4], [1, 10, 79, 2], [2, 4, 74, 4], [3, 0, 76, 2], [3, 8, 74, 6]]),
    ],
    style: 'pluck',
    gain: 0.09,
    vibrato: 0,
    enter: 0.5,
  },
  space: { echoSteps: 6, feedback: 0.55, echo: 0.5, reverb: 0.45, reverbSeconds: 3.2 },
};

// ---------------------------------------------------------------- ruins
// Warm, F major, 90 BPM: Fmaj9 | C/E | Dm9 | Bbmaj9

const ruins: TrackDef = {
  id: 'ruins',
  bpm: 90,
  bars: 4,
  swing: 0.08,
  level: 0.2,
  pad: {
    chords: [
      [0, [57, 60, 64, 67], 16],
      [16, [55, 60, 64, 67], 16],
      [32, [53, 57, 60, 64], 16],
      [48, [57, 60, 62, 65], 16],
    ],
    wave: 'sawtooth',
    detune: 6,
    cutoff: 1300,
    sway: 0.3,
    attack: 0.45,
    release: 1,
    gain: 0.03,
  },
  bass: {
    notes: perBar([41, 40, 38, 46], r => [[0, r, 4, 1], [6, r, 2, 0.7], [8, r + 7, 4, 0.85], [14, r + 12, 2, 0.6]]),
    cutoff: 700,
    decay: 0.25,
    gain: 0.32,
  },
  drums: {
    beat: { kick: 'x.......x.......', snare: '....o.......o...', hat: '-o-o-o-o-o-o-o-o' },
    fills: [{ kick: 'x.......x...x...', snare: '....o.......o.oo', hat: '-o-o-o-o-o-o-O..' }],
    drops: [[4, 3, 2]],
    kick: 0.45,
    snare: 0.2,
    hat: 0.05,
    enter: 0.5,
  },
  lead: {
    phrases: [
      phrase([[0, 0, 81, 4], [0, 4, 79, 2], [0, 6, 77, 6], [1, 4, 76, 2], [1, 6, 79, 6], [2, 0, 77, 4], [2, 4, 81, 4], [2, 8, 84, 8], [3, 4, 82, 4], [3, 8, 81, 8]]),
      phrase([[0, 8, 84, 4], [0, 12, 86, 4], [1, 0, 84, 8], [2, 0, 81, 4], [2, 4, 77, 4], [2, 8, 76, 4], [3, 0, 74, 6], [3, 8, 77, 8]]),
    ],
    style: 'soft',
    gain: 0.065,
    vibrato: 8,
    enter: 1,
  },
  space: { echoSteps: 3, feedback: 0.3, echo: 0.25, reverb: 0.3, reverbSeconds: 2.4 },
};

// ---------------------------------------------------------------- boss
// Driving. E minor, 132 BPM: Em | C | D | B

const BOSS_ROOTS = [40, 48, 50, 47];
const BOSS_TONES = [[76, 79, 83, 79], [76, 79, 84, 79], [74, 78, 81, 78], [75, 78, 83, 78]];

const boss: TrackDef = {
  id: 'boss',
  bpm: 132,
  bars: 4,
  swing: 0,
  level: 0.2,
  pad: {
    chords: [
      [0, [55, 59, 64, 67], 16],
      [16, [55, 60, 64, 67], 16],
      [32, [54, 57, 62, 66], 16],
      [48, [54, 59, 63, 66], 16],
    ],
    wave: 'sawtooth',
    detune: 9,
    cutoff: 1500,
    sway: 0.25,
    attack: 0.15,
    release: 0.4,
    gain: 0.026,
  },
  bass: {
    notes: perBar(BOSS_ROOTS, r => [
      [0, r, 2, 1], [2, r, 2, 0.7], [4, r, 2, 0.85], [6, r + 12, 2, 0.6],
      [8, r, 2, 0.9], [10, r, 2, 0.7], [12, r, 2, 0.85], [14, r + 12, 2, 0.6],
    ]),
    fill: [[0, 47, 2, 1], [2, 47, 2, 0.7], [4, 47, 2, 0.85], [6, 59, 2, 0.6], [8, 50, 2, 0.9], [10, 51, 2, 0.8], [12, 52, 2, 0.85], [14, 54, 2, 0.9]],
    cutoff: 800,
    decay: 0.12,
    gain: 0.32,
  },
  drums: {
    beat: { kick: 'x...x...x...x...', snare: '....x.......x...', hat: 'o-x-o-x-o-x-o-x-' },
    fills: [{ kick: 'x...x...x...x...', snare: '....x.....x.xxxx', hat: 'o-x-o-x-o-x-O...' }],
    drops: [],
    kick: 0.55,
    snare: 0.24,
    hat: 0.06,
    enter: 0.5,
  },
  lead: {
    phrases: [
      perBar([0, 1, 2, 3], bar => BOSS_TONES[bar].flatMap((m, k) => [[k * 4, m, 2, 0.8], [k * 4 + 2, m - 12, 2, 0.55]] as Note[])),
    ],
    style: 'soft',
    gain: 0.055,
    vibrato: 5,
    enter: 1,
  },
  space: { echoSteps: 3, feedback: 0.25, echo: 0.2, reverb: 0.15, reverbSeconds: 1.6 },
};

// ---------------------------------------------------------------- secret
// Gentle music box. C major, 72 BPM: Cmaj9 | Am9 | Fmaj9 | Gadd9

const SECRET_ARPS = [[72, 76, 79, 83], [69, 72, 76, 79], [69, 72, 76, 79], [71, 74, 79, 81]];

const secret: TrackDef = {
  id: 'secret',
  bpm: 72,
  bars: 4,
  swing: 0,
  level: 0.2,
  pad: {
    chords: [
      [0, [64, 67, 71, 74], 16],
      [16, [60, 64, 67, 71], 16],
      [32, [57, 60, 64, 67], 16],
      [48, [59, 62, 67, 69], 16],
    ],
    wave: 'triangle',
    detune: 4,
    cutoff: 900,
    sway: 0.3,
    attack: 1,
    release: 1.6,
    gain: 0.035,
  },
  bass: {
    notes: perBar([48, 45, 41, 43], r => [[0, r, 8, 0.7], [8, r + 7, 8, 0.5]]),
    cutoff: 400,
    decay: 0.6,
    gain: 0.24,
  },
  lead: {
    phrases: [
      perBar([0, 1, 2, 3], bar => {
        const a = SECRET_ARPS[bar];
        return [[0, a[0] + 12, 4, 0.8], [2, a[1] + 12, 2, 0.5], [4, a[2] + 12, 2, 0.6], [6, a[3] + 12, 2, 0.5], [8, a[2] + 12, 4, 0.7], [12, a[1] + 12, 4, 0.5]] as Note[];
      }),
      phrase([[0, 0, 88, 4], [0, 4, 86, 4], [0, 8, 84, 8], [1, 0, 84, 4], [1, 4, 83, 4], [1, 8, 81, 8], [2, 0, 81, 4], [2, 4, 84, 4], [2, 8, 88, 8], [3, 0, 86, 6], [3, 8, 83, 4], [3, 12, 79, 4]]),
    ],
    style: 'bell',
    gain: 0.09,
    vibrato: 0,
    enter: 0,
  },
  space: { echoSteps: 6, feedback: 0.3, echo: 0.22, reverb: 0.4, reverbSeconds: 2.8 },
};

export const TRACKS: Readonly<Record<TrackId, TrackDef>> = { rooftops, caves, ruins, boss, secret };
export const TRACK_IDS = Object.keys(TRACKS) as TrackId[];
