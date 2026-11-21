/**
 * Step sequencer for one track on one bus. It knows nothing about timers:
 * `scheduleUntil(t)` schedules every step that starts before `t`. The live
 * music calls it on a 25 ms timer with a 100 ms lookahead; an offline render
 * calls it once for the whole span. Same code either way.
 */

import { TRACKS, type DrumBar, type Note, type TrackDef, type TrackId, type Chord } from './tracks';
import { bassNote, crackle, createBus, disposeBus, hat, kick, leadNote, padNote, snare, tom, type Bus } from './voices';

const BAR = 16;
const RING = 32;
/** Tempo moves at most this much per step, so 1 to 1.25 takes 8 steps (two beats). */
const TEMPO_STEP = 0.25 / 8;
/** Seconds a layer keeps scheduling after it is turned off, so it fades out instead of cutting. */
const LAYER_TAIL = 1.5;
const EMPTY: readonly Note[] = [];

interface Kit { kick: Float32Array; snare: Float32Array; hat: Float32Array; tom: Float32Array; open: Uint8Array }
interface Compiled {
  steps: number;
  chords: (Chord | undefined)[];
  bass: (readonly Note[])[];
  bassFill: (readonly Note[])[] | null;
  lead: (readonly Note[])[][];
  arp: (readonly Note[])[] | null;
  beat: Kit | null;
  fills: Kit[];
}

const VEL: Record<string, number> = { x: 1, o: 0.55, '-': 0.3, O: 0.8 };

function kit(bar: DrumBar): Kit {
  const k: Kit = {
    kick: new Float32Array(BAR), snare: new Float32Array(BAR), hat: new Float32Array(BAR), tom: new Float32Array(BAR), open: new Uint8Array(BAR),
  };
  for (let s = 0; s < BAR; s++) {
    k.kick[s] = VEL[bar.kick[s]] ?? 0;
    k.snare[s] = VEL[bar.snare[s]] ?? 0;
    k.hat[s] = VEL[bar.hat[s]] ?? 0;
    k.tom[s] = bar.tom ? VEL[bar.tom[s]] ?? 0 : 0;
    k.open[s] = bar.hat[s] === 'O' ? 1 : 0;
  }
  return k;
}

function byStep(notes: readonly Note[], steps: number): (readonly Note[])[] {
  const out: Note[][] = [];
  for (let i = 0; i < steps; i++) out.push([]);
  for (const n of notes) out[n[0] % steps].push(n);
  return out.map(a => (a.length ? a : EMPTY));
}

function compile(t: TrackDef): Compiled {
  const steps = t.bars * BAR;
  const chords: (Chord | undefined)[] = new Array(steps).fill(undefined);
  for (const c of t.pad.chords) chords[c[0]] = c;
  return {
    steps,
    chords,
    bass: byStep(t.bass.notes, steps),
    bassFill: t.bass.fill ? byStep(t.bass.fill, BAR) : null,
    lead: t.lead.phrases.map(p => byStep(p, steps)),
    arp: t.arp ? byStep(t.arp.notes, steps) : null,
    beat: t.drums ? kit(t.drums.beat) : null,
    fills: t.drums ? t.drums.fills.map(kit) : [],
  };
}

const compiled = new Map<TrackId, Compiled>();
function compiledTrack(id: TrackId): Compiled {
  let c = compiled.get(id);
  if (!c) { c = compile(TRACKS[id]); compiled.set(id, c); }
  return c;
}

function clamp01(x: number) { return x < 0 ? 0 : x > 1 ? 1 : x; }

/** Layer gain for an intensity: silent a quarter below `enter`, full at `enter`. */
export function layerLevel(intensity: number, enter: number): number {
  return enter <= 0 ? 1 : clamp01((intensity - enter + 0.25) / 0.25);
}

export interface Player {
  readonly id: TrackId;
  readonly bus: Bus;
  /** Start time of the next step not yet scheduled. */
  readonly nextTime: number;
  /** Schedule every step starting before `until`. If the clock jumped past us (`now`), skip ahead. */
  scheduleUntil(until: number, now?: number): void;
  setTempo(mul: number): void;
  setIntensity(x: number, now: number): void;
  beat(now: number): number;
  fadeIn(at: number, seconds: number): void;
  fadeOut(at: number, seconds: number): void;
  dispose(): void;
}

export interface PlayerOptions { startAt: number; tempo?: number; intensity?: number }

