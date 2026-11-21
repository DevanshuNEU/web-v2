/**
 * Synth voices and the per-track bus. Every note is a handful of Web Audio
 * nodes that start from silence and decay to silence, so nothing clicks; the
 * last node of each note is disconnected when its source ends.
 *
 * Bus, per track:
 *   pad notes  -> lowpass (slow LFO sway, optional bloom) -> pad -+-> room send
 *   bass notes -> bass ------------------------+
 *   drum notes -> drums / hats (pan) -> drum layer (vinyl crackle rides the hats)
 *   lead notes -> lead layer -> pan ------------+-> echo send, room send
 *   arp notes  -> arp layer -> pan -------------+-> echo send, room send
 *   echo: delay -> lowpass -> feedback, return
 *   room: generated impulse response convolver
 *   mix -> highpass 28 Hz (no DC, no rumble) -> gentle compressor -> out -> master
 */

import type { LeadStyle, TrackDef, VoiceSpec } from './tracks';

type Ctx = BaseAudioContext;

const FREQ = new Float64Array(128);
for (let i = 0; i < 128; i++) FREQ[i] = 440 * Math.pow(2, (i - 69) / 12);
export function hz(midi: number): number { return FREQ[midi & 127]; }

const SILENT = 0.0001;

// ------------------------------------------------------------ cleanup
// One shared handler and a WeakMap: no closure per note.
const tails = new WeakMap<AudioScheduledSourceNode, AudioNode>();
function ended(this: AudioScheduledSourceNode) {
  const tail = tails.get(this);
  if (tail) { tails.delete(this); tail.disconnect(); }
  this.disconnect();
}
/** When `src` ends, disconnect `tail` (the note's node wired into the bus). */
function release(src: AudioScheduledSourceNode, tail: AudioNode) {
  tails.set(src, tail);
  src.onended = ended;
}

// ------------------------------------------------------------ shared buffers
/** Deterministic noise, so offline renders repeat exactly. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const noiseCache = new WeakMap<Ctx, AudioBuffer>();
function noiseBuffer(ctx: Ctx): AudioBuffer {
  let b = noiseCache.get(ctx);
  if (!b) {
    const len = ctx.sampleRate;
    b = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = b.getChannelData(0);
    const r = rng(7);
    for (let i = 0; i < len; i++) d[i] = r() * 2 - 1;
    noiseCache.set(ctx, b);
  }
  return b;
}
/** Vinyl crackle: sparse clicks of random size over a faint hiss, two seconds that loop. */
const crackleCache = new WeakMap<Ctx, AudioBuffer>();
function crackleBuffer(ctx: Ctx): AudioBuffer {
  let b = crackleCache.get(ctx);
  if (!b) {
    const sr = ctx.sampleRate;
    const len = sr * 2;
    b = ctx.createBuffer(1, len, sr);
    const d = b.getChannelData(0);
    const r = rng(23);
    let click = 0, size = 0;
    for (let i = 0; i < len; i++) {
      if (click <= 0 && r() < 18 / sr) { click = 1; size = 0.2 + 0.8 * r() * r(); }
      const pop = click > 0.01 ? (r() * 2 - 1) * size * click : 0;
      click *= 0.86;
      d[i] = pop + (r() * 2 - 1) * 0.015;
    }
    // fade the ends so the loop seam is silent
    const edge = Math.min(len >> 1, Math.floor(sr * 0.005));
    for (let i = 0; i < edge; i++) { const k = i / edge; d[i] *= k; d[len - 1 - i] *= k; }
    crackleCache.set(ctx, b);
  }
  return b;
}

let noiseAt = 0;
function noiseOffset(): number { noiseAt = (noiseAt + 0.3819) % 0.7; return noiseAt; }

const roomCache = new WeakMap<Ctx, Map<number, AudioBuffer>>();
/** A stereo room: decaying noise, darker as it fades, energy normalised to 1. */
function roomBuffer(ctx: Ctx, seconds: number): AudioBuffer {
  let byLen = roomCache.get(ctx);
  if (!byLen) { byLen = new Map(); roomCache.set(ctx, byLen); }
  let b = byLen.get(seconds);
  if (!b) {
    const sr = ctx.sampleRate;
    const len = Math.floor(sr * seconds);
    b = ctx.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      const r = rng(11 + ch);
      let lp = 0, energy = 0;
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        const decay = Math.exp(-6.9 * t / seconds);
        const k = 0.6 - 0.5 * (t / seconds); // one-pole lowpass closing over time
        lp += k * ((r() * 2 - 1) - lp);
        const fadeIn = Math.min(1, t / 0.004);
        d[i] = lp * decay * fadeIn;
        energy += d[i] * d[i];
      }
      const norm = energy > 0 ? 1 / Math.sqrt(energy) : 0;
      for (let i = 0; i < len; i++) d[i] *= norm;
    }
    byLen.set(seconds, b);
  }
  return b;
}

