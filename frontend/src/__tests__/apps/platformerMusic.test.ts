import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createMusic, LOOKAHEAD, TICK_MS, type TrackId } from '@/components/apps/games/platformer/audio/music';
import { TRACKS, TRACK_IDS } from '@/components/apps/games/platformer/audio/tracks';
import { createPlayer, layerLevel } from '@/components/apps/games/platformer/audio/sequencer';
import { trackForTheme } from '@/components/apps/games/platformer/audio/themes';

// ---------------------------------------------------------------- a fake Web Audio graph

class FakeParam {
  value: number;
  events: { kind: string; value: number; time: number }[] = [];
  constructor(v = 0) { this.value = v; }
  private push(kind: string, value: number, time: number) { this.events.push({ kind, value, time }); return this; }
  setValueAtTime(v: number, t: number) { return this.push('set', v, t); }
  linearRampToValueAtTime(v: number, t: number) { return this.push('linear', v, t); }
  exponentialRampToValueAtTime(v: number, t: number) { return this.push('exp', v, t); }
  setTargetAtTime(v: number, t: number) { return this.push('target', v, t); }
  cancelScheduledValues(t: number) { return this.push('cancel', 0, t); }
}

class FakeNode {
  outputs = new Set<unknown>();
  disconnected = 0;
  constructor(public ctx: FakeContext, public kind: string) { ctx.nodes.push(this); }
  connect(to: unknown) { this.outputs.add(to); return to; }
  disconnect() { this.outputs.clear(); this.disconnected++; }
}

class FakeSource extends FakeNode {
  startAt = -1;
  stopAt = Infinity;
  onended: ((this: FakeSource) => void) | null = null;
  start(t = 0, _offset?: number, dur?: number) {
    this.startAt = t;
    if (dur !== undefined) this.stopAt = t + dur;
    this.ctx.started.push(this);
  }
  stop(t = 0) { this.stopAt = t; }
}

class FakeOsc extends FakeSource {
  type = 'sine';
  frequency = new FakeParam(440);
  detune = new FakeParam(0);
}

class FakeBufferSource extends FakeSource { buffer: unknown = null; }

class FakeContext {
  currentTime = 0;
  sampleRate = 8000;
  state = 'running';
  nodes: FakeNode[] = [];
  started: FakeSource[] = [];
  destination = new FakeNode(this, 'destination');
  createGain() { const n = new FakeNode(this, 'gain') as FakeNode & { gain: FakeParam }; n.gain = new FakeParam(1); return n; }
  createOscillator() { return new FakeOsc(this, 'osc'); }
  createBufferSource() { return new FakeBufferSource(this, 'noise'); }
  createBiquadFilter() {
    return Object.assign(new FakeNode(this, 'filter'), { type: 'lowpass', frequency: new FakeParam(350), Q: new FakeParam(1) });
  }
  createDelay() { return Object.assign(new FakeNode(this, 'delay'), { delayTime: new FakeParam(0) }); }
  createConvolver() { return Object.assign(new FakeNode(this, 'convolver'), { buffer: null as unknown }); }
  createStereoPanner() { return Object.assign(new FakeNode(this, 'panner'), { pan: new FakeParam(0) }); }
  createDynamicsCompressor() {
    return Object.assign(new FakeNode(this, 'compressor'), {
      threshold: new FakeParam(-24), knee: new FakeParam(30), ratio: new FakeParam(12), attack: new FakeParam(0.003), release: new FakeParam(0.25),
    });
  }
  createBuffer(channels: number, length: number) {
    const data = Array.from({ length: channels }, () => new Float32Array(length));
    return { numberOfChannels: channels, length, getChannelData: (c: number) => data[c] };
  }
}

// ---------------------------------------------------------------- harness

let ctx: FakeContext;
let master: FakeNode & { gain: FakeParam };
let soundOn: boolean;
let listeners: ((on: boolean) => void)[];

const deps = () => ({
  audio: () => (soundOn ? { ctx: ctx as unknown as AudioContext, master: master as unknown as GainNode } : null),
  onSoundChange: (cb: (on: boolean) => void) => {
    listeners.push(cb);
    return () => { listeners = listeners.filter(l => l !== cb); };
  },
});

