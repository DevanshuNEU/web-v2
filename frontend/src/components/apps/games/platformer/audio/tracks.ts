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
 *
 * One track per chapter of T's night trip, all in the same 80s night-drive
 * family: rooftops (Austin), trip (the airport and the red-eye), campus
 * (Northeastern after midnight), boston (night into sunrise) and boss (the
 * gorilla). caves, ruins and secret serve the old cartoon worlds.
 */

export type TrackId = 'rooftops' | 'caves' | 'ruins' | 'boss' | 'secret' | 'trip' | 'campus' | 'boston';

export type Note = readonly [step: number, midi: number, len: number, vel?: number];
export type Chord = readonly [step: number, notes: readonly number[], len: number, vel?: number];

export interface DrumBar { kick: string; snare: string; hat: string; tom?: string }

/**
 * soft: triangle plus a little saw, delayed vibrato. bell: music box.
 * pluck: triangle through a closing filter. chime: a round terminal chime.
 * stab: two detuned saws with a snappy filter, a synth brass hit.
 */
export type LeadStyle = 'soft' | 'bell' | 'pluck' | 'chime' | 'stab';

/** What a melodic voice needs to play a note. */
export interface VoiceSpec { style: LeadStyle; gain: number; vibrato: number }

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
    /** pad: two detuned oscillators (default). keys: an FM electric piano that strikes and decays. */
    voice?: 'pad' | 'keys';
    wave: OscillatorType;
    detune: number;   // cents, each of the two voices goes +/- this much
    cutoff: number;   // Hz, shared lowpass
    sway: number;     // slow filter LFO depth as a fraction of the cutoff
    attack: number;   // s
    release: number;  // s
    gain: number;     // per oscillator
    /** The lowpass opens to cutoff * bloom over the loop and closes in the last bar. */
    bloom?: number;
  };
  bass: {
    notes: readonly Note[];
    /** Replaces the last bar's bass on odd loops. Steps relative to that bar. */
    fill?: readonly Note[];
    /** The octave-up partial; triangle unless set. */
    upper?: OscillatorType;
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
    tom?: number;
    /** Snare and hat filter brightness; below 1 is dustier. */
    tone?: number;
    /** Vinyl crackle level in the drum layer, 0 or unset for none. */
    crackle?: number;
    /** Intensity at which the drums are fully in. */
    enter: number;
  };
  /** An arpeggio on its own layer, panned off the lead. */
  arp?: {
    notes: readonly Note[];
    style: LeadStyle;
    gain: number;
    vibrato: number;
    /** Intensity at which the arpeggio is fully in (0 = always on). */
    enter: number;
  };
  lead: VoiceSpec & {
    /** Phrases across the whole loop, picked by loop index. */
    phrases: readonly (readonly Note[])[];
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

/**
 * Arpeggiate chords: one note every `every` steps, picking chord tones by
 * `order` (indices into the chord, counted across the whole loop), shifted by
 * `shift` semitones. Velocity is `accent` on the beat, `soft` between.
 */
function arpeggiate(chords: readonly Chord[], every: number, order: readonly number[], shift: number, accent: number, soft: number): Note[] {
  const out: Note[] = [];
  for (const [start, notes, len] of chords) {
    for (let s = 0; s < len; s += every) {
      const at = start + s;
      const tone = notes[order[(at / every) % order.length] % notes.length];
      out.push([at, tone + shift, every, at % 4 === 0 ? accent : soft]);
    }
  }
  return out;
}

/** One chord per bar, each held for the whole bar. */
function bars(chords: readonly (readonly number[])[]): Chord[] {
  return chords.map((notes, bar) => [bar * 16, notes, 16] as Chord);
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
// The gorilla duel. E minor, 128 BPM, 8 bars, punchy and a little cocky:
// Em | Em | C | D | Em | Em | C | B7. The pad hits in 3 + 3 + 4 stabs and
// leaves the back half of each bar for the brass to talk back. The last bar
// trades the beat for chest-beat toms.

const EM = [52, 59, 64, 67], C_ = [52, 55, 60, 64], D_ = [54, 57, 62, 66], B7 = [51, 57, 59, 63];
const BOSS_CHORDS = [EM, EM, C_, D_, EM, EM, C_, B7];
const BOSS_ROOTS = [40, 40, 48, 50, 40, 40, 48, 47];

// A: call in bars 1, 3, 5, 7; answer in the back half of the next bar
const BOSS_A = phrase([
  [0, 0, 76, 2], [0, 3, 76, 1], [0, 4, 79, 2], [0, 8, 76, 2], [0, 10, 74, 4],
  [1, 8, 71, 2], [1, 10, 74, 2], [1, 12, 76, 4],
  [2, 0, 79, 2], [2, 3, 79, 1], [2, 4, 81, 2], [2, 8, 79, 2], [2, 10, 76, 4],
  [3, 8, 78, 2], [3, 10, 81, 2], [3, 12, 83, 4],
  [4, 0, 83, 2], [4, 3, 83, 1], [4, 4, 86, 2], [4, 8, 83, 2], [4, 10, 81, 4],
  [5, 8, 79, 2], [5, 10, 82, 2], [5, 12, 83, 4],
  [6, 0, 84, 4], [6, 4, 83, 4], [6, 8, 79, 4], [6, 12, 76, 4],
  [7, 0, 75, 6],
]);
// B: low and syncopated, crawling up chromatically
const BOSS_B = phrase([
  [0, 0, 64, 2], [0, 3, 67, 1], [0, 4, 64, 2], [0, 7, 62, 2], [0, 10, 64, 4],
  [1, 8, 67, 2], [1, 10, 69, 2], [1, 12, 70, 2], [1, 14, 71, 2],
  [2, 0, 72, 2], [2, 3, 72, 1], [2, 4, 71, 2], [2, 8, 67, 4],
  [3, 8, 69, 2], [3, 10, 71, 2], [3, 12, 74, 4],
  [4, 0, 76, 2], [4, 3, 76, 1], [4, 4, 79, 2], [4, 7, 76, 2], [4, 10, 74, 4],
  [5, 8, 79, 2], [5, 10, 81, 2], [5, 12, 82, 2], [5, 14, 83, 2],
  [6, 0, 84, 4], [6, 4, 83, 2], [6, 6, 79, 2], [6, 8, 76, 8],
  [7, 0, 75, 6],
]);

const boss: TrackDef = {
  id: 'boss',
  bpm: 128,
  bars: 8,
  swing: 0,
  level: 0.2,
  pad: {
    chords: BOSS_CHORDS.flatMap((ch, bar) => [
      [bar * 16, ch, 3, 1], [bar * 16 + 3, ch, 3, 0.75], [bar * 16 + 6, ch, 4, 0.9],
    ] as Chord[]),
    wave: 'sawtooth',
    detune: 12,
    cutoff: 1700,
    sway: 0.15,
    attack: 0.008,
    release: 0.18,
    gain: 0.022,
  },
  bass: {
    // the riff: root, a ghost, the octave, then up through the minor third, the fourth, the blue note and the fifth
    notes: perBar(BOSS_ROOTS, r => [
      [0, r, 2, 1], [2, r, 1, 0.55], [3, r + 12, 1, 0.7], [4, r, 2, 0.9], [6, r + 3, 2, 0.8],
      [8, r, 2, 0.95], [10, r + 5, 1, 0.7], [11, r + 6, 1, 0.75], [12, r + 7, 2, 0.85], [14, r + 10, 2, 0.8],
    ]),
    // chest beats on B, then down the scale to the E
    fill: [[0, 47, 2, 1], [4, 47, 2, 0.9], [8, 47, 1, 1], [9, 47, 1, 0.8], [10, 46, 2, 0.85], [12, 45, 2, 0.85], [14, 43, 2, 0.9]],
    upper: 'sawtooth',
    cutoff: 850,
    decay: 0.1,
    gain: 0.3,
  },
  drums: {
    beat: { kick: 'x.....x.x...x...', snare: '....x.......x...', hat: 'x-o-x-o-x-o-x-o-' },
    fills: [
      { kick: 'x.....x.x.......', snare: '....x...........', hat: 'x-o-x-o-........', tom: '........x.o.x.ox' },
      // the taunt: the band stops and the gorilla beats his chest
      { kick: 'x...............', snare: '................', hat: '................', tom: 'x.o.x.o.....x.o.' },
    ],
    drops: [],
    kick: 0.58,
    snare: 0.25,
    hat: 0.055,
    tom: 0.42,
    enter: 0.5,
  },
  lead: {
    // a loop off every fourth time round, so the riff can strut alone
    phrases: [BOSS_A, BOSS_B, BOSS_A, []],
    style: 'stab',
    gain: 0.04,
    vibrato: 0,
    enter: 1,
  },
  space: { echoSteps: 3, feedback: 0.22, echo: 0.16, reverb: 0.15, reverbSeconds: 1.6 },
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


// ---------------------------------------------------------------- trip
// Chapter 2: the airport at night, then a dream on the red-eye over moonlit
// clouds. D major, 88 BPM, 8 bars, floaty and wide:
// Dmaj9 | Bm9 | Gmaj9 | Asus2/4 | Dmaj9 | F#m7 | Gmaj9#11 | A6sus4
// Soft pluck arpeggios run the whole time; the lead is a round chime whose
// three-note motif (down a fifth, up a third, like a terminal announcement)
// comes back through every phrase.

const TRIP_CHORDS = [
  [61, 64, 66, 69], [61, 62, 66, 69], [59, 62, 66, 69], [59, 62, 64, 69],
  [61, 64, 66, 69], [57, 61, 64, 66], [59, 61, 66, 69], [59, 62, 64, 66],
];
const TRIP_ROOTS = [38, 47, 43, 45, 38, 42, 43, 45];
/** The terminal chime: A5, D5, F#5, a quarter note apart. */
const chime = (bar: number) => [[bar, 0, 81, 4], [bar, 4, 74, 4], [bar, 8, 78, 8]] as const;

const trip: TrackDef = {
  id: 'trip',
  bpm: 88,
  bars: 8,
  swing: 0,
  level: 0.2,
  pad: {
    chords: bars(TRIP_CHORDS),
    wave: 'sawtooth',
    detune: 9,
    cutoff: 900,
    sway: 0.45,
    attack: 1.1,
    release: 1.8,
    gain: 0.028,
  },
  bass: {
    notes: perBar(TRIP_ROOTS, r => [[0, r, 6, 0.9], [6, r, 2, 0.45], [8, r + 7, 6, 0.6], [14, r + 12, 2, 0.4]]),
    // A, C#, E: back home to D
    fill: [[0, 45, 6, 0.9], [8, 49, 4, 0.7], [12, 52, 4, 0.75]],
    cutoff: 520,
    decay: 0.4,
    gain: 0.3,
  },
  drums: {
    beat: { kick: 'x.........x.....', snare: '........x.......', hat: '..o...o...o...o.' },
    fills: [
      { kick: 'x.........x.....', snare: '........x.....o.', hat: '..o...o...o.O...' },
      // a breath before the loop comes round
      { kick: 'x...............', snare: '................', hat: '..............O.' },
    ],
    drops: [[4, 1, 4]],
    kick: 0.38,
    snare: 0.14,
    hat: 0.04,
    tone: 0.85,
    enter: 0.5,
  },
  arp: {
    notes: arpeggiate(bars(TRIP_CHORDS), 2, [0, 1, 2, 3, 1, 2, 3, 2], 12, 0.75, 0.45),
    style: 'pluck',
    gain: 0.042,
    vibrato: 0,
    enter: 0,
  },
  lead: {
    phrases: [
      // A: the chime, a reply, the chime again, a lift over the #11
      phrase([
        ...chime(0),
        [2, 4, 76, 2], [2, 6, 78, 2], [2, 8, 81, 6], [2, 14, 83, 2],
        [3, 0, 81, 4], [3, 4, 76, 8],
        ...chime(4),
        [5, 8, 73, 4], [5, 12, 76, 4],
        [6, 0, 78, 6], [6, 8, 81, 4], [6, 12, 85, 4],
        [7, 0, 83, 8], [7, 8, 81, 8, 0.7],
      ]),
      // B: high and drifting, the chime at the end like a boarding call
      phrase([
        [0, 8, 85, 4], [0, 12, 83, 4],
        [1, 0, 81, 8], [1, 10, 78, 2], [1, 12, 76, 4],
        [2, 0, 74, 8],
        [3, 8, 76, 4], [3, 12, 78, 4],
        [4, 0, 81, 12],
        [5, 8, 76, 4], [5, 12, 73, 4],
        [6, 0, 74, 4], [6, 4, 78, 4], [6, 8, 85, 8],
        ...chime(7),
      ]),
      // C: almost nothing, the chime and the clouds
      phrase([...chime(0), [3, 8, 76, 8, 0.6], ...chime(4), [6, 8, 85, 8, 0.6]]),
    ],
    style: 'chime',
    gain: 0.06,
    vibrato: 0,
    enter: 1,
  },
  space: { echoSteps: 3, feedback: 0.42, echo: 0.35, reverb: 0.38, reverbSeconds: 3 },
};

// ---------------------------------------------------------------- campus
// Chapter 3: Northeastern after midnight, brick and trolleys and the library.
// Lo-fi hip-hop in F major, 84 BPM, 8 bars, swung:
// Gm9 | C9 | Fmaj9 | Dm9 | Bbmaj9 | A7b13 | Dm9 | Gm9 C9sus4
// An FM electric piano comps, a walking bass takes every beat, dusty drums
// with vinyl crackle, and a music-box bell drops a few notes.

const CAMPUS_KEYS = [
  [58, 62, 65, 69], [58, 62, 64, 67], [57, 60, 64, 67], [60, 64, 65, 69],
  [57, 60, 62, 65], [55, 61, 65, 69], [60, 64, 65, 69],
];
/** Four quarter notes a bar, each bar walking into the next root. */
const CAMPUS_WALK = [
  [43, 46, 50, 47], [48, 45, 43, 42], [41, 45, 48, 51], [50, 48, 45, 47],
  [46, 50, 53, 44], [45, 49, 52, 51], [50, 53, 45, 44], [43, 46, 48, 44],
];
const CAMPUS_VEL = [0.9, 0.7, 0.8, 0.7];

const campus: TrackDef = {
  id: 'campus',
  bpm: 84,
  bars: 8,
  swing: 0.22,
  level: 0.2,
  pad: {
    // a strike on the one and a softer push on the "and" of three
    chords: [
      ...CAMPUS_KEYS.flatMap((ch, bar) => [[bar * 16, ch, 7, 0.9], [bar * 16 + 10, ch, 6, 0.6]] as Chord[]),
      [112, [58, 62, 65, 69], 7, 0.9],
      [120, [58, 62, 65, 67], 8, 0.75],
    ],
    voice: 'keys',
    wave: 'sine',
    detune: 3,
    cutoff: 2400,
    sway: 0.15,
    attack: 0.005,
    release: 0.45,
    gain: 0.05,
  },
  bass: {
    notes: CAMPUS_WALK.flatMap((walk, bar) => [
      ...walk.map((m, k) => [bar * 16 + k * 4, m, 3, CAMPUS_VEL[k]] as Note),
      // a swung ghost note on the even bars
      ...(bar % 2 === 0 ? [[bar * 16 + 7, walk[1], 1, 0.35] as Note] : []),
    ]),
    fill: [[0, 43, 3, 0.9], [4, 50, 3, 0.8], [8, 48, 3, 0.85], [11, 47, 1, 0.45], [12, 45, 2, 0.8], [14, 44, 2, 0.75]],
    cutoff: 520,
    decay: 0.28,
    gain: 0.32,
  },
  drums: {
    beat: { kick: 'x......x..x.....', snare: '....x.......x...', hat: 'x.o.x.o.x.o.x.oo' },
    fills: [
      { kick: 'x......x..x.....', snare: '....x.......x.-o', hat: 'x.o.x.o.x.o.O...' },
      // the needle lifts for a moment
      { kick: 'x...............', snare: '....x...........', hat: '................' },
    ],
    drops: [[4, 2, 4]],
    kick: 0.42,
    snare: 0.17,
    hat: 0.05,
    tone: 0.65,
    crackle: 0.05,
    enter: 0.5,
  },
  lead: {
    phrases: [
      phrase([
        [0, 4, 74, 2], [0, 6, 77, 2], [0, 8, 81, 6],
        [1, 6, 79, 2], [1, 8, 76, 6],
        [2, 0, 77, 4], [2, 10, 72, 2], [2, 12, 76, 4],
        [3, 0, 74, 8],
        [4, 4, 81, 2], [4, 6, 82, 2], [4, 8, 81, 4], [4, 12, 77, 4],
        [5, 0, 76, 4], [5, 4, 73, 4], [5, 8, 77, 8],
        [6, 6, 76, 2], [6, 8, 74, 8],
        [7, 8, 79, 4], [7, 12, 77, 4, 0.6],
      ]),
      phrase([
        [0, 8, 86, 4], [0, 12, 84, 4],
        [1, 8, 82, 8],
        [2, 4, 81, 4], [2, 8, 79, 8],
        [3, 12, 77, 4],
        [4, 8, 81, 4], [4, 12, 84, 4],
        [5, 4, 85, 8],
        [6, 0, 84, 4], [6, 4, 81, 8],
        [7, 8, 79, 8, 0.6],
      ]),
      // a loop of just keys, bass and drums: studying
      [],
    ],
    style: 'bell',
    gain: 0.055,
    vibrato: 0,
    enter: 1,
  },
  space: { echoSteps: 3, feedback: 0.3, echo: 0.25, reverb: 0.3, reverbSeconds: 2 },
};

// ---------------------------------------------------------------- boston
// Chapter 4: Boston nights into sunrise. A major and its relative F# minor,
// 104 BPM, 16 bars. The first eight are night (F#m9 | Dmaj9 | Aadd9 | E6 |
// F#m9 | Dmaj9 | Bm9 | Esus4 E), the last eight are morning, voiced higher
// (Dmaj9 | E6 | F#m9 | Aadd9 | Dmaj9 | Eadd9 | Aadd9 | Esus4 E). Eighth-note
// bass, sixteenth arpeggios, the lead climbs, and the pad filter opens across
// the loop like the sky getting lighter.

const BOSTON_CHORDS: Chord[] = [
  ...bars([
    [57, 61, 64, 68], [57, 61, 64, 66], [57, 59, 61, 64], [56, 59, 61, 64],
    [57, 61, 64, 68], [57, 61, 64, 66], [57, 61, 62, 66],
  ]),
  [112, [57, 59, 64, 66], 8], [120, [56, 59, 64, 66], 8],
  ...bars([
    [61, 64, 66, 69], [61, 64, 68, 71], [64, 68, 69, 73], [64, 69, 71, 73],
    [64, 66, 69, 73], [64, 66, 68, 71], [64, 69, 71, 73],
  ]).map(([s, n, l]) => [s + 128, n, l] as Chord),
  [240, [64, 66, 69, 71], 8], [248, [64, 66, 68, 71], 8],
];
const BOSTON_ROOTS = [42, 38, 45, 40, 42, 38, 47, 40, 38, 40, 42, 45, 38, 40, 45, 40];

const boston: TrackDef = {
  id: 'boston',
  bpm: 104,
  bars: 16,
  swing: 0,
  level: 0.2,
  pad: {
    chords: BOSTON_CHORDS,
    wave: 'sawtooth',
    detune: 8,
    cutoff: 1000,
    sway: 0.25,
    attack: 0.35,
    release: 1.1,
    gain: 0.026,
    bloom: 2.2,
  },
  bass: {
    notes: perBar(BOSTON_ROOTS, r => [
      [0, r, 2, 1], [2, r, 2, 0.6], [4, r, 2, 0.8], [6, r, 2, 0.6],
      [8, r, 2, 0.9], [10, r, 2, 0.6], [12, r + 12, 2, 0.7], [14, r, 2, 0.6],
    ]),
    // E, F#, G#, B, C#: up into the F# minor at the top
    fill: [[0, 40, 2, 1], [2, 40, 2, 0.6], [4, 42, 2, 0.8], [6, 42, 2, 0.6], [8, 44, 2, 0.85], [10, 44, 2, 0.6], [12, 47, 2, 0.8], [14, 49, 2, 0.85]],
    upper: 'sawtooth',
    cutoff: 700,
    decay: 0.14,
    gain: 0.3,
  },
  drums: {
    beat: { kick: 'x...x...x...x...', snare: '....x.......x...', hat: '-.x.-.x.-.x.-.x-' },
    fills: [
      { kick: 'x...x...x...x...', snare: '....x.....x.xoxx', hat: '-.x.-.x.-.x.O...' },
      { kick: 'x...x...x.x.x.x.', snare: '....x.......xxxx', hat: '-.x.-.x.-.x.....' },
    ],
    // on odd loops the drums hold their breath for the first bar of morning
    drops: [[2, 1, 8]],
    kick: 0.5,
    snare: 0.2,
    hat: 0.05,
    enter: 0.5,
  },
  arp: {
    notes: arpeggiate(BOSTON_CHORDS, 1, [0, 1, 2, 3, 1, 2, 3, 2, 0, 1, 2, 3, 2, 3, 1, 2], 12, 0.7, 0.4),
    style: 'pluck',
    gain: 0.03,
    vibrato: 0,
    enter: 0.5,
  },
  lead: {
    phrases: [
      // A: low and patient through the night, then up and up into the morning
      phrase([
        [0, 8, 73, 4], [0, 12, 76, 4],
        [1, 0, 78, 6], [1, 8, 76, 4], [1, 12, 73, 4],
        [2, 0, 76, 8], [2, 12, 71, 2], [2, 14, 73, 2],
        [3, 0, 71, 12],
        [4, 8, 73, 4], [4, 12, 76, 4],
        [5, 0, 78, 4], [5, 4, 81, 4], [5, 8, 78, 8],
        [6, 0, 76, 4], [6, 4, 78, 4], [6, 8, 74, 8],
        [7, 0, 76, 8], [7, 8, 80, 8],
        [8, 0, 81, 8], [8, 8, 78, 4], [8, 12, 81, 4],
        [9, 0, 83, 6], [9, 8, 80, 4], [9, 12, 83, 4],
        [10, 0, 85, 8], [10, 8, 81, 4], [10, 12, 85, 4],
        [11, 0, 88, 12],
        [12, 4, 86, 4], [12, 8, 85, 4], [12, 12, 83, 4],
        [13, 0, 85, 6], [13, 8, 88, 8],
        [14, 0, 88, 4], [14, 4, 90, 4], [14, 8, 88, 8],
        [15, 0, 85, 8], [15, 8, 83, 8, 0.7],
      ]),
      // B: the same climb, told in longer notes
      phrase([
        [0, 0, 69, 4], [0, 4, 73, 4], [0, 8, 76, 8],
        [1, 8, 78, 4], [1, 12, 76, 4],
        [2, 0, 73, 12],
        [3, 8, 71, 4], [3, 12, 73, 4],
        [4, 0, 69, 4], [4, 4, 73, 4], [4, 8, 76, 8],
        [5, 8, 81, 4], [5, 12, 78, 4],
        [6, 0, 76, 12],
        [7, 8, 80, 8],
        [8, 0, 81, 4], [8, 4, 85, 4], [8, 8, 81, 8],
        [9, 8, 83, 4], [9, 12, 85, 4],
        [10, 0, 88, 12],
        [11, 8, 85, 4], [11, 12, 88, 4],
        [12, 0, 90, 8], [12, 8, 88, 8],
        [13, 0, 85, 4], [13, 4, 88, 4], [13, 8, 90, 8],
        [14, 0, 88, 12],
        [15, 0, 83, 6], [15, 8, 85, 8, 0.7],
      ]),
      [],
    ],
    style: 'soft',
    gain: 0.065,
    vibrato: 9,
    enter: 1,
  },
  space: { echoSteps: 3, feedback: 0.35, echo: 0.3, reverb: 0.25, reverbSeconds: 2.4 },
};

export const TRACKS: Readonly<Record<TrackId, TrackDef>> = { rooftops, caves, ruins, boss, secret, trip, campus, boston };
export const TRACK_IDS = Object.keys(TRACKS) as TrackId[];