// ------------------------------------------------------------ bus
export interface Bus {
  ctx: Ctx;
  out: GainNode;
  pad: AudioNode;
  padFilter: BiquadFilterNode;
  bass: AudioNode;
  drums: AudioNode;
  hats: AudioNode;
  lead: AudioNode;
  /** The arpeggio input, null for a track with no arpeggio. */
  arp: AudioNode | null;
  drumLayer: GainNode;
  leadLayer: GainNode;
  arpLayer: GainNode | null;
  delay: DelayNode;
  nodes: AudioNode[];
  lfo: OscillatorNode;
}

function gain(ctx: Ctx, v: number): GainNode { const g = ctx.createGain(); g.gain.value = v; return g; }

function filter(ctx: Ctx, type: BiquadFilterType, freq: number, q = 0.7): BiquadFilterNode {
  const f = ctx.createBiquadFilter();
  f.type = type; f.frequency.value = freq; f.Q.value = q;
  return f;
}

function pan(ctx: Ctx, v: number): AudioNode {
  if (typeof ctx.createStereoPanner !== 'function') return gain(ctx, 1);
  const p = ctx.createStereoPanner(); p.pan.value = v; return p;
}

export function createBus(ctx: Ctx, dest: AudioNode, track: TrackDef, stepSeconds: number): Bus {
  const nodes: AudioNode[] = [];
  const keep = <T extends AudioNode>(n: T): T => { nodes.push(n); return n; };

  const out = keep(gain(ctx, 0));
  const comp = keep(ctx.createDynamicsCompressor());
  comp.threshold.value = -14; comp.knee.value = 12; comp.ratio.value = 2.5;
  comp.attack.value = 0.012; comp.release.value = 0.25;
  const hp = keep(filter(ctx, 'highpass', 28));
  const mix = keep(gain(ctx, 1));
  mix.connect(hp); hp.connect(comp); comp.connect(out); out.connect(dest);

  // room
  const roomSend = keep(gain(ctx, track.space.reverb));
  const room = keep(ctx.createConvolver());
  room.buffer = roomBuffer(ctx, track.space.reverbSeconds);
  roomSend.connect(room); room.connect(mix);

  // echo
  const echoSend = keep(gain(ctx, track.space.echo));
  const delay = keep(ctx.createDelay(2));
  delay.delayTime.value = track.space.echoSteps * stepSeconds;
  const echoTone = keep(filter(ctx, 'lowpass', 2400));
  const echoLow = keep(filter(ctx, 'highpass', 220));
  const feedback = keep(gain(ctx, track.space.feedback));
  const echoPan = keep(pan(ctx, 0.25));
  echoSend.connect(delay); delay.connect(echoTone); echoTone.connect(echoLow);
  echoLow.connect(feedback); feedback.connect(delay);
  echoLow.connect(echoPan); echoPan.connect(mix);

  // pad with a slow filter sway
  const padFilter = keep(filter(ctx, 'lowpass', track.pad.cutoff, 0.6));
  const pad = keep(gain(ctx, 1));
  padFilter.connect(pad); pad.connect(mix); pad.connect(roomSend);
  const lfo = keep(ctx.createOscillator());
  lfo.type = 'sine'; lfo.frequency.value = 0.055;
  const lfoDepth = keep(gain(ctx, track.pad.cutoff * track.pad.sway));
  lfo.connect(lfoDepth); lfoDepth.connect(padFilter.frequency);
  lfo.start();

  const bass = keep(gain(ctx, 1));
  bass.connect(mix);

  const drumLayer = keep(gain(ctx, 0));
  const drums = keep(gain(ctx, 1));
  const hats = keep(pan(ctx, 0.2));
  drums.connect(drumLayer); hats.connect(drumLayer); drumLayer.connect(mix);

  const leadLayer = keep(gain(ctx, 0));
  const leadPan = keep(pan(ctx, -0.12));
  leadLayer.connect(leadPan); leadPan.connect(mix);
  leadLayer.connect(echoSend); leadLayer.connect(roomSend);

  let arpLayer: GainNode | null = null;
  if (track.arp) {
    arpLayer = keep(gain(ctx, 0));
    const arpPan = keep(pan(ctx, 0.3));
    const arpSend = keep(gain(ctx, 0.6));
    arpLayer.connect(arpPan); arpPan.connect(mix);
    arpLayer.connect(arpSend); arpSend.connect(echoSend); arpSend.connect(roomSend);
  }

  return {
    ctx, out, pad: padFilter, padFilter, bass, drums, hats, lead: leadLayer, arp: arpLayer,
    drumLayer, leadLayer, arpLayer, delay, nodes, lfo,
  };
}