export function createPlayer(ctx: BaseAudioContext, dest: AudioNode, id: TrackId, opts: PlayerOptions): Player {
  const track = TRACKS[id];
  const c = compiledTrack(id);
  const base = 60 / track.bpm / 4;
  let tempo = opts.tempo ?? 1;
  let target = tempo;
  let stepDur = base / tempo;
  const bus = createBus(ctx, dest, track, stepDur);

  let next = opts.startAt;
  let step = 0;
  let loop = 0;

  let drumLevel = 0, leadLevel = 0, arpLevel = 0;
  let drumUntil = -Infinity, leadUntil = -Infinity, arpUntil = -Infinity;

  const ringTime = new Float64Array(RING).fill(Infinity);
  const ringDur = new Float64Array(RING);
  const ringStep = new Int32Array(RING);
  let ringAt = 0;

  function applyIntensity(x: number, now: number, instant: boolean) {
    const d = track.drums ? layerLevel(x, track.drums.enter) : 0;
    const l = layerLevel(x, track.lead.enter);
    const a = track.arp ? layerLevel(x, track.arp.enter) : 0;
    if (drumLevel > 0 && d === 0) drumUntil = now + LAYER_TAIL;
    if (leadLevel > 0 && l === 0) leadUntil = now + LAYER_TAIL;
    if (arpLevel > 0 && a === 0) arpUntil = now + LAYER_TAIL;
    drumLevel = d; leadLevel = l; arpLevel = a;
    if (instant) {
      bus.drumLayer.gain.value = d;
      bus.leadLayer.gain.value = l;
      if (bus.arpLayer) bus.arpLayer.gain.value = a;
    } else {
      bus.drumLayer.gain.setTargetAtTime(d, now, 0.25);
      bus.leadLayer.gain.setTargetAtTime(l, now, 0.25);
      bus.arpLayer?.gain.setTargetAtTime(a, now, 0.25);
    }
  }
  applyIntensity(clamp01(opts.intensity ?? 1), opts.startAt, true);

  function dropped(bar: number): boolean {
    const drops = track.drums!.drops;
    for (let i = 0; i < drops.length; i++) {
      const [mod, rem, b] = drops[i];
      if (b === bar && loop % mod === rem) return true;
    }
    return false;
  }

  function scheduleStep(i: number, t: number, sd: number) {
    const bar = (i / BAR) | 0;
    const s = i % BAR;
    const last = bar === track.bars - 1;
    const tt = s & 1 ? t + track.swing * sd : t;

    // the pad filter opens over the loop and closes again in the last bar
    const bloom = track.pad.bloom;
    if (i === 0 && bloom && bloom !== 1) {
      const f = bus.padFilter.frequency, cut = track.pad.cutoff, span = c.steps * sd;
      f.cancelScheduledValues(t);
      f.setValueAtTime(cut, t);
      f.linearRampToValueAtTime(cut * bloom, t + span * (track.bars - 1) / track.bars);
      f.linearRampToValueAtTime(cut, t + span);
    }

    const chord = c.chords[i];
    if (chord) {
      const notes = chord[1], vel = chord[3] ?? 1;
      for (let k = 0; k < notes.length; k++) padNote(bus, track.pad, notes[k], t, chord[2] * sd, vel);
    }

    const bl = last && c.bassFill && loop % 2 === 1 ? c.bassFill[s] : c.bass[i];
    for (let k = 0; k < bl.length; k++) {
      const n = bl[k];
      bassNote(bus, track.bass, n[1], tt, n[2] * sd * 0.92, n[3] ?? 1);
    }

    const drums = track.drums;
    if (drums && c.beat && (drumLevel > 0 || t < drumUntil) && !dropped(bar)) {
      const k = last && c.fills.length ? c.fills[loop % c.fills.length] : c.beat;
      const tone = drums.tone ?? 1;
      if (k.kick[s]) kick(bus, tt, drums.kick * k.kick[s]);
      if (k.snare[s]) snare(bus, tt, drums.snare * k.snare[s], tone);
      if (k.hat[s]) hat(bus, tt, drums.hat * k.hat[s], k.open[s] === 1, tone);
      if (k.tom[s] && drums.tom) tom(bus, tt, drums.tom * k.tom[s]);
      if (s === 0 && drums.crackle) crackle(bus, t, BAR * sd, drums.crackle);
    }

    const arp = track.arp;
    if (arp && c.arp && (arpLevel > 0 || t < arpUntil)) {
      const an = c.arp[i];
      for (let k = 0; k < an.length; k++) {
        const n = an[k];
        leadNote(bus, arp, n[1], tt, n[2] * sd * 0.9, n[3] ?? 1, bus.arp!);
      }
    }

    if (c.lead.length && (leadLevel > 0 || t < leadUntil)) {
      const ln = c.lead[loop % c.lead.length][i];
      for (let k = 0; k < ln.length; k++) {
        const n = ln[k];
        leadNote(bus, track.lead, n[1], tt, n[2] * sd * 0.9, n[3] ?? 1);
      }
    }
  }

  return {
    id,
    bus,
    get nextTime() { return next; },

    scheduleUntil(until: number, now = until) {
      if (next < now - 0.15) next = now + 0.02; // the clock jumped (tab throttled): skip, do not burst
      while (next < until) {
        scheduleStep(step, next, stepDur);
        ringTime[ringAt] = next; ringDur[ringAt] = stepDur; ringStep[ringAt] = step;
        ringAt = (ringAt + 1) % RING;
        next += stepDur;
        if (tempo !== target) {
          const d = target - tempo;
          tempo += Math.abs(d) <= TEMPO_STEP ? d : Math.sign(d) * TEMPO_STEP;
          stepDur = base / tempo;
          bus.delay.delayTime.setTargetAtTime(track.space.echoSteps * stepDur, next, 0.2);
        }
        step++;
        if (step >= c.steps) { step = 0; loop++; }
      }
    },

    setTempo(mul: number) { target = mul; },

    setIntensity(x: number, now: number) { applyIntensity(clamp01(x), now, false); },

    beat(now: number) {
      let best = -1, bt = -Infinity;
      for (let k = 0; k < RING; k++) {
        const tk = ringTime[k];
        if (tk <= now && tk > bt) { bt = tk; best = k; }
      }
      if (best < 0) return 0;
      const frac = Math.min(0.999, (now - bt) / ringDur[best]);
      return Math.min(0.9999, ((ringStep[best] % 4) + frac) / 4);
    },

    fadeIn(at: number, seconds: number) {
      const g = bus.out.gain;
      g.cancelScheduledValues(at);
      g.setValueAtTime(0, at);
      g.linearRampToValueAtTime(track.level, at + Math.max(0.01, seconds));
    },

    fadeOut(at: number, seconds: number) {
      const g = bus.out.gain;
      const v = g.value;
      g.cancelScheduledValues(at);
      g.setValueAtTime(v, at);
      g.linearRampToValueAtTime(0, at + Math.max(0.01, seconds));
    },

    dispose() { disposeBus(bus); },
  };
}