function toggleSound(on: boolean) { soundOn = on; listeners.forEach(l => l(on)); }

/** Advance the audio clock and the timers together, one tick at a time. */
function advance(ms: number) {
  for (let t = 0; t < ms; t += TICK_MS) {
    ctx.currentTime += TICK_MS / 1000;
    vi.advanceTimersByTime(TICK_MS);
  }
}

/** The gain node a track bus wires into the master: its output level. */
function busOuts() { return ctx.nodes.filter(n => n.kind === 'gain' && n.outputs.has(master)) as (FakeNode & { gain: FakeParam })[]; }

/** Times where beat() wraps from the end of a beat back to its start. */
function beatWraps(music: ReturnType<typeof createMusic>, ms: number) {
  const wraps: number[] = [];
  let prev = music.beat();
  for (let t = 0; t < ms; t += 5) {
    ctx.currentTime += 0.005;
    if (t % TICK_MS === 0) vi.advanceTimersByTime(TICK_MS);
    const b = music.beat();
    if (b < prev - 0.5) wraps.push(ctx.currentTime);
    prev = b;
  }
  return wraps;
}

beforeEach(() => {
  vi.useFakeTimers();
  ctx = new FakeContext();
  master = ctx.createGain();
  master.connect(ctx.destination);
  soundOn = true;
  listeners = [];
});

afterEach(() => { vi.useRealTimers(); });

// ---------------------------------------------------------------- tests