export function disposeBus(bus: Bus) {
  try { bus.lfo.stop(); } catch { /* already stopped */ }
  for (const n of bus.nodes) n.disconnect();
  bus.nodes.length = 0;
}

// ------------------------------------------------------------ voices
function osc(ctx: Ctx, type: OscillatorType, f: number, detune: number, to: AudioNode, t: number, end: number): OscillatorNode {
  const o = ctx.createOscillator();
  o.type = type; o.frequency.value = f; o.detune.value = detune;
  o.connect(to); o.start(t); o.stop(end);
  return o;
}

/** Attack, hold, exponential release. Returns the time the note is silent. */
function ahr(p: AudioParam, t: number, attack: number, peak: number, holdEnd: number, rel: number): number {
  p.setValueAtTime(0, t);
  p.linearRampToValueAtTime(peak, t + attack);
  p.setValueAtTime(peak, holdEnd);
  p.exponentialRampToValueAtTime(SILENT, holdEnd + rel);
  return holdEnd + rel;
}

/** Two detuned oscillators, slow attack, long release, through the bus lowpass. */
export function padNote(bus: Bus, spec: TrackDef['pad'], midi: number, t: number, dur: number, vel: number) {
  if (spec.voice === 'keys') { keysNote(bus, spec, midi, t, dur, vel); return; }
  const c = bus.ctx;
  const env = c.createGain(); env.gain.value = 0;
  const a = Math.min(spec.attack, dur * 0.8);
  const end = ahr(env.gain, t, a, spec.gain * vel, t + dur, spec.release) + 0.03;
  const f = hz(midi);
  const o = osc(c, spec.wave, f, -spec.detune, env, t, end);
  osc(c, spec.wave, f, spec.detune, env, t, end);
  env.connect(bus.pad);
  release(o, env);
}

/**
 * An FM electric piano: a sine carrier, a sine modulator at the same pitch
 * whose depth starts bright and settles (the bark of the tine), and an
 * amplitude that strikes, decays toward a soft sustain, and lets go.
 */
function keysNote(bus: Bus, spec: TrackDef['pad'], midi: number, t: number, dur: number, vel: number) {
  const c = bus.ctx;
  const f = hz(midi);
  const peak = spec.gain * vel;
  const env = c.createGain(); env.gain.value = 0;
  const p = env.gain;
  const atk = Math.max(0.003, spec.attack);
  p.setValueAtTime(0, t);
  p.linearRampToValueAtTime(peak, t + atk);
  const settle = Math.max(t + atk + 0.01, t + dur);
  p.exponentialRampToValueAtTime(peak * Math.max(0.25, 1 - dur * 0.6), settle);
  p.exponentialRampToValueAtTime(SILENT, settle + spec.release);
  const end = settle + spec.release + 0.03;

  const depth = c.createGain(); depth.gain.value = 0;
  depth.gain.setValueAtTime(f * 1.6 * (0.6 + 0.4 * vel), t);
  depth.gain.exponentialRampToValueAtTime(f * 0.18, t + 0.5);
  const o = osc(c, 'sine', f, spec.detune, env, t, end);
  osc(c, 'sine', f, -spec.detune, depth, t, end);
  depth.connect(o.frequency);
  env.connect(bus.pad);
  release(o, env);
}

/** A round sine with a triangle an octave up (so phone speakers hear the pitch), plucked filter. */
export function bassNote(bus: Bus, spec: TrackDef['bass'], midi: number, t: number, dur: number, vel: number) {
  const c = bus.ctx;
  const f = hz(midi);
  const peak = spec.gain * vel;
  const env = c.createGain(); env.gain.value = 0;
  const p = env.gain;
  const atk = 0.006;
  p.setValueAtTime(0, t);
  p.linearRampToValueAtTime(peak, t + atk);
  let off: number;
  if (dur > atk + spec.decay) {
    p.exponentialRampToValueAtTime(peak * 0.5, t + atk + spec.decay);
    p.setValueAtTime(peak * 0.5, t + dur);
    off = t + dur;
  } else {
    off = t + Math.max(dur, atk + 0.01);
    p.setValueAtTime(peak, off);
  }
  p.exponentialRampToValueAtTime(SILENT, off + 0.09);
  const end = off + 0.12;

  const lp = c.createBiquadFilter();
  lp.type = 'lowpass'; lp.Q.value = 0.8;
  lp.frequency.setValueAtTime(spec.cutoff * 2.2, t);
  lp.frequency.exponentialRampToValueAtTime(spec.cutoff, t + spec.decay);
  const upper = c.createGain(); upper.gain.value = 0.5;
  const o = osc(c, 'sine', f, 0, env, t, end);
  osc(c, spec.upper ?? 'triangle', f * 2, 0, upper, t, end);
  upper.connect(lp); lp.connect(env);
  env.connect(bus.bass);
  release(o, env);
}

/** Sine with a fast pitch drop. */
export function kick(bus: Bus, t: number, level: number) {
  const c = bus.ctx;
  const env = c.createGain(); env.gain.value = 0;
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(level, t + 0.004);
  env.gain.exponentialRampToValueAtTime(SILENT, t + 0.42);
  const o = c.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(170, t);
  o.frequency.exponentialRampToValueAtTime(46, t + 0.12);
  o.connect(env); env.connect(bus.drums);
  o.start(t); o.stop(t + 0.45);
  release(o, env);
}

function noiseBurst(bus: Bus, to: AudioNode, t: number, level: number, decay: number, type: BiquadFilterType, freq: number, q: number) {
  const c = bus.ctx;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c);
  const f = filter(c, type, freq, q);
  const env = c.createGain(); env.gain.value = 0;
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(level, t + 0.0015);
  env.gain.exponentialRampToValueAtTime(SILENT, t + decay);
  src.connect(f); f.connect(env); env.connect(to);
  src.start(t, noiseOffset(), decay + 0.03);
  release(src, env);
}

/** A hollow tom (or a chest beat): a sine that drops in pitch, a touch of skin noise. */
export function tom(bus: Bus, t: number, level: number) {
  const c = bus.ctx;
  const env = c.createGain(); env.gain.value = 0;
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(level, t + 0.003);
  env.gain.exponentialRampToValueAtTime(SILENT, t + 0.3);
  const o = c.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(150, t);
  o.frequency.exponentialRampToValueAtTime(82, t + 0.16);
  o.connect(env); env.connect(bus.drums);
  o.start(t); o.stop(t + 0.32);
  release(o, env);
  noiseBurst(bus, bus.drums, t, level * 0.18, 0.05, 'bandpass', 900, 1.2);
}

/** Vinyl crackle for one bar: the shared loop, faded in and out so bar seams are silent. */
export function crackle(bus: Bus, t: number, dur: number, level: number) {
  const c = bus.ctx;
  const src = c.createBufferSource();
  src.buffer = crackleBuffer(c);
  src.loop = true;
  const f = filter(c, 'highpass', 1200, 0.5);
  const env = c.createGain(); env.gain.value = 0;
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(level, t + 0.02);
  env.gain.setValueAtTime(level, t + dur);
  env.gain.linearRampToValueAtTime(0, t + dur + 0.02);
  src.connect(f); f.connect(env); env.connect(bus.hats);
  src.start(t, noiseOffset() * 2);
  src.stop(t + dur + 0.03);
  release(src, env);
}

/** Bandpassed noise with a short triangle body. `tone` below 1 is dustier. */
export function snare(bus: Bus, t: number, level: number, tone = 1) {
  noiseBurst(bus, bus.drums, t, level, 0.2 + 0.08 * (1 - tone), 'bandpass', 1800 * tone, 0.9);
  const c = bus.ctx;
  const env = c.createGain(); env.gain.value = 0;
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(level * 0.5, t + 0.002);
  env.gain.exponentialRampToValueAtTime(SILENT, t + 0.1);
  const o = c.createOscillator();
  o.type = 'triangle';
  o.frequency.setValueAtTime(190, t);
  o.frequency.exponentialRampToValueAtTime(140, t + 0.06);
  o.connect(env); env.connect(bus.drums);
  o.start(t); o.stop(t + 0.12);
  release(o, env);
}