describe('platformer music', () => {
  it('plays nothing and starts no timer while sound is off', () => {
    soundOn = false;
    const music = createMusic(deps());
    music.play('rooftops');
    music.setTempo(1.25);
    music.setIntensity(1);
    advance(1000);
    expect(ctx.started).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
    expect(music.beat()).toBe(0);
  });

  it('schedules notes ahead of currentTime, never in the past and never far ahead', () => {
    ctx.currentTime = 10;
    const music = createMusic(deps());
    music.play('rooftops');
    expect(ctx.started.length).toBeGreaterThan(0);
    for (let k = 0; k < 40; k++) {
      const now = ctx.currentTime;
      const before = ctx.started.length;
      advance(TICK_MS);
      for (const s of ctx.started.slice(before)) {
        expect(s.startAt).toBeGreaterThanOrEqual(now);
        // a step starts inside the lookahead; swing can push it a little further
        expect(s.startAt).toBeLessThan(ctx.currentTime + LOOKAHEAD + 0.05);
      }
    }
    const notes = ctx.started.filter(s => !(s.kind === 'osc' && (s as FakeOsc).frequency.value < 0.1)); // not the pad sway LFO
    expect(notes.every(s => s.startAt >= 10)).toBe(true);
  });

  it('keeps the bus at or below a quarter of the master', () => {
    const music = createMusic(deps());
    for (const id of TRACK_IDS) {
      music.play(id);
      advance(200);
    }
    const levels = busOuts().flatMap(n => n.gain.events.map(e => e.value));
    expect(levels.length).toBeGreaterThan(0);
    expect(Math.max(...levels)).toBeLessThanOrEqual(0.25);
    for (const id of TRACK_IDS) expect(TRACKS[id].level).toBeLessThanOrEqual(0.25);
  });

  it('stop clears the timer, fades out, and schedules nothing more', () => {
    const music = createMusic(deps());
    music.play('rooftops');
    advance(500);
    const out = busOuts()[0];
    music.stop();
    const count = ctx.started.length;
    advance(2000);
    expect(ctx.started.length).toBe(count);
    expect(vi.getTimerCount()).toBe(0);
    expect(out.gain.events.at(-1)).toMatchObject({ kind: 'linear', value: 0 });
    expect(out.disconnected).toBeGreaterThan(0);
    expect(music.beat()).toBe(0);
  });

  it('applies a tempo change, ramping rather than jumping', () => {
    const music = createMusic(deps());
    music.play('rooftops');
    const beat = 60 / TRACKS.rooftops.bpm;
    const normal = beatWraps(music, 3000);
    const gaps = (w: number[]) => w.slice(1).map((t, i) => t - w[i]);
    for (const g of gaps(normal)) expect(g).toBeCloseTo(beat, 1);

    music.setTempo(1.25);
    const ramp = gaps(beatWraps(music, 1200));
    const fast = gaps(beatWraps(music, 3000));
    for (const g of fast) expect(g).toBeCloseTo(beat / 1.25, 1);
    // the first beat after the change sits between the two tempos: a ramp
    expect(ramp[0]).toBeLessThan(beat + 0.01);
    expect(ramp[0]).toBeGreaterThan(beat / 1.25 - 0.01);
  });

  it('stops when the sound toggle goes off and resumes when it comes back', () => {
    const music = createMusic(deps());
    music.play('rooftops');
    advance(300);
    toggleSound(false);
    const count = ctx.started.length;
    advance(1000);
    expect(ctx.started.length).toBe(count);
    expect(music.beat()).toBe(0);
    expect(vi.getTimerCount()).toBe(0);

    toggleSound(true);
    advance(300);
    expect(ctx.started.length).toBeGreaterThan(count);
  });

  it('does not start on a sound toggle unless the game asked for music', () => {
    const music = createMusic(deps());
    music.play('rooftops');
    music.stop();
    toggleSound(false);
    toggleSound(true);
    advance(500);
    const afterStop = ctx.started.filter(s => s.startAt > 0.3);
    expect(afterStop).toHaveLength(0);
    music.dispose();
  });

  it('beat() advances with time and stays in 0..1', () => {
    const music = createMusic(deps());
    expect(music.beat()).toBe(0);
    music.play('rooftops');
    advance(100);
    const seen: number[] = [];
    for (let k = 0; k < 20; k++) {
      ctx.currentTime += 0.02;
      vi.advanceTimersByTime(20);
      seen.push(music.beat());
    }
    for (const b of seen) { expect(b).toBeGreaterThanOrEqual(0); expect(b).toBeLessThan(1); }
    // 0.4 s at 100 BPM is inside one 0.6 s beat or across one wrap: mostly increasing
    const rises = seen.slice(1).filter((b, i) => b > seen[i]).length;
    expect(rises).toBeGreaterThanOrEqual(seen.length - 2);
  });

  it('intensity adds layers: 0 has no drums or lead, 0.5 adds drums, 1 adds the lead', () => {
    const noise = () => ctx.started.filter(s => s.kind === 'noise').length;
    const music = createMusic(deps());
    music.setIntensity(0);
    music.play('rooftops');
    advance(4800); // two bars
    expect(noise()).toBe(0);
    // the soft lead is the only voice with a +6 cent sawtooth
    const leads = () => ctx.nodes.filter(n => n.kind === 'osc' && (n as FakeOsc).type === 'sawtooth' && (n as FakeOsc).detune.value === 6).length;
    expect(leads()).toBe(0);

    music.setIntensity(0.5);
    advance(2400);
    expect(noise()).toBeGreaterThan(0);
    expect(leads()).toBe(0);

    music.setIntensity(1);
    advance(19200); // a full loop, so the lead phrase has notes
    expect(leads()).toBeGreaterThan(0);

    expect(layerLevel(0, 0.5)).toBe(0);
    expect(layerLevel(0.5, 0.5)).toBe(1);
    expect(layerLevel(0.5, 1)).toBe(0);
    expect(layerLevel(1, 1)).toBe(1);
    expect(layerLevel(0, 0)).toBe(1);
  });

  it('crossfades to a new track and tears the old bus down after the fade', () => {
    const music = createMusic(deps());
    music.play('rooftops');
    advance(300);
    const [old] = busOuts();
    music.play('caves');
    expect(old.gain.events.at(-1)).toMatchObject({ kind: 'linear', value: 0 });
    expect(busOuts()).toHaveLength(2);
    advance(2500);
    expect(old.disconnected).toBeGreaterThan(0);
    expect(busOuts()).toHaveLength(1);
    music.play('caves'); // same track: no restart
    expect(busOuts()).toHaveLength(1);
  });

  it('disconnects a note when its source ends', () => {
    const music = createMusic(deps());
    music.play('rooftops');
    advance(200);
    const src = ctx.started.find(s => s.onended);
    expect(src).toBeDefined();
    const tail = [...src!.outputs][0] as FakeNode;
    src!.onended!.call(src!);
    expect(src!.disconnected).toBe(1);
    expect(tail.disconnected).toBe(1);
  });

  it('every track plays without throwing and every note has a finite stop', () => {
    for (const id of TRACK_IDS as TrackId[]) {
      ctx = new FakeContext();
      master = ctx.createGain();
      const music = createMusic(deps());
      music.setIntensity(1);
      music.play(id);
      advance(TRACKS[id].bars * 4 * (60 / TRACKS[id].bpm) * 1000 + 500); // one full loop
      expect(ctx.started.length).toBeGreaterThan(10);
      for (const s of ctx.started) {
        if (s.kind === 'osc' && (s as FakeOsc).frequency.value < 0.1) continue; // the pad sway LFO runs for the bus lifetime
        expect(Number.isFinite(s.stopAt)).toBe(true);
      }
      music.dispose();
    }
  });

  it('dispose stops, unsubscribes, and ignores later calls', () => {
    const music = createMusic(deps());
    music.play('rooftops');
    advance(200);
    music.dispose();
    expect(listeners).toHaveLength(0);
    const count = ctx.started.length;
    music.play('boss');
    advance(1000);
    expect(ctx.started.length).toBe(count);
    expect(vi.getTimerCount()).toBe(0);
  });
});

// ---------------------------------------------------------------- the chapter tracks

const CHAPTER: { id: TrackId; bpm: number }[] = [
  { id: 'trip', bpm: 88 },
  { id: 'campus', bpm: 84 },
  { id: 'boston', bpm: 104 },
  { id: 'boss', bpm: 128 },
];

/** Seconds in one loop of a track at tempo 1. */
const loopSeconds = (id: TrackId) => TRACKS[id].bars * 4 * (60 / TRACKS[id].bpm);

/** Note nodes wired into one of a bus's layer inputs. */
function wiredInto(...targets: unknown[]) {
  return ctx.nodes.filter(n => targets.some(t => n.outputs.has(t))).length;
}

describe('platformer music: one track per chapter', () => {
  it('keeps the old track ids and adds the chapter ones', () => {
    for (const id of ['rooftops', 'caves', 'ruins', 'boss', 'secret', 'trip', 'campus', 'boston']) {
      expect(TRACK_IDS).toContain(id);
      expect(TRACKS[id as TrackId].id).toBe(id);
    }
  });

  it.each(CHAPTER)('$id loops over 8 to 16 bars at about $bpm BPM, with drums and a lead', ({ id, bpm }) => {
    const t = TRACKS[id];
    expect(t.bpm).toBe(bpm);
    expect(t.bars).toBeGreaterThanOrEqual(8);
    expect(t.bars).toBeLessThanOrEqual(16);
    expect(t.level).toBeLessThanOrEqual(0.25);
    expect(t.drums).toBeDefined();
    expect(t.lead.phrases[0].length).toBeGreaterThan(0);
    const steps = t.bars * 16;
    const all = [...t.bass.notes, ...t.lead.phrases.flat(), ...(t.arp?.notes ?? [])];
    for (const [s, m] of all) {
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThan(steps);
      expect(m).toBeGreaterThanOrEqual(28);
      expect(m).toBeLessThanOrEqual(96);
    }
    for (const [s] of t.pad.chords) expect(s).toBeLessThan(steps);
  });

  it.each(CHAPTER)('$id schedules every note ahead of currentTime and inside the lookahead', ({ id }) => {
    ctx.currentTime = 5;
    const music = createMusic(deps());
    music.play(id);
    const swing = TRACKS[id].swing * (60 / TRACKS[id].bpm / 4);
    for (let k = 0; k < 120; k++) {
      const now = ctx.currentTime;
      const before = ctx.started.length;
      advance(TICK_MS);
      for (const s of ctx.started.slice(before)) {
        expect(s.startAt).toBeGreaterThanOrEqual(now);
        expect(s.startAt).toBeLessThan(ctx.currentTime + LOOKAHEAD + swing + 0.001);
      }
    }
    expect(ctx.started.length).toBeGreaterThan(10);
    music.dispose();
  });

  it.each(CHAPTER)('$id beats at its own tempo and follows the Aura Mode tempo', ({ id }) => {
    const music = createMusic(deps());
    music.play(id);
    const beat = 60 / TRACKS[id].bpm;
    const gaps = (w: number[]) => w.slice(1).map((t, i) => t - w[i]);
    const normal = gaps(beatWraps(music, 4000));
    expect(normal.length).toBeGreaterThan(2);
    for (const g of normal) expect(g).toBeCloseTo(beat, 1);
    music.setTempo(1.25);
    beatWraps(music, 1500);
    for (const g of gaps(beatWraps(music, 3000))) expect(g).toBeCloseTo(beat / 1.25, 1);
    music.dispose();
  });

  it.each(CHAPTER)('$id adds layers with intensity: drums from 0.5, the lead at 1', ({ id }) => {
    const t = TRACKS[id];
    const count = (intensity: number) => {
      ctx = new FakeContext();
      master = ctx.createGain();
      const p = createPlayer(ctx as unknown as BaseAudioContext, master as unknown as AudioNode, id, { startAt: 0, intensity });
      p.scheduleUntil(loopSeconds(id), 0);
      const b = p.bus;
      const out = { drums: wiredInto(b.drums, b.hats), lead: wiredInto(b.lead), arp: b.arp ? wiredInto(b.arp) : 0, base: wiredInto(b.pad, b.bass) };
      p.dispose();
      return out;
    };
    const quiet = count(0), mid = count(0.5), full = count(1);
    expect(quiet.base).toBeGreaterThan(0);
    expect(quiet.drums).toBe(0);
    expect(quiet.lead).toBe(0);
    expect(mid.drums).toBeGreaterThan(0);
    expect(mid.lead).toBe(0);
    expect(full.drums).toBeGreaterThan(0);
    expect(full.lead).toBeGreaterThan(0);
    if (t.arp) {
      if (layerLevel(0, t.arp.enter) === 0) expect(quiet.arp).toBe(0);
      else expect(quiet.arp).toBeGreaterThan(0);
      expect(full.arp).toBeGreaterThan(0);
    }
  });

  it('trip floats: slow, soft arpeggios that never stop, and a terminal chime in the lead', () => {
    const t = TRACKS.trip;
    expect(t.arp).toBeDefined();
    expect(t.arp!.enter).toBe(0);
    expect(t.arp!.notes.length).toBeGreaterThanOrEqual(t.bars * 4);
    expect(t.lead.style).toBe('chime');
    // the chime: the same three notes, a quarter note apart, opens the first phrase
    const first = t.lead.phrases[0].slice(0, 3);
    expect(first.map(n => n[0])).toEqual([0, 4, 8]);
    const motif = first.map(n => n[1]);
    const again = t.lead.phrases.flat().filter((n, i, all) => i + 2 < all.length && n[1] === motif[0] && all[i + 1][1] === motif[1] && all[i + 2][1] === motif[2]);
    expect(again.length).toBeGreaterThanOrEqual(3);
    expect(t.drums!.kick).toBeLessThan(TRACKS.rooftops.drums!.kick);
  });

  it('campus swings: electric piano chords, a walking bass on every beat, dusty drums and a bell', () => {
    const t = TRACKS.campus;
    expect(t.swing).toBeGreaterThanOrEqual(0.15);
    expect(t.pad.voice).toBe('keys');
    expect(t.lead.style).toBe('bell');
    expect(t.drums!.tone).toBeLessThan(1);
    expect(t.drums!.crackle).toBeGreaterThan(0);
    const beats = new Set(t.bass.notes.filter(n => n[0] % 4 === 0).map(n => n[0]));
    expect(beats.size).toBe(t.bars * 4);
    // it walks: consecutive beats rarely repeat a pitch
    const pitches = [...t.bass.notes].filter(n => n[0] % 4 === 0).sort((a, b) => a[0] - b[0]).map(n => n[1]);
    const repeats = pitches.slice(1).filter((m, i) => m === pitches[i]).length;
    expect(repeats).toBeLessThanOrEqual(2);
  });

  it('campus electric piano strikes and decays, with an FM tine, and the crackle runs bar by bar', () => {
    const p = createPlayer(ctx as unknown as BaseAudioContext, master as unknown as AudioNode, 'campus', { startAt: 0, intensity: 1 });
    p.scheduleUntil(0.9 * 4 * 60 / TRACKS.campus.bpm, 0); // inside the first bar
    // an FM modulator is an oscillator wired into a gain that drives another oscillator's frequency
    const fm = ctx.nodes.filter(n => n.kind === 'gain' && [...n.outputs].some(o => ctx.nodes.some(m => m.kind === 'osc' && (m as FakeOsc).frequency === o)));
    expect(fm.length).toBeGreaterThan(0);
    const crackle = ctx.started.filter(s => s.kind === 'noise' && (s as FakeBufferSource & { loop?: boolean }).loop);
    expect(crackle.length).toBe(1);
    expect(Number.isFinite(crackle[0].stopAt)).toBe(true);
    p.dispose();
  });

  it('boston rises: the lead climbs from the night half into the morning half, and the pad opens up', () => {
    const t = TRACKS.boston;
    const half = t.bars * 8;
    for (const ph of t.lead.phrases.filter(p => p.length)) {
      const mean = (ns: readonly { 1: number }[]) => ns.reduce((a, n) => a + n[1], 0) / ns.length;
      const night = ph.filter(n => n[0] < half), morning = ph.filter(n => n[0] >= half);
      expect(mean(morning)).toBeGreaterThan(mean(night) + 4);
      expect(Math.max(...morning.map(n => n[1]))).toBeGreaterThan(Math.max(...night.map(n => n[1])));
    }
    expect(t.pad.bloom).toBeGreaterThan(1);
    const p = createPlayer(ctx as unknown as BaseAudioContext, master as unknown as AudioNode, 'boston', { startAt: 0, intensity: 1 });
    p.scheduleUntil(0.01, 0);
    const f = (p.bus.padFilter as unknown as { frequency: FakeParam }).frequency;
    const ramps = f.events.filter(e => e.kind === 'linear');
    expect(Math.max(...ramps.map(e => e.value))).toBeCloseTo(t.pad.cutoff * t.pad.bloom!, 0);
    expect(ramps.at(-1)!.value).toBe(t.pad.cutoff);
    expect(ramps.at(-1)!.time).toBeCloseTo(loopSeconds('boston'), 3);
    p.dispose();
  });

  it('boss has attitude: punchy stabs, and chest-beat toms in its fills', () => {
    const t = TRACKS.boss;
    expect(t.lead.style).toBe('stab');
    expect(t.drums!.fills.some(f => f.tom && f.tom.includes('x'))).toBe(true);
    expect(t.drums!.tom).toBeGreaterThan(0);
    const p = createPlayer(ctx as unknown as BaseAudioContext, master as unknown as AudioNode, 'boss', { startAt: 0, intensity: 1 });
    p.scheduleUntil(loopSeconds('boss'), 0);
    // a tom is a sine that starts at 150 Hz and drops; only the fill bar has them
    const toms = ctx.started.filter(s => s.kind === 'osc' && (s as FakeOsc).frequency.events.some(e => e.kind === 'set' && e.value === 150));
    expect(toms.length).toBeGreaterThan(0);
    const lastBar = (TRACKS.boss.bars - 1) * 4 * 60 / TRACKS.boss.bpm;
    expect(toms.every(s => s.startAt >= lastBar - 1e-6)).toBe(true);
    p.dispose();
  });
});

describe('trackForTheme', () => {
  it('gives each chapter its own track', () => {
    expect(trackForTheme('austin')).toBe('rooftops');
    expect(trackForTheme('rooftops')).toBe('rooftops');
    expect(trackForTheme('airport')).toBe('trip');
    expect(trackForTheme('clouds')).toBe('trip');
    for (const th of ['campus', 'library', 'tracks']) expect(trackForTheme(th)).toBe('campus');
    for (const th of ['boston', 'newbury', 'charles', 'seaport', 'revere']) expect(trackForTheme(th)).toBe('boston');
  });

  it('keeps the old worlds on their old tracks and falls back to the rooftops', () => {
    expect(trackForTheme('grass')).toBe('rooftops');
    expect(trackForTheme('cave')).toBe('caves');
    expect(trackForTheme('sky')).toBe('ruins');
    expect(trackForTheme('stars')).toBe('secret');
    expect(trackForTheme('somewhere new')).toBe('rooftops');
    for (const th of ['austin', 'airport', 'campus', 'boston', 'cave']) expect(TRACK_IDS).toContain(trackForTheme(th));
  });
});