/** Highpassed noise, closed or open. `tone` below 1 is dustier. */
export function hat(bus: Bus, t: number, level: number, open: boolean, tone = 1) {
  noiseBurst(bus, bus.hats, t, level, open ? 0.24 : 0.05, tone < 1 ? 'bandpass' : 'highpass', 7200 * tone, tone < 1 ? 0.9 : 0.7);
}

/**
 * A melodic note into `to` (the lead or the arpeggio layer): soft (triangle
 * plus a little saw, delayed vibrato), bell (music box), pluck (cave drip),
 * chime (a round terminal chime) or stab (synth brass).
 */
export function leadNote(bus: Bus, spec: VoiceSpec, midi: number, t: number, dur: number, vel: number, to: AudioNode = bus.lead) {
  const c = bus.ctx;
  const f = hz(midi);
  const peak = spec.gain * vel;
  const env = c.createGain(); env.gain.value = 0;
  const style: LeadStyle = spec.style;

  if (style === 'bell') {
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(peak, t + 0.003);
    env.gain.exponentialRampToValueAtTime(SILENT, t + 1.6);
    const end = t + 1.65;
    const tine = c.createGain(); tine.gain.value = 0;
    tine.gain.setValueAtTime(0, t);
    tine.gain.linearRampToValueAtTime(0.3, t + 0.002);
    tine.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    const o = osc(c, 'sine', f, 0, env, t, end);
    osc(c, 'sine', f * 4, 0, tine, t, end);
    tine.connect(env);
    env.connect(to);
    release(o, env);
    return;
  }

  if (style === 'chime') {
    // a sine and a quiet octave-and-a-fifth that fades first: an announcement chime
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(peak, t + 0.006);
    env.gain.exponentialRampToValueAtTime(peak * 0.4, t + 0.35);
    env.gain.exponentialRampToValueAtTime(SILENT, t + 2.4);
    const end = t + 2.45;
    const over = c.createGain(); over.gain.value = 0;
    over.gain.setValueAtTime(0, t);
    over.gain.linearRampToValueAtTime(0.22, t + 0.004);
    over.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
    const o = osc(c, 'sine', f, 0, env, t, end);
    osc(c, 'sine', f * 3, 0, over, t, end);
    over.connect(env);
    env.connect(to);
    release(o, env);
    return;
  }

  if (style === 'stab') {
    // two detuned saws, a filter that snaps shut, short release: brass with attitude
    const end = ahr(env.gain, t, 0.005, peak, t + dur, 0.12) + 0.03;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass'; lp.Q.value = 2;
    lp.frequency.setValueAtTime(3400, t);
    lp.frequency.exponentialRampToValueAtTime(950, t + 0.16);
    const o = osc(c, 'sawtooth', f, -10, lp, t, end);
    osc(c, 'sawtooth', f, 10, lp, t, end);
    lp.connect(env); env.connect(to);
    release(o, env);
    return;
  }

  if (style === 'pluck') {
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(peak, t + 0.004);
    env.gain.exponentialRampToValueAtTime(SILENT, t + 0.9);
    const end = t + 0.95;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass'; lp.Q.value = 1.2;
    lp.frequency.setValueAtTime(3200, t);
    lp.frequency.exponentialRampToValueAtTime(700, t + 0.3);
    const o = osc(c, 'triangle', f, 0, lp, t, end);
    lp.connect(env); env.connect(to);
    release(o, env);
    return;
  }

  const end = ahr(env.gain, t, Math.min(0.02, dur * 0.5), peak, t + dur, 0.35) + 0.03;
  const lp = filter(c, 'lowpass', 2400, 0.5);
  const saw = c.createGain(); saw.gain.value = 0.22;
  const o = osc(c, 'triangle', f, 0, lp, t, end);
  const o2 = osc(c, 'sawtooth', f, 6, saw, t, end);
  saw.connect(lp); lp.connect(env); env.connect(to);
  if (spec.vibrato > 0) {
    const vib = c.createOscillator();
    vib.type = 'sine'; vib.frequency.value = 5.3;
    const depth = c.createGain(); depth.gain.value = 0;
    depth.gain.setValueAtTime(0, t + 0.15);
    depth.gain.linearRampToValueAtTime(spec.vibrato, t + 0.45);
    vib.connect(depth); depth.connect(o.detune); depth.connect(o2.detune);
    vib.start(t); vib.stop(end);
  }
  release(o, env);
}
