/**
 * The pixel-art pipeline, for every pixel theme (the rooftops, Austin, the
 * trip). What differs per theme (tiles, facades, the parallax, weather,
 * enemy and goal art, the sign, decor lights, extra layers) comes from the
 * level's PixelTheme (./themes.ts); this file never branches on a theme name.
 *
 * Everything is drawn at 16 art pixels per tile into a low-res buffer the
 * size of the view, then blitted to the screen at a whole number of device
 * pixels per art pixel with smoothing off (see ./camera.ts). Back to front:
 *
 *   background buffer: sky (stars, moon) > clouds > 3 skyline strips
 *     > the close layer behind the roofs > back rain
 *   playfield buffer (clear): static tile chunks > blocks, decor, enemies,
 *     scarf, hero
 *   > light pass: darkness plus additive lights, multiplied over the
 *     background, then (masked to what the playfield drew) over the playfield
 *   > background glow (lit rooms, neon, bulbs, drips, TVs, lightning bolt)
 *   > playfield glow (neon, eyes, coins, orbs, afterimages, puddle
 *     reflections), then the playfield over the background
 *   > glow halos (pre-baked light sprites, additive)
 *   > sparks, juice particles, front rain and splashes
 *   > screen effects (hit flash, lightning)
 *   > the pixel title card or level-clear tally
 *   > blit > floating words at full resolution.
 *
 * World modifiers (per run, from the seed) change the weather and light:
 * blackout (near-black night, only the scarf, coins and orbs light it, neon
 * sputters out), storm (dense rain slanted by the wind, lightning), low
 * gravity (slow rain, floating dust), double aura (brighter coins). The seed
 * also picks the skyline and the words on the neon signs.
 *
 * The hot path allocates nothing: buffers, pools, light slots and scratch
 * objects are made once and rewritten. The renderer only reads the world.
 */

import type { Juice } from '../../../shared/juice';
import { hypeFont } from '../../../shared/theme';
import { ROWS, type Level } from '../../sim/level';
import type { World } from '../../sim/world';
import { ENEMY_KINDS } from '../../sim/enemies';
import { toMono } from '../bake';
import type { View } from '../view';
import { CARD_SECONDS, tallyView } from '../../sim/world';
import { bakeTally, bakeTitle, cardWipe, drawCard, drawTallyNumbers, type CardArt, type Wipe } from './card';
import { BREAKABLES, HERO, HERO_NECK, PICKUPS, POWERUPS, type HeroAnim, type SpriteSet } from '../sprites';
import { pickHeroAnim, type AnimPick } from './anim';
import { ART_TILE, blitOrigin, placeFrame, snapTo, viewMetrics, type Placement, type BlitOrigin, type ViewMetrics } from './camera';
import { makeCanvas, resize, type Canvas, type Ctx } from './canvas';
import { CHUNK_COLS, CHUNK_PX, ChunkCache, chunkRange, type ChunkSpan } from './chunks';
import { LightList, lightSprite, withAlpha } from './lights';
import {
  afterimagesOf, dashReadyOf, powerOf, decorOf, hitFreezeOf, lightsOf, modifierNameOf, modifierOf, pickupsOf, readHero, scarfOf, seedOf, windOf,
  type Decor, type HeroPose, type PickupKind,
} from './read';
import { signWord } from './signs';
import { STRIP_W, drawStrip, flicker, hash2, type Sky, type SkyLayer } from './skyline';
import { atlas, drawFrame, drawTinted, rectOf, tinted, type Atlas } from './sprites';
import { K, KIND, bakeChunk, bakeChunkPart, decorAtlas, decorBottom, isStaticDecor, tileAtlas, type Chunk } from './tiles';
import { loadTheme, themeFor, type PixelTheme, type ThemeFrame } from './themes';
import { Motes, Rain, SLANT, Sparks, type RainOpts } from './weather';
import { SKY_PRESETS, skyOf, type SkyPreset } from './timeofday';
import {
  StoryFx, drawFlights, drawLogo, drawMemories, drawNotice, drawPrompts, drawShrines, drawStoryCard, drawUnlockCard,
  type Memory, type Prompt, type Shrine, type StoryCardView,
} from './story';
import { ActionFx, drawGlideCloak, drawPowerRing, drawSmear, drawSpeedLines } from './fx';

export interface PixelView extends View {
  /** Device pixels per CSS pixel; the screen canvas is that much bigger. */
  dpr?: number;
  /**
   * A canvas under the screen canvas that shows the low-res frame, scaled up
   * by CSS with pixelated sampling (the compositor does the upscale). Without
   * it the frame is blitted, scaled, into the screen canvas.
   */
  pixel?: HTMLCanvasElement | null;
  /** Title screen: the logo over the live scene. */
  title?: boolean;
  /** A story card being typed. */
  story?: StoryCardView | null;
  /** A one-line notice (a power's first pickup). */
  notice?: { title: string; line: string; accent: string } | null;
  /** Beginner and move prompts anchored in the world (text in capitals). */
  prompts?: readonly Prompt[];
  /** Resolves a story text id (with the device's private overrides): a boss's name and lines. */
  text?: (id: string) => string;
  /** CSS px at the top the page covers (the landscape HUD strip), kept clear of drawn HUD art. */
  insetTop?: number;
}

const LEVEL_H = ROWS * ART_TILE;
const NO_LIGHT = () => {};
const NO_TEXT = (id: string) => id;
function shrineLight(x: number, y: number, k: number) {
  if (S) levelLight(S, x, y, 30, lightCol(COL.cyan, S.mono), k, 2, 0.6);
}

function memoriesOf(w: World): readonly Memory[] {
  const m = (w as unknown as { memories?: readonly Memory[] }).memories;
  return Array.isArray(m) ? m : [];
}

function shrinesOf(w: World): readonly Shrine[] {
  const q = (w as unknown as { shrines?: readonly Shrine[] }).shrines;
  return Array.isArray(q) ? q : [];
}

/** A 'bats' set piece on the level is live while she is inside its stretch. */
function batsActive(w: World, heroX: number): boolean {
  const list = (w.level as unknown as { setPieces?: readonly { kind: string; x0?: number; x1?: number; x?: number; w?: number }[] }).setPieces;
  if (!Array.isArray(list)) return false;
  for (let i = 0; i < list.length; i++) {
    const p = list[i];
    if (p.kind !== 'bats') continue;
    const a = p.x0 ?? p.x ?? 0, b = p.x1 ?? a + (p.w ?? 30);
    if (heroX >= a - 4 && heroX <= b + 4) return true;
  }
  return false;
}
const RING_CAP = 4;
const RING_LIFE = 0.3;
const FLICK_LIFE = 0.25;
/** Unit circle, 16 points, for the puff ring. */
const RING_PTS = Array.from({ length: 16 }, (_, i) => [Math.cos((i / 16) * Math.PI * 2), Math.sin((i / 16) * Math.PI * 2)] as const);

/**
 * A game event the view forwards to the renderer (positions in tiles).
 * `doubleJump`: a puff ring under the feet and a flick of the scarf.
 */
export function pixelEvent(type: string, x: number, y: number, n = 0) {
  const s = state();
  // the theme hears every event (a boss's hit flash)
  s.theme?.layers?.event?.(type, x, y, n);
  if (type === 'memory') { s.story.memory(x * ART_TILE, y * ART_TILE); return; }
  if (type === 'unlock') { s.story.unlock(n); return; }
  if (type === 'swing' || type === 'hit' || type === 'break' || type === 'coinPull' || type === 'pogo' || type === 'decoyDive') { s.action.event(type, x, y, n); return; }
  if (type !== 'doubleJump') return;
  let slot = s.rings[0];
  for (const r of s.rings) {
    if (r.t0 < 0 && !r.pending) { slot = r; break; }
    if (r.t0 < slot.t0) slot = r;
  }
  slot.x = x * ART_TILE; slot.y = y * ART_TILE; slot.pending = true; slot.t0 = 0;
  s.pendingFlick = true;
}

function drawRings(c: Ctx, s: State, t: number, mono: boolean): number {
  let n = 0;
  c.fillStyle = mono ? '#ffffff' : '#d8ecff';
  for (const r of s.rings) {
    if (r.pending) { r.t0 = t; r.pending = false; }
    if (r.t0 < 0) continue;
    const age = t - r.t0;
    if (age > RING_LIFE || age < 0) { r.t0 = -1; continue; }
    n++;
    const k = age / RING_LIFE;
    const rad = 3 + k * 9;
    c.globalAlpha = 0.85 * (1 - k);
    const cx = Math.round(r.x) - s.ox, cy = Math.round(r.y) - s.oy;
    for (let i = 0; i < RING_PTS.length; i++) c.fillRect(Math.round(cx + RING_PTS[i][0] * rad), Math.round(cy + RING_PTS[i][1] * rad * 0.3), 1, 1);
  }
  c.globalAlpha = 1;
  return n;
}

/** Blackout: the lights are out, but roof edges and spikes stay faintly readable. */
function drawBlackoutRims(c: Ctx, s: State, ta: Atlas, lastChunk: number, mono: boolean): number {
  let n = 0;
  const rim = mono ? '#ffffff' : '#3df2ff';
  for (let ci = s.span.first; ci <= Math.min(s.span.last, lastChunk); ci++) {
    if (!s.chunks.has(ci)) continue;
    const ch = s.chunks.get(ci);
    const cx = ci * CHUNK_PX - s.ox;
    c.fillStyle = rim;
    for (let i = 0; i < ch.rims.length; i += 3) {
      const x = cx + ch.rims[i], y = ch.rims[i + 1] - s.oy, e = ch.rims[i + 2];
      if (x > s.bw || x + 16 < 0) continue;
      n++;
      c.globalAlpha = 0.16;
      c.fillRect(x, y, 16, 1);
      if (e) {
        // the end of a roof before a gap: brighter, with a short drop down the wall
        c.globalAlpha = 0.4;
        const ex = e === 1 ? x : x + 15;
        c.fillRect(ex, y, 1, 4);
        c.fillRect(e === 1 ? x : x + 12, y, 4, 1);
      }
    }
    for (let i = 0; i < ch.spikes.length; i += 2) {
      const x = cx + ch.spikes[i], y = ch.spikes[i + 1] - s.oy;
      if (x > s.bw || x + 16 < 0) continue;
      n++;
      c.globalAlpha = 0.4;
      drawFrame(c, ta, 'spikes', 0, x, y, 1);
    }
  }
  c.globalAlpha = 1;
  return n;
}
const AFTERIMAGE_LIFE = 0.18;

/** Night colours. Light colours become white under Mono. */
const COL = {
  moonHalo: '#b9a8ff',
  ambient: '#6a6496',
  ambientDark: '#15111f',
  lightning: '#c9d8ff',
  cityGlow: '#3a1c3e',
  heroFill: '#9db0ff',
  shot: '#ff8c3a',
  elite: '#ffc24a',
  heroRim: '#c99bff',
  scarfEdge: '#c8246c', scarfCore: '#ff6aae', scarfHot: '#ffd0e6',
  scarfDimEdge: '#3e1a33', scarfDimCore: '#6a2c52',
  magenta: '#ff3d9a', cyan: '#3df2ff', sodium: '#ffb347', violet: '#9a5cff', red: '#ff3b4f', screen: '#ffe14d',
} as const;

/** Pickup art per kind: the chapter 1 powers and the blade have their own; later powers use an orb for now. */
function pickupSet(kind: string): SpriteSet<string> {
  if (kind === 'batWings') return POWERUPS.batWings as SpriteSet<string>;
  if (kind === 'tacoRush') return POWERUPS.tacoRush as SpriteSet<string>;
  if (kind === 'blade') return POWERUPS.blade as SpriteSet<string>;
  return PICKUPS.sparkOrb as SpriteSet<string>;
}
export const POWER_COLOR: Readonly<Record<PickupKind, string>> = {
  batWings: '#9d62ff', tacoRush: '#ff8c3a', priorityBoarding: '#3df2ff', wickedFast: '#d4ff3a', encore: '#ff5c95', cannoliShield: '#ffd9a0',
};
/** Glowing keys per sprite set. */
const HERO_GLOW = 'eE';
const SCARF_N = 10;

interface Buffers { canvas: Canvas; ctx: Ctx }

/** What the last frame drew, for tests and tuning. One object, rewritten each frame. */
export interface FrameStats {
  lights: number;
  /** Level, decor and enemy lights asked for (0 in a blackout). */
  levelLights: number;
  /** Luminance (0..1) of the night's ambient light. */
  ambient: number;
  rain: number;
  rainSpeed: number;
  motes: number;
  /** Lightning flash strength this frame, 0..1. */
  lightning: number;
  coinGlow: number;
  skylineSeed: number;
  signText: string;
  /** The modifier name on the title card while it shows, else ''. */
  card: string;
  /** Roof edges outlined for the blackout this frame. */
  rims: number;
  /** Double-jump puff rings showing. */
  rings: number;
  /** The time-of-day preset in use. */
  sky: string;
  /** The moon or sun drawn over the darkness this frame (0 or 1). */
  discs: number;
  /** Bats in the swarm on screen, memories flying to the corner. */
  bats: number;
  flights: number;
  /** The theme's rumble shake this frame (0 under reduced motion). */
  rumble: number;
}

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1, 7), 16);
  return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
}
const AMBIENT_LUM = luminance(COL.ambient);
const AMBIENT_DARK_LUM = luminance(COL.ambientDark);

interface State {
  m: ViewMetrics;
  /** The background, then the final frame. */
  main: Buffers | null;
  /** The playfield: tiles, decor, actors, on clear. */
  scene: Buffers | null;
  light: Buffers | null;
  /** The light map at playfield resolution, masked to what the playfield drew. */
  lightQ: Buffers | null;
  card: { art: CardArt | null; level: Level | null; mod: string; bw: number; mono: boolean };
  skyOpts: { neon: number; sky: SkyPreset };
  /** The level's theme (null before the first themed frame) and what its layers get each frame. */
  theme: PixelTheme | null;
  tf: ThemeFrame;
  /** A low fog band for the misty presets, baked per view size. */
  fog: Canvas | null;
  tally: { art: CardArt | null; title: string; bw: number; mono: boolean; t: number };
  wipe: Wipe;
  lightBase: Canvas | null;
  lightBaseDark: Canvas | null;
  seed: number;
  motes: Motes;
  rainOpts: RainOpts;
  stats: FrameStats;
  /** This frame's modifier flags. */
  blackout: boolean;
  flash: number;
  sky: Sky | null;
  bw: number; bh: number; mono: boolean;
  /** Buffer sub-pixels per art pixel (see camera.ts). */
  q: number;
  level: Level | null;
  /** What the chunks bake: the level's decor plus the theme's dressing; `decorSrc` is the level list it came from. */
  decor: readonly Decor[] | null;
  decorSrc: readonly Decor[] | null;
  /** Memories not hidden inside front decor, rewritten each frame. */
  memShown: Memory[];
  chunks: ChunkCache<Chunk>;
  span: ChunkSpan;
  /** The chunk being baked ahead, a slice per frame: index (-1 none), next column, canvases. */
  pre: { index: number; col: number; chunk: Chunk | null };
  rain: Rain;
  sparks: Sparks;
  lights: LightList;
  pose: HeroPose;
  pick: AnimPick;
  bx: BlitOrigin; by: BlitOrigin;
  ox: number; oy: number;
  tiles: Uint8Array | null; cols: number;
  world: World | null;
  lastT: number; lastRx: number; lastRy: number;
  sparkAcc: number;
  sx: Float32Array; sy: Float32Array;
  fonts: Map<number, string>;
  /** A small canvas for the moon or sun redrawn over the darkness, masked by what stands in front of it. */
  discMask: { canvas: Canvas; ctx: Ctx } | null;
  /** The pixel canvas in use, its context and CSS size, and cached transform strings. */
  pixel: HTMLCanvasElement | null;
  pixelCtx: CanvasRenderingContext2D | null;
  pixelW: number; pixelH: number;
  transforms: Map<number, string>;
  /** The screen canvas has floating words (or a card) on it that need clearing. */
  overlayDirty: boolean;
  /** Double-jump puffs (world art pixels, start time; t0 < 0 is free) and the scarf flick's start. */
  rings: { x: number; y: number; t0: number; pending: boolean }[];
  story: StoryFx;
  action: ActionFx;
  flickAt: number;
  /** Events noted since the last frame, timed when that frame draws. */
  pendingFlick: boolean;
}

let S: State | null = null;

function lcg(seed: number) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
}

function state(): State {
  if (S) return S;
  const s: State = {
    m: viewMetrics(320, 480, 1),
    main: null, scene: null, light: null, lightQ: null, lightBase: null, lightBaseDark: null, sky: null,
    card: { art: null, level: null, mod: '', bw: 0, mono: false },
    skyOpts: { neon: 1, sky: SKY_PRESETS.night }, fog: null,
    theme: null,
    tf: {
      world: null as unknown as World, t: 0, dt: 0, alpha: 1, shake: 0, ox: 0, oy: 0, bw: 0, bh: 0, rx: 0, ry: 0, camDx: 0, camDy: 0, heroX: 0, heroY: 0, mono: false, reduced: false, text: (id: string) => id, insetTop: 0,
      light: (x, y, r, color, k, halo) => { if (S) levelLight(S, x, y, r, lightCol(color, S.mono), k, 2, halo); },
    },
    tally: { art: null, title: '', bw: 0, mono: false, t: 0 },
    wipe: { from: 0, to: 1 },
    seed: 0, motes: new Motes(lcg(19)), rainOpts: { density: 1, speed: 1, slant: SLANT },
    stats: { lights: 0, levelLights: 0, ambient: 0, rain: 0, rainSpeed: 0, motes: 0, lightning: 0, coinGlow: 0, skylineSeed: 0, signText: '', card: '', rims: 0, rings: 0, bats: 0, flights: 0, rumble: 0, sky: 'night', discs: 0 },
    blackout: false, flash: 0,
    bw: 0, bh: 0, mono: false, q: 1,
    level: null, decor: null, decorSrc: null, memShown: [],
    chunks: new ChunkCache<Chunk>(4, (index, reuse) => bakeChunk(reuse, s.theme as PixelTheme, s.level as Level, s.decor ?? [], index, s.mono)),
    span: { first: 0, last: 0 },
    pre: { index: -1, col: 0, chunk: null },
    rain: new Rain(lcg(7)),
    sparks: new Sparks(lcg(13)),
    lights: new LightList(),
    pose: { state: 'ground', facing: 1, vx: 0, vy: 0, animT: 0, landT: 1, wallDir: 0, dashT: 0 },
    pick: { anim: 'idle', frame: 0, facing: 1 },
    bx: { origin: 0, offset: 0 }, by: { origin: 0, offset: 0 },
    ox: 0, oy: 0, tiles: null, cols: 0,
    world: null, lastT: 0, lastRx: 0, lastRy: 0, sparkAcc: 0,
    sx: new Float32Array(SCARF_N), sy: new Float32Array(SCARF_N),
    fonts: new Map(),
    discMask: null, pixel: null, pixelCtx: null, pixelW: 0, pixelH: 0, transforms: new Map(), overlayDirty: true,
    rings: Array.from({ length: RING_CAP }, () => ({ x: 0, y: 0, t0: -1, pending: false })), flickAt: -9, pendingFlick: false,
    story: new StoryFx(), action: new ActionFx(),
  };
  S = s;
  return s;
}

/** The roof top under a falling raindrop, for splashes (buffer pixels), or -1. */
function roofHit(x: number, y: number): number {
  const s = S;
  if (!s || !s.tiles) return -1;
  const wx = x + s.ox, wy = y + s.oy;
  const tx = Math.floor(wx / ART_TILE), ty = Math.floor(wy / ART_TILE);
  if (tx < 0 || tx >= s.cols || ty < 1 || ty >= ROWS) return -1;
  const k = KIND[s.tiles[ty * s.cols + tx]];
  if (k !== K.ROOF && k !== K.STONE && k !== K.BRICK && k !== K.USED && k !== K.AURA && k !== K.CRACK) return -1;
  if (KIND[s.tiles[(ty - 1) * s.cols + tx]] !== K.EMPTY && KIND[s.tiles[(ty - 1) * s.cols + tx]] !== K.COIN) return -1;
  if (wy - ty * ART_TILE > 5) return -1;
  return ty * ART_TILE - s.oy;
}

function col(c: string, mono: boolean): string { return mono ? toMono(c) : c; }
function lightCol(c: string, mono: boolean): string { return mono ? '#ffffff' : c; }

function ensureBuffers(s: State, m: ViewMetrics, mono: boolean, seed: number, neon: number, sky: SkyPreset, theme: PixelTheme) {
  if (s.theme !== theme) { s.theme = theme; s.sky = null; s.chunks.reset(); s.pre.index = -1; }
  if (s.skyOpts.neon !== neon) { s.skyOpts.neon = neon; s.sky = null; }
  if (s.skyOpts.sky !== sky) { s.skyOpts.sky = sky; s.sky = null; }
  if (!s.main) s.main = makeCanvas(m.bw * m.q, m.bh * m.q);
  if (!s.scene) s.scene = makeCanvas(m.bw * m.q, m.bh * m.q);
  if (!s.light) s.light = makeCanvas(m.bw, m.bh);
  if (!s.lightQ) s.lightQ = makeCanvas(m.bw * m.q, m.bh * m.q);
  if (s.bw === m.bw && s.bh === m.bh && s.q === m.q && s.mono === mono && s.seed === seed && s.sky) return;
  // the frame and the playfield hold q sub-pixels per art pixel; the light map stays at art resolution
  resize(s.main.canvas, m.bw * m.q, m.bh * m.q);
  resize(s.scene.canvas, m.bw * m.q, m.bh * m.q);
  resize(s.light.canvas, m.bw, m.bh);
  resize(s.lightQ.canvas, m.bw * m.q, m.bh * m.q);
  s.q = m.q;
  s.main.ctx.imageSmoothingEnabled = false;
  s.scene.ctx.imageSmoothingEnabled = false;
  s.light.ctx.imageSmoothingEnabled = true;
  s.sky = theme.sky(m.bw, m.bh, mono, seed, s.skyOpts);
  s.seed = seed;
  s.lightBase = bakeLightBase(m.bw, m.bh, mono, theme.ambient ?? sky.ambient, sky.glow, theme.cityGlow ?? sky.cityGlow);
  s.fog = sky.fog > 0 ? bakeFog(m.bw, m.bh, mono, sky) : null;
  s.lightBaseDark = bakeLightBase(m.bw, m.bh, mono, COL.ambientDark, 0.25);
  s.bw = m.bw; s.bh = m.bh;
  if (s.mono !== mono) { s.mono = mono; s.chunks.reset(); s.pre.index = -1; }
}

/** The darkness: ambient night, lifted by the city glow from below, darker at the edges. */
/** A soft band of fog low over the city, for the misty presets. */
function bakeFog(w: number, h: number, mono: boolean, sky: SkyPreset): Canvas {
  const { canvas, ctx } = makeCanvas(w, h);
  const g = ctx.createLinearGradient?.(0, h * 0.35, 0, h);
  if (g) {
    const c = col(sky.fogColor, mono);
    g.addColorStop(0, withAlpha(c, 0));
    g.addColorStop(0.55, withAlpha(c, 0.45 * sky.fog));
    g.addColorStop(1, withAlpha(c, 0.75 * sky.fog));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
  return canvas;
}

function bakeLightBase(w: number, h: number, mono: boolean, ambient: string, glow: number, cityGlow: string = COL.cityGlow): Canvas {
  const { canvas, ctx } = makeCanvas(w, h);
  ctx.fillStyle = col(ambient, mono);
  ctx.fillRect(0, 0, w, h);
  const up = ctx.createLinearGradient?.(0, h, 0, h * 0.35);
  if (up) {
    up.addColorStop(0, withAlpha(col(cityGlow, mono), glow));
    up.addColorStop(1, withAlpha(col(cityGlow, mono), 0));
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = up;
    ctx.fillRect(0, 0, w, h);
  }
  const v = ctx.createRadialGradient?.(w / 2, h * 0.55, Math.min(w, h) * 0.35, w / 2, h * 0.55, Math.max(w, h) * 0.8);
  if (v) {
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.globalCompositeOperation = 'source-over';
  return canvas;
}

function mod(a: number, m: number) { return ((a % m) + m) % m; }

/** A light from the level (decor, neon, enemies, level lights): none in a blackout. */
function levelLight(s: State, x: number, y: number, r: number, color: string, k: number, priority: number, halo: number) {
  if (s.blackout) return;
  s.stats.levelLights++;
  s.lights.add(x, y, r, color, k, priority, halo);
}

/** Lightning in a storm: a flash every few seconds, a double flicker then a fade. */
export function lightningAt(t: number): number {
  const period = 4.5;
  const bucket = Math.floor(t / period);
  const at = 0.4 + hash2(bucket, 77) * (period - 1.2);
  const d = t - bucket * period - at;
  if (d < 0 || d > 0.5) return 0;
  if (d < 0.07) return 1;
  if (d < 0.13) return 0.25;
  if (d < 0.22) return 0.85;
  return 0.85 * (1 - (d - 0.22) / 0.28);
}

/** A jagged bolt from the clouds down behind the skyline. */
function drawBolt(c: Ctx, s: State, t: number, a: number, mono: boolean) {
  const bucket = Math.floor(t / 4.5);
  let x = Math.round(s.bw * (0.15 + hash2(bucket, 5) * 0.7));
  let y = Math.round(s.bh * 0.3);
  const end = Math.round(s.bh * 0.75);
  c.globalAlpha = a;
  c.fillStyle = mono ? '#ffffff' : '#e8eeff';
  let i = 0;
  while (y < end) {
    const step = 2 + Math.floor(hash2(bucket * 31 + i, 9) * 5);
    const dx = Math.floor(hash2(bucket * 17 + i, 3) * 5) - 2;
    for (let j = 0; j < step; j++) c.fillRect(x + Math.round((dx * j) / step), y + j, 1, 1);
    x += dx; y += step; i++;
    if (i === 6) { // a short fork
      for (let j = 0; j < 8; j++) c.fillRect(x + j, y + j, 1, 1);
    }
  }
  c.globalAlpha = 1;
}
function clamp01(x: number) { return x < 0 ? 0 : x > 1 ? 1 : x; }

// ─────────────────────────────────────────────────────────────────────────────
// Layers
// ─────────────────────────────────────────────────────────────────────────────

function stripY(s: State, layer: SkyLayer, ry: number): number {
  const viewH = s.m.dh / s.m.k;
  const ry0 = LEVEL_H - viewH;
  return Math.round((viewH + (ry0 - ry) * layer.f + layer.f * 18) * s.q) / s.q - layer.h;
}

function drawBackground(c: Ctx, s: State, rx: number, ry: number, t: number, reduced: boolean, mono: boolean) {
  const sky = s.sky as Sky;
  c.drawImage(sky.canvas, 0, 0);
  // a few stars twinkle (held steady under reduced motion)
  const tw = sky.twinkles;
  c.fillStyle = mono ? '#ffffff' : '#e8ecff';
  for (let i = 0; i < tw.length; i++) {
    const p = tw[i];
    const a = reduced ? 0.6 : 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * (1.3 + (p.seed % 1.7)) + p.seed));
    c.globalAlpha = a;
    c.fillRect(p.x, p.y, 1, 1);
    if (p.bright && a > 0.8) {
      c.globalAlpha = (a - 0.8) * 2;
      c.fillRect(p.x - 1, p.y, 1, 1); c.fillRect(p.x + 1, p.y, 1, 1);
      c.fillRect(p.x, p.y - 1, 1, 1); c.fillRect(p.x, p.y + 1, 1, 1);
    }
  }
  c.globalAlpha = 1;

  const cl = sky.clouds;
  const drift = reduced ? 0 : t * (s.rainOpts.density > 1 ? 5 : 1.5);
  drawStrip(c, cl, -mod(Math.floor((rx * cl.f + drift) * s.q) / s.q, STRIP_W), Math.round(s.bh * 0.3), s.bw);

  for (let li = 0; li < sky.layers.length; li++) {
    const L = sky.layers[li];
    const x0 = -mod(Math.floor(rx * L.f * s.q) / s.q, STRIP_W);
    const y0 = stripY(s, L, ry);
    drawStrip(c, L, x0, y0, s.bw);
  }
}

/**
 * What glows on the background, drawn after the darkness: lit rooms and
 * bulbs (each layer's glow canvas), neon and antenna lights, TVs, drips
 * from the cables, windows flickering off, and the storm's lightning bolt.
 */
function drawBackgroundGlow(c: Ctx, s: State, rx: number, ry: number, t: number, reduced: boolean, mono: boolean) {
  const sky = s.sky as Sky;
  // the moon (or the sun) gives light, so it is drawn again over the darkness:
  // its disc as baked, and a soft halo around it
  const d = sky.disc;
  s.stats.discs = 0;
  if (d && !s.blackout) {
    // the disc on a small mask, with whatever stands in front of it (the
    // clouds, the skyline: a low sun behind the cranes) cut out again
    const R = Math.ceil(d.r) + 2, size = R * 2 + 1, ox = d.x - R, oy = d.y - R;
    if (!s.discMask) s.discMask = makeCanvas(size, size);
    else if (s.discMask.canvas.width < size) resize(s.discMask.canvas, size, size);
    const mc = s.discMask.ctx;
    mc.globalCompositeOperation = 'source-over';
    mc.clearRect(0, 0, size, size);
    mc.save();
    mc.beginPath?.();
    mc.arc?.(R + 0.5, R + 0.5, d.r + 0.6, 0, Math.PI * 2);
    mc.clip?.();
    mc.drawImage(sky.canvas, ox, oy, size, size, 0, 0, size, size);
    mc.restore();
    mc.globalCompositeOperation = 'destination-out';
    const cl = sky.clouds;
    const drift = reduced ? 0 : t * (s.rainOpts.density > 1 ? 5 : 1.5);
    drawStrip(mc, cl, mod(-mod(Math.floor((rx * cl.f + drift) * s.q) / s.q, STRIP_W) - ox, STRIP_W) - STRIP_W, Math.round(s.bh * 0.3) - oy, size);
    for (let li = 0; li < sky.layers.length; li++) {
      const L = sky.layers[li];
      drawStrip(mc, L, mod(-mod(Math.floor(rx * L.f * s.q) / s.q, STRIP_W) - ox, STRIP_W) - STRIP_W, stripY(s, L, ry) - oy, size);
    }
    mc.globalCompositeOperation = 'source-over';
    c.drawImage(s.discMask.canvas, 0, 0, size, size, ox, oy, size, size);
    c.globalCompositeOperation = 'lighter';
    c.globalAlpha = 0.18;
    c.drawImage(lightSprite(lightCol(COL.moonHalo, mono)), d.x - d.r * 4, d.y - d.r * 4, d.r * 8, d.r * 8);
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
    s.stats.discs = 1;
  }
  if (s.flash > 0.5) drawBolt(c, s, t, s.flash, mono);
  for (let li = 0; li < sky.layers.length; li++) {
    const L = sky.layers[li];
    const x0 = -mod(Math.floor(rx * L.f * s.q) / s.q, STRIP_W);
    const y0 = stripY(s, L, ry);
    if (!s.blackout) {
      if (L.glow) {
        // lit rooms over the darkened facade: they glow, without burning to white
        c.globalAlpha = (L.f > 0.5 ? 0.62 : 0.9) * s.skyOpts.sky.windows;
        drawStripCanvas(c, L.glow, x0, y0, s.bw);
        c.globalAlpha = 1;
      }
      drawLayerGlow(c, s, L, li, x0, y0, t, mono);
      // a TV flickering blue in a dark room
      c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < L.tvs.length; i++) {
        const v = L.tvs[i];
        c.globalAlpha = 0.25 + 0.45 * hash2(Math.floor(t * 9), Math.floor(v.seed * 100));
        c.fillStyle = v.on;
        for (let x = x0 + v.x; x < s.bw; x += STRIP_W) if (x >= -v.w) c.fillRect(x, y0 + v.y, v.w, v.h);
      }
      c.globalAlpha = 1;
      c.globalCompositeOperation = 'source-over';
    }
    // a rare window (or billboard) flickering off, then back
    for (let i = 0; i < L.flick.length; i++) {
      const f = L.flick[i];
      if (!s.blackout && flicker(t * 0.6, f.seed) >= 1) continue;
      c.fillStyle = f.off;
      for (let x = x0 + f.x; x < s.bw; x += STRIP_W) if (x >= -f.w) c.fillRect(x, y0 + f.y, f.w, f.h);
    }
    // Lady Bird Lake: the lights glint in the water
    if (L.glints && !s.blackout) {
      c.fillStyle = mono ? '#ffffff' : '#ffe9c9';
      for (let i = 0; i < L.glints.length; i++) {
        const g = L.glints[i];
        const a = hash2(Math.floor(t * 3 + g.seed), i);
        if (a < 0.55) continue;
        c.globalAlpha = (a - 0.55) * 1.6;
        for (let x = x0 + g.x; x < s.bw; x += STRIP_W) if (x >= 0) c.fillRect(x, y0 + g.y, a > 0.9 ? 2 : 1, 1);
      }
      c.globalAlpha = 1;
    }
    // drips falling from the cables' low points
    c.fillStyle = mono ? '#d4d4d8' : '#b9c6ff';
    for (let i = 0; i < L.drips.length; i++) {
      const d = L.drips[i];
      const period = 1.4 + (d.seed % 1.3);
      const ph = mod(t * (reduced ? 0.5 : 1) + d.seed, period);
      for (let x = x0 + d.x; x < s.bw; x += STRIP_W) {
        if (x < -2) continue;
        if (ph < 0.7) {
          c.globalAlpha = 0.7;
          c.fillRect(x, y0 + d.y + Math.round(ph * ph * 140), 1, ph > 0.1 ? 2 : 1);
        } else if (ph > period - 0.5) {
          c.globalAlpha = 0.5;
          c.fillRect(x, y0 + d.y, 1, 1);
        }
      }
    }
    c.globalAlpha = 1;
  }
}

function drawStripCanvas(c: Ctx, canvas: Canvas, x: number, y: number, bw: number) {
  for (let sx = x; sx < bw; sx += STRIP_W) c.drawImage(canvas, sx, y);
}

/**
 * Neon strips and antenna lights on a skyline layer, drawn right after the
 * layer (so nearer buildings and roofs cover them). They go through the
 * darkness with the rest, so they are drawn over-bright and additive.
 */
function drawLayerGlow(c: Ctx, s: State, L: SkyLayer, li: number, x0: number, y0: number, t: number, mono: boolean) {
  if (s.blackout) return;
  const dim = (0.4 + 0.15 * li) * s.skyOpts.sky.windows;
  c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < L.neon.length; i++) {
    const n = L.neon[i];
    const k = flicker(t, n.seed);
    if (k <= 0) continue;
    for (let x = x0 + n.x; x < s.bw; x += STRIP_W) {
      if (x < -12) continue;
      c.globalAlpha = dim * k;
      c.fillStyle = n.color;
      c.fillRect(x, y0 + n.y, n.w, n.h);
      c.globalAlpha = 0.5 * dim * k;
      c.drawImage(lightSprite(n.color), x - 7, y0 + n.y - 7, n.w + 14, n.h + 14);
    }
  }
  for (let i = 0; i < L.blinks.length; i++) {
    const b = L.blinks[i];
    if (mod(t * 0.7 + b.seed, 1) >= 0.45) continue;
    for (let x = x0 + b.x; x < s.bw; x += STRIP_W) {
      if (x < -4) continue;
      c.globalAlpha = 0.8;
      c.fillStyle = mono ? '#ffffff' : COL.red;
      c.fillRect(x, y0 + b.y, 1, 1);
      c.globalAlpha = 0.45;
      c.drawImage(lightSprite(lightCol(COL.red, mono)), x - 4, y0 + b.y - 4, 9, 9);
    }
  }
  const bs = L.beacons;
  if (bs) {
    for (let i = 0; i < bs.length; i++) {
      const b = bs[i];
      const ph = mod(t + b.seed, b.strobe ? 1.3 : 1);
      if (b.strobe ? !(ph < 0.06 || (ph > 0.14 && ph < 0.2)) : ph >= 0.5) continue;
      const color = lightCol(b.color, mono);
      for (let x = x0 + b.x; x < s.bw; x += STRIP_W) {
        if (x < -6) continue;
        c.globalAlpha = 1;
        c.fillStyle = color;
        c.fillRect(x, y0 + b.y, 1, 1);
        c.globalAlpha = b.strobe ? 0.8 : 0.55;
        c.drawImage(lightSprite(color), x - 6, y0 + b.y - 6, 13, 13);
      }
    }
  }
  c.globalAlpha = 1;
  c.globalCompositeOperation = 'source-over';
}

/** Columns of the next chunk baked per frame, so entering a chunk never bakes it all at once. */
const PREFETCH_COLS = 8;

function prefetchChunk(s: State, level: Level, dir: number, lastChunk: number) {
  const next = dir > 0 ? s.span.last + 1 : s.span.first - 1;
  if (next < 0 || next > lastChunk || s.chunks.has(next)) return;
  const p = s.pre;
  if (p.index !== next) { p.index = next; p.col = 0; }
  const to = Math.min(CHUNK_COLS, p.col + PREFETCH_COLS);
  p.chunk = bakeChunkPart(p.chunk, s.theme as PixelTheme, level, s.decor ?? [], next, s.mono, p.col, to);
  p.col = to;
  if (to < CHUNK_COLS) return;
  p.chunk = s.chunks.adopt(next, p.chunk);
  p.index = -1;
}

function bumpPx(w: World, tx: number, ty: number): number {
  const b = w.bumps;
  for (let i = 0; i < b.length; i++) if (b[i].tx === tx && b[i].ty === ty) return Math.round(Math.sin((b[i].t / 0.18) * Math.PI) * 4.5);
  return 0;
}

function drawDynamicTiles(c: Ctx, s: State, w: World, ta: Atlas, layer: 'base' | 'glow', t: number) {
  const cols = w.level.cols;
  const c0 = Math.max(0, Math.floor(s.ox / ART_TILE)), c1 = Math.min(cols - 1, Math.floor((s.ox + s.bw) / ART_TILE));
  const r0 = Math.max(0, Math.floor(s.oy / ART_TILE)), r1 = Math.min(ROWS - 1, Math.floor((s.oy + s.bh) / ART_TILE));
  const coin = layer === 'glow' ? atlas(PICKUPS.coin, s.mono) : null;
  for (let ty = r0; ty <= r1; ty++) {
    for (let tx = c0; tx <= c1; tx++) {
      const k = KIND[w.tiles[ty * cols + tx]];
      // walkways and thin clouds belong to the theme's own tile layer
      if (k === K.EMPTY || k === K.ROOF || k === K.STONE || k === K.SPIKE || k === K.ONEWAY || k === K.WALK || k === K.PUFF || k === K.AWNING || k === K.WATER || k === K.GATE || k === K.CABLE) continue;
      const x = tx * ART_TILE - s.ox, y = ty * ART_TILE - s.oy;
      if (k === K.COIN || k === K.SIGMA) {
        if (!coin) continue;
        const bob = Math.round(Math.sin(t * 3 + tx * 0.9) * 1);
        drawFrame(c, coin, 'spin', t * (k === K.SIGMA ? 8 : 12) + tx * 0.7, x + 8, y + 8 + bob, 1);
        if (k === K.SIGMA) {
          // the golden Sigma coin: two sparkles circling it
          c.fillStyle = s.mono ? '#ffffff' : '#fff6c8';
          for (let j = 0; j < 2; j++) {
            const a = t * 3 + j * Math.PI;
            const sx = x + 8 + Math.round(Math.cos(a) * 9), sy = y + 8 + bob + Math.round(Math.sin(a) * 5);
            c.fillRect(sx, sy, 1, 1);
            if (((t * 4) | 0) % 2 === j) { c.fillRect(sx - 1, sy, 3, 1); c.fillRect(sx, sy - 1, 1, 3); }
          }
        }
        continue;
      }
      if (k === K.CRACK) {
        if (layer === 'base' && !(s.theme as PixelTheme).drawsCracks) drawCrack(c, ta, x, y, tx, ty, s.mono);
        continue;
      }
      if (k === K.CRATE) {
        if (layer === 'base' && !(s.theme as PixelTheme).drawsCrates) drawFrame(c, atlas(BREAKABLES.crate, s.mono), 'idle', (tx + ty) % 2, x + 8, y + 16, 1);
        continue;
      }
      const anim = k === K.BRICK ? 'brick' : k === K.AURA ? 'auraBlock' : 'auraBlockUsed';
      drawFrame(c, ta, anim, 0, x, y - bumpPx(w, tx, ty), 1, layer);
    }
  }
}

/** A cracked wall: the building's brick with a lightning-shaped split, so a dash reads as the way through. */
function drawCrack(c: Ctx, ta: Atlas, x: number, y: number, tx: number, ty: number, mono: boolean) {
  drawFrame(c, ta, 'roofFill', (tx + ty) % 3, x, y, 1);
  c.fillStyle = mono ? '#050505' : '#06040d';
  const o = (tx * 5 + ty * 3) % 4;
  // a jagged split top to bottom, with a branch
  for (let j = 0; j < 16; j++) {
    const cx = x + 6 + o + ((j >> 2) % 2 ? 1 : -1) * ((j & 3) < 2 ? 1 : 0) + (j > 8 ? 2 : 0);
    c.fillRect(cx, y + j, 1, 1);
    if (j === 6 || j === 7) c.fillRect(cx + 1 + (j - 6) * 2, y + j + 1, 2, 1);
  }
  c.fillStyle = mono ? '#8a8a93' : '#6a5a9a';
  c.fillRect(x + 7 + o, y + 3, 1, 1);
  c.fillRect(x + 9 + o, y + 11, 1, 1);
}

/** Pooled shots from elite drones: hot pellets with a short trail, glowing. */
function drawShots(c: Ctx, s: State, w: World, layer: 'base' | 'glow') {
  const list = (w as unknown as { shots?: readonly { x: number; y: number; vx: number; vy: number; t: number }[] }).shots;
  if (!Array.isArray(list)) return;
  for (let i = 0; i < list.length; i++) {
    const b = list[i];
    if (!(b.t > 0)) continue;
    const x = Math.round(b.x * ART_TILE) - s.ox, y = Math.round(b.y * ART_TILE) - s.oy;
    if (x < -8 || x > s.bw + 8 || y < -8 || y > s.bh + 8) continue;
    if (layer === 'base') { levelLight(s, x, y, 18, lightCol(COL.shot, s.mono), 0.9, 1, 0.6); continue; }
    const sp = Math.max(1e-6, Math.abs(b.vx) + Math.abs(b.vy));
    const tx = -Math.round((b.vx / sp) * 2), ty = -Math.round((b.vy / sp) * 2);
    c.fillStyle = col(COL.shot, s.mono);
    c.globalAlpha = 0.5;
    c.fillRect(x + tx * 2 - 1, y + ty * 2, 2, 1);
    c.globalAlpha = 1;
    c.fillRect(x + tx - 1, y + ty - 1, 2, 2);
    c.fillRect(x - 1, y - 2, 3, 4); c.fillRect(x - 2, y - 1, 5, 2);
    c.fillStyle = s.mono ? '#ffffff' : '#fff1c2';
    c.fillRect(x, y - 1, 1, 2);
  }
}

/** Animated decor (the breakable sign, the goal, anything whose art moves), base or glow layer, and their lights. */
function drawDecor(c: Ctx, s: State, w: World, th: PixelTheme, layer: 'base' | 'glow', t: number, reduced: boolean) {
  const list = decorOf(w);
  const goalKind = th.goal.kind;
  let goal = false;
  for (let i = 0; i < list.length; i++) {
    const d = list[i];
    if (d.kind === goalKind) goal = true;
    if (th.frontDecor?.[d.kind]) continue;
    const sign = d.kind === 'neonSign';
    if (!sign && d.kind !== goalKind && isStaticDecor(th, d.kind)) continue;
    const a = sign ? atlas(th.sign(s.seed, w.levelIndex, i), s.mono, th.signGlow ?? th.glow) : decorAtlas(th, d.kind, s.mono);
    if (!a) continue;
    const x = Math.round(d.x * ART_TILE) - s.ox;
    const bottom = Math.round(decorBottom(d) * ART_TILE) - s.oy;
    if (x > s.bw || x + a.w < 0) continue;
    if (sign) drawSign(c, s, th, a, x, bottom, i, layer, t, reduced);
    else if (d.kind === goalKind) drawGoalPiece(c, s, w, th, a, x, bottom, layer, t, reduced);
    else drawFrame(c, a, 'idle', decorFrame(th, d.kind, i, reduced ? 0 : t), x, bottom, 1, layer);
  }
  // A level without its goal in the decor ends at the goal (or the flag pole): put it there.
  if (!goal) {
    const g = (w.level as { goal?: { x: number; top: number; base: number } }).goal ?? w.level.pole;
    const a = decorAtlas(th, goalKind, s.mono);
    if (!a) return;
    const x = g.x * ART_TILE - s.ox, floor = (g.base + 1) * ART_TILE - s.oy;
    if (x > s.bw || x + a.w < 0) return;
    if (th.goal.mast) {
      // The lamp sits at the goal's top; a taller goal gets a longer mast down to the roof.
      const top = Math.min(g.top * ART_TILE - s.oy, floor - a.h);
      const bottom = top + a.h;
      if (layer === 'base' && floor > bottom) drawMast(c, x, bottom - 2, floor, s.mono);
      drawGoalPiece(c, s, w, th, a, x, bottom, layer, t, reduced);
    } else drawGoalPiece(c, s, w, th, a, x, floor, layer, t, reduced);
  }
}

/** Decor she passes behind (a cloud that only looks solid): drawn over her, lit like the playfield. */
function drawFrontDecor(c: Ctx, s: State, w: World, th: PixelTheme, layer: 'base' | 'glow') {
  const list = decorOf(w);
  for (let i = 0; i < list.length; i++) {
    const d = list[i];
    if (!th.frontDecor?.[d.kind]) continue;
    const a = decorAtlas(th, d.kind, s.mono);
    if (!a) continue;
    const x = Math.round(d.x * ART_TILE) - s.ox, bottom = Math.round(decorBottom(d) * ART_TILE) - s.oy;
    if (x > s.bw || x + a.w < 0) continue;
    drawFrame(c, a, 'idle', decorFrame(th, d.kind, i, 0), x, bottom, 1, layer);
  }
}

/** Memories not tucked inside front decor (those show only their warm light through it). */
function unhidden(s: State, w: World, th: PixelTheme, list: readonly Memory[]): readonly Memory[] {
  const out = s.memShown;
  out.length = 0;
  const decor = decorOf(w);
  for (let i = 0; i < list.length; i++) {
    const m = list[i];
    const mx = (m.x + 0.5) * ART_TILE, my = (m.y + 0.5) * ART_TILE;
    let hidden = false;
    for (let j = 0; j < decor.length && !hidden; j++) {
      const d = decor[j];
      if (!th.frontDecor?.[d.kind]) continue;
      const set = th.decor[d.kind];
      if (!set) continue;
      const left = d.x * ART_TILE, bottom = decorBottom(d) * ART_TILE;
      hidden = mx >= left + 2 && mx <= left + set.size.w - 2 && my <= bottom && my >= bottom - set.size.h + 2;
    }
    if (!hidden) out.push(m);
  }
  return out;
}

/** The beacon's lattice mast, continued below the sprite: three tones and a rung every 6 px. */
function drawMast(c: Ctx, x: number, from: number, to: number, mono: boolean) {
  const n = col('#7d9bb6', mono), l = col('#2f445e', mono), j = col('#0f1828', mono), m = col('#4a6684', mono), k = col('#1c2a40', mono);
  c.fillStyle = n; c.fillRect(x + 3, from, 1, to - from);
  c.fillStyle = l; c.fillRect(x + 4, from, 1, to - from);
  c.fillStyle = j; c.fillRect(x + 5, from, 1, to - from);
  for (let y = from + 4; y < to - 1; y += 6) {
    c.fillStyle = m; c.fillRect(x + 2, y, 1, 1);
    c.fillStyle = k; c.fillRect(x + 6, y, 1, 1);
  }
  // a foot plate on the roof
  c.fillStyle = l; c.fillRect(x + 1, to - 1, 7, 1);
}

/**
 * The frame of animated decor: its own timeline, or (a theme's animDecor)
 * a cycle of `frames` at `fps`, the decoration's index picking the cycle.
 */
function decorFrame(th: PixelTheme, kind: string, i: number, t: number): number {
  const cyc = th.animDecor?.[kind];
  const phase = t + i * 0.37;
  if (!cyc) return phase * (th.decor[kind]?.anims.idle.fps ?? 0);
  const total = th.decor[kind]?.anims.idle.frames.length ?? cyc.frames;
  const cycles = Math.max(1, Math.floor(total / cyc.frames));
  return (i % cycles) * cyc.frames + (Math.floor(phase * cyc.fps) % cyc.frames);
}

function drawSign(c: Ctx, s: State, th: PixelTheme, a: Atlas, x: number, bottom: number, seed: number, layer: 'base' | 'glow', t: number, reduced: boolean) {
  // In a blackout the sign is dead but for a rare sputter.
  const k = s.blackout ? (flicker(t * 0.5, seed + 0.9) < 1 ? 0.6 : 0) : reduced ? 1 : flicker(t * 0.8, seed + 0.37);
  drawFrame(c, a, 'idle', k < 1 ? 1 : 0, x, bottom, 1, layer);
  if (s.blackout && k === 0) return;
  const color = lightCol(th.signLight, s.mono);
  if (layer === 'base') {
    // the level's own light sits at the sign's left end; this one fills the middle
    levelLight(s, x + 24, bottom - 8, 40, color, 0.6 * Math.max(0.25, k), 2, 0);
  } else if (k > 0) {
    c.globalCompositeOperation = 'lighter';
    c.globalAlpha = 0.32 * k;
    c.drawImage(lightSprite(color), x - 14, bottom - 30, 76, 44);
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
  }
}

/** The goal: looping, or (fps 0) its frames played once as she comes near; plus its lights. */
function drawGoalPiece(c: Ctx, s: State, w: World, th: PixelTheme, a: Atlas, x: number, bottom: number, layer: 'base' | 'glow', t: number, reduced: boolean) {
  const g = th.goal;
  let frame = 0;
  if (g.fps > 0) frame = reduced ? 0 : t * g.fps;
  else {
    const n = a.rects.idle ? a.rects.idle.length : 1;
    const dist = Math.abs(x + a.w / 2 - (w.hero.x + w.hero.w / 2) * ART_TILE + s.ox) / ART_TILE;
    frame = Math.max(0, Math.min(n - 1, Math.floor(((14 - dist) / 10) * n)));
  }
  x += g.dx ?? 0;
  const lift = g.lift ?? 0;
  if (lift > 0) {
    // a raised goal: one row (its columns, or its plinth) carried down so its roof meets the level's
    const r = rectOf(a, 'idle', frame);
    const src = layer === 'glow' ? a.glow : a.sheet;
    const k = Math.max(0, Math.min(r.h - 1, g.liftRow ?? r.h - 1));
    const top = bottom - lift - r.h;
    if (src) {
      c.drawImage(src, r.x, r.y, r.w, k, x, top, r.w, k);
      c.drawImage(src, r.x, r.y + k, r.w, 1, x, top + k, r.w, lift + 1);
      c.drawImage(src, r.x, r.y + k + 1, r.w, r.h - k - 1, x, top + k + lift + 1, r.w, r.h - k - 1);
    }
    bottom -= lift;
  } else drawFrame(c, a, 'idle', frame, x, bottom, 1, layer);
  if (layer !== 'base') return;
  for (let i = 0; i < g.lights.length; i++) {
    const L = g.lights[i];
    levelLight(s, x + L.dx, bottom + L.dy, L.r, lightCol(L.color, s.mono), L.k, L.priority, L.halo);
  }
}

/** Static decor still casts light: water tower lamps, antenna beacons, wing lights. */
function decorLights(s: State, w: World, th: PixelTheme, t: number) {
  const list = decorOf(w);
  const table = th.decorLights;
  for (let i = 0; i < list.length; i++) {
    const d = list[i];
    const L = table[d.kind];
    if (!L) continue;
    const x = d.x * ART_TILE - s.ox;
    if (x > s.bw + 40 || x < -80) continue;
    const bottom = decorBottom(d) * ART_TILE - s.oy;
    const color = lightCol(L.colors[i % L.colors.length], s.mono);
    if (L.blink > 0) {
      const on = mod(t * L.blink + i * 0.37, 1) < 0.5;
      levelLight(s, x + L.dx, bottom + L.dy, on ? L.r : L.r * 0.5, color, on ? L.k : 0.35, 1, on ? L.halo : L.halo * 0.25);
    } else levelLight(s, x + L.dx, bottom + L.dy, L.r, color, L.k, 1, L.halo);
  }
}

function drawCheckpoint(c: Ctx, s: State, w: World, th: PixelTheme, layer: 'base' | 'glow') {
  const cp = w.level.checkpoint;
  if (!cp) return;
  const a = decorAtlas(th, th.checkpoint, s.mono);
  if (!a) return;
  const x = cp.x * ART_TILE - s.ox, bottom = cp.y * ART_TILE - s.oy;
  if (x > s.bw || x + a.w < 0) return;
  drawFrame(c, a, 'idle', 0, x, bottom, 1, layer);
  if (layer === 'base') levelLight(s, x + a.w / 2 - 0.5, bottom - (a.h - 2), w.checkpointHit ? 40 : 16, lightCol(w.checkpointHit ? COL.cyan : COL.red, s.mono), w.checkpointHit ? 1 : 0.5, 2, 0.5);
}

function drawPlatforms(c: Ctx, s: State, w: World, ta: Atlas, a: number) {
  for (let i = 0; i < w.platforms.length; i++) {
    const p = w.platforms[i];
    const x = Math.round((p.px + (p.x - p.px) * a) * ART_TILE) - s.ox;
    const y = Math.round((p.py + (p.y - p.py) * a) * ART_TILE) - s.oy;
    for (let j = 0; j < p.w; j++) drawFrame(c, ta, 'oneWay', 0, x + j * ART_TILE, y, 1);
  }
}

function drawEnemies(c: Ctx, s: State, w: World, th: PixelTheme, a: number, t: number, layer: 'base' | 'glow') {
  const fly = th.enemies.flyer, walk = th.enemies.walker;
  const drone = atlas(fly.set, s.mono, fly.glow);
  const crawler = atlas(walk.set, s.mono, walk.glow);
  for (let i = 0; i < w.enemies.length; i++) {
    const e = w.enemies[i];
    const ex = Math.round((e.px + (e.x - e.px) * a + e.w / 2) * ART_TILE) - s.ox;
    const ey = Math.round((e.py + (e.y - e.py) * a + e.h) * ART_TILE) - s.oy;
    if (ex < -20 || ex > s.bw + 20) continue;
    const kind = e.kind as string;
    const elite = kind === 'eliteDrone';
    const isDrone = elite || kind === 'frog' || !!(ENEMY_KINDS as Readonly<Record<string, { flies: boolean }>>)[kind]?.flies;
    const dead = e.deadT !== -1;
    if (dead) c.globalAlpha = clamp01(e.deadT / 0.45);
    if (isDrone) {
      const mode = (e as { mode?: string }).mode;
      const anim = dead ? fly.dead : (mode ? mode === 'dive' : e.vy > 2) ? (fly.dive ?? 'dive') : fly.move;
      drawFrame(c, drone, anim, t * 12 + i, ex, ey, e.dir, layer);
      if (elite && layer === 'base') {
        // the rare gold drone: the same body washed in gold
        c.globalCompositeOperation = 'lighter';
        c.globalAlpha *= 0.45;
        drawTinted(c, drone, tinted(drone, col(COL.elite, s.mono)), anim, t * 12 + i, ex, ey, e.dir);
        c.globalCompositeOperation = 'source-over';
      }
      if (layer === 'base' && !dead) levelLight(s, ex, ey - 8, elite ? 28 : 20, lightCol(elite ? COL.elite : fly.light, s.mono), elite ? 0.9 : 0.7, elite ? 1 : 0, elite ? 0.6 : 0.45);
    } else {
      // a hopper plays its hop once per sim hop and stands still between them
      const hop = walk.hop, hopT = (e as { hopT?: number }).hopT;
      const since = hop && typeof hopT === 'number' ? hop.every - hopT : -1;
      const frame = !hop ? t * 8 + i * 0.5 : since >= 0 && since * hop.fps < hop.frames ? since * hop.fps : 0;
      drawFrame(c, crawler, dead ? walk.dead : walk.move, frame, ex, ey, e.dir, layer);
      if (layer === 'base' && !dead) levelLight(s, ex + e.dir * 3, ey - 6, 14, lightCol(walk.light, s.mono), 0.8, 0, 0.5);
    }
    c.globalAlpha = 1;
  }
}

function drawPickups(c: Ctx, s: State, w: World, t: number, reduced: boolean, layer: 'base' | 'glow') {
  const list = pickupsOf(w);
  for (let i = 0; i < list.length; i++) {
    const p = list[i];
    if (p.taken) continue;
    const set = pickupSet(p.kind);
    const x = Math.round((p.x + 0.5) * ART_TILE) - s.ox;
    const y = Math.round((p.y + 0.5) * ART_TILE + (reduced ? 0 : Math.sin(t * 2.6 + i) * 2)) - s.oy;
    if (x < -20 || x > s.bw + 20) continue;
    if (layer === 'glow') { const a = atlas(set, s.mono); drawFrame(c, a, Object.keys(a.rects)[0], t * 8, x, y, 1); }
    else s.lights.add(x, y, 34, lightCol(POWER_COLOR[p.kind] ?? COL.violet, s.mono), 0.95, 1, 0.6);
  }
  // the sword that gives the blade
  const sword = (w as unknown as { sword?: { x: number; y: number; taken: boolean } | null }).sword;
  if (sword && !sword.taken) {
    const x = Math.round((sword.x + 0.5) * ART_TILE) - s.ox;
    const y = Math.round((sword.y + 0.5) * ART_TILE + (reduced ? 0 : Math.sin(t * 2.2) * 2)) - s.oy;
    if (layer === 'glow') drawFrame(c, atlas(POWERUPS.blade, s.mono), 'idle', t * 8, x, y, 1);
    else s.lights.add(x, y, 36, lightCol(COL.cyan, s.mono), 1, 2, 0.7);
  }
  // the old Aura Crown power-up and coins popping out of blocks
  if (layer !== 'glow') return;
  const orb = atlas(PICKUPS.auraOrb, s.mono);
  for (let i = 0; i < w.crowns.length; i++) {
    const cr = w.crowns[i];
    drawFrame(c, orb, 'idle', t * 8, Math.round((cr.x + cr.w / 2) * ART_TILE) - s.ox, Math.round((cr.y + cr.h / 2) * ART_TILE) - s.oy, 1);
  }
  const coin = atlas(PICKUPS.coin, s.mono);
  for (let i = 0; i < w.pops.length; i++) {
    const p = w.pops[i];
    const k = p.t / 0.55;
    c.globalAlpha = 1 - k * k;
    drawFrame(c, coin, 'spin', p.t * 30, Math.round((p.x + 0.5) * ART_TILE) - s.ox, Math.round((p.y - 0.6 - Math.sin(k * Math.PI) * 1.4) * ART_TILE) - s.oy, 1);
  }
  c.globalAlpha = 1;
}

function coinLights(s: State, w: World, double: boolean) {
  const cols = w.level.cols;
  const c0 = Math.max(0, Math.floor(s.ox / ART_TILE)), c1 = Math.min(cols - 1, Math.floor((s.ox + s.bw) / ART_TILE));
  const r0 = Math.max(0, Math.floor(s.oy / ART_TILE)), r1 = Math.min(ROWS - 1, Math.floor((s.oy + s.bh) / ART_TILE));
  const color = lightCol(COL.sodium, s.mono);
  // coins are a light source of their own in a blackout, and brighter with double aura
  const r = double ? 24 : s.blackout ? 22 : 16, kk = double ? 1 : s.blackout ? 0.8 : 0.55, halo = double ? 0.75 : 0.3;
  s.stats.coinGlow = halo;
  for (let ty = r0; ty <= r1; ty++) {
    for (let tx = c0; tx <= c1; tx++) {
      const k = KIND[w.tiles[ty * cols + tx]];
      if (k === K.COIN) s.lights.add(tx * ART_TILE + 8 - s.ox, ty * ART_TILE + 8 - s.oy, r, color, kk, 0, halo);
      else if (k === K.SIGMA) s.lights.add(tx * ART_TILE + 8 - s.ox, ty * ART_TILE + 8 - s.oy, r * 2, color, 1, 1, 0.9);
      else if (k === K.AURA) levelLight(s, tx * ART_TILE + 8 - s.ox, ty * ART_TILE + 8 - s.oy, 22, lightCol(COL.violet, s.mono), 0.6, 0, 0.3);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Hero, scarf, afterimages
// ─────────────────────────────────────────────────────────────────────────────

interface HeroDraw { x: number; y: number; neckX: number; neckY: number; facing: 1 | -1; anim: string; frame: number; dw: number; dh: number; visible: boolean }
const PLACE: Placement = { hx: 0, hy: 0, camX: 0, camY: 0, anchorX: 0, anchorY: 0, rx: 0, ry: 0 };
const HD: HeroDraw = { x: 0, y: 0, neckX: 0, neckY: 0, facing: 1, anim: 'idle', frame: 0, dw: 0, dh: 0, visible: true };

function poseHero(s: State, w: World, feetX: number, feetY: number): HeroDraw {
  const p = readHero(s.pose, w);
  const pick = pickHeroAnim(s.pick, p);
  const anim = pick.anim as HeroAnim;
  const necks = HERO_NECK[anim] ?? HERO_NECK.idle;
  const n = necks[pick.frame % necks.length];
  // land squash: a couple of pixels shorter and wider, easing out
  const sq = p.state === 'ground' && p.landT >= 0 && p.landT < 0.12 ? 1 - p.landT / 0.12 : 0;
  HD.dh = -Math.round(3 * sq);
  HD.dw = Math.round(2 * sq);
  HD.x = feetX; HD.y = feetY;
  HD.facing = pick.facing;
  HD.anim = anim; HD.frame = pick.frame;
  const h = HERO.size.h;
  HD.neckX = feetX - HERO.anchor.x + (pick.facing > 0 ? n.x : HERO.size.w - 1 - n.x);
  HD.neckY = feetY - Math.round(((h - n.y) * (h + HD.dh)) / h);
  const blink = w.invuln > 0 && w.phase === 'play' && Math.floor(w.invuln * 12) % 2 === 0;
  HD.visible = !w.hidden && !blink;
  return HD;
}

/** Scarf points in buffer pixels into s.sx/s.sy; [0] is pinned to the sprite's neck. */
function scarfPoints(s: State, w: World, hd: HeroDraw, t: number, reduced: boolean): number {
  const pts = scarfOf(w);
  s.sx[0] = hd.neckX; s.sy[0] = hd.neckY;
  if (pts.length >= 2) {
    const n = Math.min(SCARF_N, pts.length);
    // keep the sim's rope shape, moved so its root sits on the drawn neck
    const dx = hd.neckX - (pts[0].x * ART_TILE - s.ox), dy = hd.neckY - (pts[0].y * ART_TILE - s.oy);
    // it never hangs through the roof he stands on
    const floor = hd.y - 1;
    // a little flutter on top of the rope, stronger towards the tail and with speed
    const flap = reduced ? 0 : Math.min(1, Math.abs(s.pose.vx) / 6) * 1.4;
    // a double jump flicks the scarf: the tail whips up and out
    const fa = t - s.flickAt;
    const wa = s.action.whipAge(t);
    const flick = reduced ? 0 : fa >= 0 && fa < FLICK_LIFE ? Math.sin((fa / FLICK_LIFE) * Math.PI) : wa >= 0 ? -Math.sin((wa / 0.2) * Math.PI) * 0.8 : 0;
    for (let i = 1; i < n; i++) {
      const k = 1 - i / n, f = i / n;
      s.sx[i] = pts[i].x * ART_TILE - s.ox + dx * k - hd.facing * flick * 3 * f;
      s.sy[i] = Math.min(floor, pts[i].y * ART_TILE - s.oy + dy * k + Math.sin(t * 15 - i * 0.9) * flap * f - flick * 7 * f);
    }
    return n;
  }
  // No rope from the sim yet: a short trailing scarf that flutters.
  const speed = Math.min(1, Math.abs(s.pose.vx) / 8);
  for (let i = 1; i < SCARF_N; i++) {
    const wave = reduced ? 0 : Math.sin(t * 10 - i * 0.8) * (0.3 + speed * 0.5) * i * 0.35;
    s.sx[i] = hd.neckX - hd.facing * i * (1.4 + speed * 1.1);
    s.sy[i] = hd.neckY + i * (0.9 - speed * 0.6) + wave;
  }
  return SCARF_N;
}

/** A pixel line through the scarf points: 2 px edge, 1 px core, thinning at the tail. */
function drawScarf(c: Ctx, s: State, n: number, edge: string, core: string, coreOnly: boolean) {
  for (let pass = coreOnly ? 1 : 0; pass < 2; pass++) {
    c.fillStyle = pass === 0 ? edge : core;
    for (let i = 0; i < n - 1; i++) {
      const x0 = s.sx[i], y0 = s.sy[i], x1 = s.sx[i + 1], y1 = s.sy[i + 1];
      const steps = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
      const thick = pass === 0 ? (i < n - 3 ? 2 : 1) : 1;
      if (pass === 1 && i >= n - 2) break;
      for (let j = 0; j < steps; j++) {
        const f = j / steps;
        c.fillRect(Math.round(x0 + (x1 - x0) * f), Math.round(y0 + (y1 - y0) * f), thick, thick);
      }
    }
  }
}

function drawAfterimages(c: Ctx, s: State, w: World, hero: Atlas) {
  const list = afterimagesOf(w);
  if (!list.length) return;
  const hw = w.hero.w, hh = w.hero.h;
  c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < list.length; i++) {
    const g = list[i];
    if (g.t <= 0) continue;
    const t = tinted(hero, lightCol(i % 2 ? COL.cyan : COL.magenta, s.mono));
    c.globalAlpha = 0.6 * clamp01(g.t / AFTERIMAGE_LIFE);
    drawTinted(c, hero, t, 'dash', 0, Math.round((g.x + hw / 2) * ART_TILE) - s.ox, Math.round((g.y + hh) * ART_TILE) - s.oy, g.facing);
  }
  c.globalAlpha = 1;
  c.globalCompositeOperation = 'source-over';
}

// ─────────────────────────────────────────────────────────────────────────────
// Light, glow, particles, screen effects
// ─────────────────────────────────────────────────────────────────────────────

function worldLights(s: State, w: World, t: number, reduced: boolean) {
  if (s.blackout) return;
  const list = lightsOf(w);
  for (let i = 0; i < list.length; i++) {
    const L = list[i];
    const amp = (L.flicker || 0) * (reduced ? 0.5 : 1);
    const k = amp > 0 ? 1 - amp * (1 - flicker(t, i * 3.7 + 0.1)) : 1;
    levelLight(s, L.x * ART_TILE - s.ox, L.y * ART_TILE - s.oy, Math.max(1, L.r) * ART_TILE, lightCol(L.color, s.mono), k, 4, 0.35 * k);
  }
}

/**
 * Darkness and lights: one light map, multiplied over the background (so
 * neon spills on the buildings behind), then masked to the playfield's
 * pixels and multiplied over the playfield.
 */
function lightPass(bg: Ctx, sc: Buffers, s: State) {
  const L = s.light as Buffers;
  const lc = L.ctx;
  lc.globalCompositeOperation = 'source-over';
  lc.globalAlpha = 1;
  lc.drawImage((s.blackout ? s.lightBaseDark : s.lightBase) as Canvas, 0, 0);
  lc.globalCompositeOperation = 'lighter';
  if (s.flash > 0) {
    // lightning lights the whole scene for a moment
    lc.globalAlpha = s.flash * 0.75;
    lc.fillStyle = lightCol(COL.lightning, s.mono);
    lc.fillRect(0, 0, s.bw, s.bh);
  }
  const slots = s.lights.slots;
  for (let i = 0; i < s.lights.count; i++) {
    const l = slots[i];
    lc.globalAlpha = l.k * s.skyOpts.sky.lightK;
    lc.drawImage(lightSprite(l.color), l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
  }
  lc.globalAlpha = 1;
  bg.globalCompositeOperation = 'multiply';
  bg.drawImage(L.canvas, 0, 0);
  bg.globalCompositeOperation = 'source-over';
  // The playfield mask is cut at the playfield's own resolution: the light map
  // is blown up to it first, so a sprite edge on a sub-pixel never lets the
  // light colour leak round it as a pale outline.
  const Q = s.lightQ as Buffers;
  const qc = Q.ctx;
  qc.setTransform?.(1, 0, 0, 1, 0, 0);
  qc.imageSmoothingEnabled = false;
  qc.globalAlpha = 1;
  qc.globalCompositeOperation = 'copy';
  qc.drawImage(L.canvas, 0, 0, Q.canvas.width, Q.canvas.height);
  qc.globalCompositeOperation = 'destination-in';
  qc.drawImage(sc.canvas, 0, 0);
  qc.globalCompositeOperation = 'source-over';
  sc.ctx.globalCompositeOperation = 'multiply';
  sc.ctx.drawImage(Q.canvas, 0, 0, s.bw, s.bh);
  sc.ctx.globalCompositeOperation = 'source-over';
}

/** Puddles (and polished floors) mirror the strongest light near them in a one or two pixel strip, shimmering. */
function drawPuddles(c: Ctx, s: State, lastChunk: number, t: number, reduced: boolean, mono: boolean, rainy: boolean) {
  const slots = s.lights.slots;
  const sky = mono ? '#5a5a62' : '#3a3466';
  for (let ci = s.span.first; ci <= Math.min(s.span.last, lastChunk); ci++) {
    if (!s.chunks.has(ci)) continue;
    const p = s.chunks.get(ci).puddles;
    const cx = ci * CHUNK_PX - s.ox;
    for (let i = 0; i < p.length; i += 3) {
      const x = cx + p[i], y = p[i + 1] - s.oy, w = p[i + 2];
      if (x > s.bw || x + w < 0) continue;
      let best = 0, color = sky;
      for (let j = 0; j < s.lights.count; j++) {
        const l = slots[j];
        const dx = l.x - (x + w / 2), dy = l.y - y;
        const d = Math.sqrt(dx * dx + dy * dy * 0.5);
        const f = l.k * (1 - d / (l.r * 1.6));
        if (f > best) { best = f; color = l.color; }
      }
      const shim = reduced ? 0 : Math.floor(hash2(Math.floor(t * 7), i) * 3) - 1;
      c.globalAlpha = 0.3 + 0.6 * clamp01(best);
      c.fillStyle = color;
      c.fillRect(x + 1 + Math.max(0, shim), y, w - 2 - Math.abs(shim), 1);
      c.globalAlpha *= 0.45;
      c.fillRect(x + 2, y + 1, w - 4, 1);
      // a raindrop ringing the puddle now and then
      if (rainy && !reduced && hash2(Math.floor(t * 12), i * 7 + ci) < 0.06) {
        c.globalAlpha = 0.8;
        c.fillStyle = mono ? '#ffffff' : '#dfe6ff';
        c.fillRect(x + 1 + Math.floor(hash2(i, Math.floor(t * 12)) * (w - 2)), y, 1, 1);
      }
    }
  }
  c.globalAlpha = 1;
}

/** Door lamps baked into the chunks on screen. */
function chunkLamps(s: State, lastChunk: number) {
  const color = lightCol(COL.sodium, s.mono);
  for (let ci = s.span.first; ci <= Math.min(s.span.last, lastChunk); ci++) {
    if (!s.chunks.has(ci)) continue;
    const L = s.chunks.get(ci).lamps;
    const cx = ci * CHUNK_PX - s.ox;
    for (let i = 0; i < L.length; i += 2) levelLight(s, cx + L[i], L[i + 1] - s.oy + 2, 30, color, 0.85, 1, 0.4);
  }
}

/** The world title card, and the level-clear tally, pixel-native in the buffer. */
function drawPixelCards(c: Ctx, s: State, w: World, dt: number, reduced: boolean, mono: boolean) {
  s.stats.card = '';
  if (w.cardT > 0 && w.phase === 'play') {
    const k = s.card;
    const mod = modifierNameOf(w);
    s.stats.card = mod;
    if (!k.art || k.level !== w.level || k.mod !== mod || k.bw !== s.bw || k.mono !== mono) {
      k.art = bakeTitle(w.level.label, w.level.name, mod, modifierOf(w), s.bw, mono);
      k.level = w.level; k.mod = mod; k.bw = s.bw; k.mono = mono;
    }
    const elapsed = CARD_SECONDS - w.cardT;
    cardWipe(s.wipe, elapsed, w.cardT, reduced);
    const top = Math.max(26, Math.round(s.bh * 0.3 - k.art.h / 2));
    drawCard(c, k.art, s.bw, top, s.wipe, elapsed, w.t, reduced);
  }
  const tl = s.tally;
  if (w.phase === 'tally') {
    tl.t += dt;
    const title = w.secretUnlocked && w.levelIndex === 2 ? 'SECRET UNLOCKED' : 'LEVEL CLEARED';
    if (!tl.art || tl.title !== title || tl.bw !== s.bw || tl.mono !== mono) {
      tl.art = bakeTally(title, s.bw, mono);
      tl.title = title; tl.bw = s.bw; tl.mono = mono;
    }
    cardWipe(s.wipe, tl.t, 9, reduced);
    const top = Math.max(26, Math.round(s.bh * 0.36 - tl.art.h / 2));
    drawCard(c, tl.art, s.bw, top, s.wipe, tl.t, w.t, reduced);
    if (s.wipe.to >= 1) {
      const tv = tallyView(w);
      drawTallyNumbers(c, tl.art, s.bw, top, tv.kills, tv.time, tv.par, !w.pendingClear, mono);
    }
  } else tl.t = 0;
}

function haloPass(c: Ctx, s: State) {
  c.globalCompositeOperation = 'lighter';
  const slots = s.lights.slots;
  for (let i = 0; i < s.lights.count; i++) {
    const l = slots[i];
    if (l.halo <= 0) continue;
    const r = Math.max(4, l.r * 0.42);
    c.globalAlpha = l.halo * l.k;
    c.drawImage(lightSprite(l.color), l.x - r, l.y - r, r * 2, r * 2);
  }
  c.globalAlpha = 1;
  c.globalCompositeOperation = 'source-over';
}

function drawParticles(c: Ctx, s: State, juice: Juice, mono: boolean) {
  const T = s.m.tileCss;
  const k = ART_TILE / T;
  const ps = juice.particles;
  for (let i = 0; i < ps.length; i++) {
    const p = ps[i];
    const size = Math.max(1, Math.round(p.size * k * 0.8));
    c.globalAlpha = clamp01(p.life / p.max);
    c.fillStyle = mono ? toMono(p.color) : p.color;
    c.fillRect(Math.round(p.x * k) - s.ox - (size >> 1), Math.round(p.y * k) - s.oy - (size >> 1), size, size);
  }
  c.globalAlpha = 1;
}

function fontFor(s: State, size: number): string {
  const px = Math.round(size);
  let f = s.fonts.get(px);
  if (!f) { f = hypeFont(px); s.fonts.set(px, f); }
  return f;
}

/** Floating words at full resolution, so they stay crisp over the pixels. */
function drawFloaters(ctx: CanvasRenderingContext2D, s: State, juice: Juice, rx: number, ry: number, shakeX: number, shakeY: number, mono: boolean) {
  const fl = juice.floaters;
  if (!fl.length) return;
  const m = s.m;
  const perArt = m.k / m.dpr; // CSS px per art px
  const toArt = ART_TILE / m.tileCss;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  for (let i = 0; i < fl.length; i++) {
    const f = fl[i];
    const k = f.life / f.max;
    const pop = juice.reduced ? 1 : Math.min(1, (1 - k) * 8) * (1 + 0.15 * Math.max(0, 1 - (1 - k) * 6));
    const x = (f.x * toArt - rx) * perArt + shakeX, y = (f.y * toArt - ry) * perArt + shakeY;
    ctx.globalAlpha = Math.min(1, k * 2.5);
    ctx.font = fontFor(s, f.size * pop);
    ctx.lineWidth = Math.max(3, f.size * 0.22);
    ctx.strokeStyle = '#0a0716';
    ctx.strokeText(f.text, x, y);
    ctx.fillStyle = mono ? toMono(f.color) : f.color;
    ctx.fillText(f.text, x, y);
  }
  ctx.globalAlpha = 1;
}

function screenEffects(c: Ctx, s: State, w: World, t: number, reduced: boolean) {
  if (s.flash > 0) {
    c.globalCompositeOperation = 'lighter';
    c.globalAlpha = s.flash * 0.22;
    c.fillStyle = lightCol(COL.lightning, s.mono);
    c.fillRect(0, 0, s.bw, s.bh);
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
  }
  const freeze = hitFreezeOf(w);
  // only a real hit stop flashes (a few hundredths of a second), never a long hold
  if (freeze > 0 && freeze <= 0.1 && !reduced) {
    c.globalCompositeOperation = 'lighter';
    c.globalAlpha = Math.min(0.16, freeze * 2.5);
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, s.bw, s.bh);
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// The frame
// ─────────────────────────────────────────────────────────────────────────────

/** Tile size in CSS pixels for the pixel renderer at this view. */
export function pixelTile(w: number, h: number, dpr: number): number {
  return viewMetrics(w, h, dpr, state().m).tileCss;
}

export function drawWorld1(ctx: CanvasRenderingContext2D, world: World, v: PixelView, juice: Juice) {
  const s = state();
  const dpr = v.dpr && v.dpr > 0 ? v.dpr : 1;
  const m = viewMetrics(v.w, v.h, dpr, s.m);
  const mono = v.mono, reduced = v.reduced;
  const seed = seedOf(world);
  const th = themeFor(world.level.theme);
  if (!th) {
    // its art is still on the way: a plain dark frame until it lands
    loadTheme(world.level.theme).catch(() => {});
    drawPlain(ctx, s, m, v);
    return;
  }
  // Sixth Street (story 1-2) gets the dense neon
  const sky = skyOf(world.level);
  ensureBuffers(s, m, mono, seed, (world as unknown as { levelId?: string | null }).levelId === '1-2' ? 2.5 : 1, sky, th);
  const rainy = th.weather === 'rain';
  const modifier = modifierOf(world);
  s.blackout = modifier === 'blackout';
  const storm = modifier === 'storm', lowG = modifier === 'lowGravity';
  s.flash = storm && !reduced ? lightningAt(world.t) : 0;
  const wind = windOf(world);
  const ro = s.rainOpts;
  ro.density = storm ? 1.9 : lowG ? 0.8 : 1;
  ro.speed = storm ? 1.35 : lowG ? 0.45 : 1;
  // rain leans with the wind (tiles/s, signed): hard in a storm, a little otherwise
  ro.slant = Math.max(-0.95, Math.min(0.95, (storm ? -0.3 : SLANT) + wind * (storm ? 0.45 : 0.12)));
  const st = s.stats;
  st.levelLights = 0;
  st.ambient = s.blackout ? AMBIENT_DARK_LUM : AMBIENT_LUM;
  st.lightning = s.flash;
  st.skylineSeed = seed;
  st.sky = sky.id;
  st.signText = signWord(seed, world.levelIndex, 0);
  const level = world.level;
  const decor = decorOf(world);
  if (s.level !== level || s.decorSrc !== decor) {
    s.level = level; s.decorSrc = decor;
    // the theme's set dressing (a carousel in the baggage hall) bakes with the level's decor
    s.decor = th.dressing ? decor.concat(th.dressing(level)) : decor;
    s.chunks.reset(); s.pre.index = -1;
  }
  s.tiles = world.tiles; s.cols = level.cols;

  const a = clamp01(v.alpha);
  const t = world.t;
  const h = world.hero;
  const pl = placeFrame(world, a, PLACE, m.q);
  const hx = pl.hx;
  const anchorX = pl.anchorX, anchorY = pl.anchorY, rx = pl.rx, ry = pl.ry;
  blitOrigin(s.bx, rx, m.k, m.q); blitOrigin(s.by, ry, m.k, m.q);
  s.ox = s.bx.origin; s.oy = s.by.origin;

  let dt = t - s.lastT;
  if (s.world !== world || dt < 0 || dt > 0.1) { dt = 0; s.lastRx = rx; s.lastRy = ry; }
  const camDx = rx - s.lastRx, camDy = ry - s.lastRy;
  s.world = world; s.lastT = t; s.lastRx = rx; s.lastRy = ry;

  const c = (s.main as Buffers).ctx;
  // everything below draws in art pixels; the transform lays them on q sub-pixels each
  c.setTransform?.(s.q, 0, 0, s.q, 0, 0);
  c.imageSmoothingEnabled = false;
  c.globalCompositeOperation = 'source-over';
  c.globalAlpha = 1;
  const SC = s.scene as Buffers;
  const sc = SC.ctx;
  sc.setTransform?.(s.q, 0, 0, s.q, 0, 0);
  sc.imageSmoothingEnabled = false;
  sc.globalCompositeOperation = 'source-over';
  sc.globalAlpha = 1;
  sc.clearRect(0, 0, s.bw, s.bh);
  s.lights.begin(0, 0, s.bw, s.bh, Math.round(anchorX) - s.ox, Math.round(anchorY) - s.oy - 12);

  const tf = s.tf;
  tf.world = world; tf.t = t; tf.dt = dt; tf.ox = s.ox; tf.oy = s.oy; tf.bw = s.bw; tf.bh = s.bh;
  tf.rx = rx; tf.ry = ry; tf.camDx = camDx; tf.camDy = camDy; tf.mono = mono; tf.reduced = reduced;
  tf.heroX = snapTo(anchorX, m.q) - s.ox; tf.heroY = snapTo(anchorY, m.q) - s.oy;
  tf.shake = 0; tf.alpha = a; tf.text = v.text ?? NO_TEXT;
  tf.insetTop = ((v.insetTop ?? 0) * dpr) / m.k;
  const layers = th.layers;

  // ── back to front ──
  drawBackground(c, s, rx, ry, t, reduced, mono);
  if (layers?.back) layers.back(c, tf);
  if (s.fog) c.drawImage(s.fog, 0, 0);
  if (rainy) s.rain.update(dt, s.bw, s.bh, camDx, camDy, reduced, roofHit, ro);
  s.motes.update(dt, s.bw, s.bh, camDx, camDy, lowG || th.weather === 'motes', reduced);
  if (rainy) s.rain.draw(c, false, mono);

  chunkRange(s.span, s.ox, s.bw);
  const lastChunk = Math.floor((level.cols - 1) / CHUNK_COLS);
  for (let i = s.span.first; i <= Math.min(s.span.last, lastChunk); i++) {
    sc.drawImage(s.chunks.get(i).base, i * CHUNK_PX - s.ox, -s.oy);
  }
  prefetchChunk(s, level, h.vx >= 0 ? 1 : -1, lastChunk);
  const ta = tileAtlas(th, mono);
  drawDynamicTiles(sc, s, world, ta, 'base', t);
  if (layers?.tiles) layers.tiles(sc, tf, 'base');
  drawPlatforms(sc, s, world, ta, a);
  drawCheckpoint(sc, s, world, th, 'base');
  drawDecor(sc, s, world, th, 'base', t, reduced);
  decorLights(s, world, th, t);
  drawEnemies(sc, s, world, th, a, t, 'base');
  drawShots(sc, s, world, 'base');
  drawPickups(sc, s, world, t, reduced, 'base');
  drawShrines(sc, shrinesOf(world), s.ox, s.oy, s.bw, t, reduced, mono, shrineLight);
  const decoys = (world as unknown as { decoys?: readonly { x: number; y: number }[] }).decoys;
  if (Array.isArray(decoys) && decoys.length) s.action.drawDecoys(sc, decoys, s.ox, s.oy, s.bw, t, mono);
  const memories = memoriesOf(world);
  for (let i = 0; i < memories.length; i++) {
    const m = memories[i];
    if (!m.taken) s.lights.add(m.x * ART_TILE + 8 - s.ox, m.y * ART_TILE + 8 - s.oy, 26, lightCol(COL.sodium, mono), 0.8, 2, 0);
  }

  const hero = atlas(HERO, mono, HERO_GLOW);
  const hd = poseHero(s, world, snapTo(anchorX, m.q) - s.ox, snapTo(anchorY, m.q) - s.oy);
  const ready = dashReadyOf(world);
  if (s.pendingFlick) { s.flickAt = t; s.pendingFlick = false; }
  const n = scarfPoints(s, world, hd, t, reduced);
  const pw = powerOf(world);
  const gliding = !!pw && pw.kind === 'batWings' && !world.hero.onGround && world.hero.vy > 0 && world.hero.vy < 4;
  if (hd.visible && gliding) drawGlideCloak(sc, hd.x, hd.y, hd.facing, t, mono);
  if (hd.visible && pw && pw.kind === 'tacoRush' && Math.abs(world.hero.vx) > 6 && !reduced) drawSpeedLines(sc, hd.x, hd.y, hd.facing, t, mono);
  if (hd.visible) {
    drawScarf(sc, s, n, col(ready ? COL.scarfEdge : COL.scarfDimEdge, mono), col(ready ? COL.scarfCore : COL.scarfDimCore, mono), false);
    // rim light from the city glow behind him: a one pixel edge on his back and hood
    const rim = tinted(hero, col(COL.heroRim, mono));
    sc.globalAlpha = 0.6;
    drawTinted(sc, hero, rim, hd.anim, hd.frame, hd.x - hd.facing, hd.y, hd.facing);
    drawTinted(sc, hero, rim, hd.anim, hd.frame, hd.x, hd.y - 1, hd.facing);
    sc.globalAlpha = 1;
    drawFrame(sc, hero, hd.anim, hd.frame, hd.x, hd.y, hd.facing, 'base', hd.dw, hd.dh);
  }
  if (th.frontDecor) drawFrontDecor(sc, s, world, th, 'base');
  // wall slide sparks at the hand on the wall
  s.sparkAcc += dt;
  if (s.pose.state === 'wallSlide' && s.sparkAcc > 0.05 && !reduced) {
    s.sparkAcc = 0;
    s.sparks.emit(hd.x + (s.pose.wallDir || hd.facing) * 5 + s.ox, hd.y - 4 + s.oy, s.pose.wallDir || hd.facing, 2);
  }
  s.sparks.update(dt);

  // ── lights ──
  const unlockAge = s.story.unlockAge(t);
  if (unlockAge >= 0) s.lights.add(hd.x, hd.y - 12, 60 + Math.sin(unlockAge * 6) * 8, lightCol(COL.magenta, mono), 1, 6, 0.6);
  if (!s.blackout) s.lights.add(hd.x, hd.y - 12, 40, lightCol(COL.heroFill, mono), 0.7, 5, 0);
  if (pw) s.lights.add(hd.x, hd.y - 12, 34, lightCol(POWER_COLOR[pw.kind] ?? COL.violet, mono), 0.6, 5, 0.25);
  if (hd.visible) {
    const mid = n >> 1;
    // in a blackout the scarf is the hero's lantern
    const r = s.blackout ? (ready ? 52 : 30) : ready ? 30 : 16;
    s.lights.add(s.sx[mid], s.sy[mid], r, lightCol(COL.magenta, mono), ready ? 0.95 : s.blackout ? 0.6 : 0.35, 5, ready ? 0.45 : 0);
  }
  worldLights(s, world, t, reduced);
  coinLights(s, world, modifier === 'doubleAura');
  chunkLamps(s, lastChunk);
  lightPass(c, SC, s);
  drawBackgroundGlow(c, s, rx, ry, t, reduced, mono);
  if (layers?.backGlow) layers.backGlow(c, tf);

  // ── emissive: what glows stays bright through the darkness ──
  if (!s.blackout) {
    for (let i = s.span.first; i <= Math.min(s.span.last, lastChunk); i++) {
      sc.drawImage(s.chunks.get(i).glow, i * CHUNK_PX - s.ox, -s.oy);
    }
  }
  drawPuddles(sc, s, lastChunk, t, reduced, mono, rainy);
  st.rims = s.blackout ? drawBlackoutRims(sc, s, ta, lastChunk, mono) : 0;
  drawDynamicTiles(sc, s, world, ta, 'glow', t);
  if (layers?.tiles) layers.tiles(sc, tf, 'glow');
  drawCheckpoint(sc, s, world, th, 'glow');
  drawDecor(sc, s, world, th, 'glow', t, reduced);
  drawEnemies(sc, s, world, th, a, t, 'glow');
  drawShots(sc, s, world, 'glow');
  drawPickups(sc, s, world, t, reduced, 'glow');
  drawAfterimages(sc, s, world, hero);
  drawMemories(sc, th.frontDecor ? unhidden(s, world, th, memories) : memories, s.ox, s.oy, s.bw, t, reduced, mono, NO_LIGHT);
  if (th.frontDecor) drawFrontDecor(sc, s, world, th, 'glow');
  if (hd.visible) {
    if (ready || unlockAge >= 0) drawScarf(sc, s, n, '', col(COL.scarfHot, mono), true);
    drawFrame(sc, hero, hd.anim, hd.frame, hd.x, hd.y, hd.facing, 'glow', hd.dw, hd.dh);
    drawSmear(sc, s.pose.state, s.pose.animT, hd.x, hd.y, hd.facing, mono);
    if (pw) drawPowerRing(sc, hd.x, hd.y - 11, pw.t / pw.total, lightCol(POWER_COLOR[pw.kind] ?? COL.violet, mono), t, reduced);
  }
  c.drawImage(SC.canvas, 0, 0, s.bw, s.bh);
  haloPass(c, s);

  st.rings = drawRings(c, s, t, mono);
  s.action.update(dt);
  s.action.draw(c, s.ox, s.oy, t, mono);
  if (pw && pw.kind === 'tacoRush') s.action.drawCoinArcs(c, anchorX, anchorY - 10, s.ox, s.oy, t, mono);
  st.bats = s.action.drawBats(c, batsActive(world, hx), s.bw, s.bh, dt, t, reduced, mono);
  st.flights = drawFlights(c, s.story, s.ox, s.oy, s.bw, t, mono);
  s.sparks.draw(c, s.ox, s.oy, mono);
  s.motes.draw(c, mono);
  drawParticles(c, s, juice, mono);
  if (rainy) s.rain.draw(c, true, mono);
  if (layers?.front) layers.front(c, tf);
  screenEffects(c, s, world, t, reduced);
  if (s.action.flashAge(t) >= 0 && !reduced) {
    c.globalCompositeOperation = 'lighter';
    c.globalAlpha = 0.14;
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, s.bw, s.bh);
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
  }
  if (v.prompts && v.prompts.length) drawPrompts(c, v.prompts, hx + h.w / 2, s.ox, s.oy, s.bw, mono);
  if (unlockAge >= 0) drawUnlockCard(c, s.story, unlockAge, s.bw, s.bh, mono);
  if (!v.title && !v.story) drawPixelCards(c, s, world, dt, reduced, mono);
  if (v.title) drawLogo(c, s.bw, s.bh, t, reduced, mono);
  if (v.story) drawStoryCard(c, v.story, s.bw, s.bh, t, reduced, mono);
  if (v.notice) drawNotice(c, v.notice.title, v.notice.line, lightCol(v.notice.accent, mono), s.bw, s.bh, mono);
  st.lights = s.lights.count;
  st.rain = rainy ? s.rain.active : 0;
  let sum = 0;
  for (let i = 0; i < st.rain; i++) sum += s.rain.streaks[i].speed;
  st.rainSpeed = st.rain ? sum / st.rain : 0;
  st.motes = s.motes.active;

  // ── blit: whole device pixels per art pixel, the camera fraction as an offset ──
  let shakeX = 0, shakeY = 0;
  if (juice.shakeTime > 0 && !reduced) {
    const mag = juice.shakeMag * Math.min(1, juice.shakeTime / 0.18);
    shakeX = (hash2(Math.floor(t * 60), 1) * 2 - 1) * mag;
    shakeY = (hash2(Math.floor(t * 60), 2) * 2 - 1) * mag;
  }
  // a theme's rumble (a train passing close), never under reduced motion
  st.rumble = reduced ? 0 : tf.shake;
  if (tf.shake > 0 && !reduced) {
    shakeX += (hash2(Math.floor(t * 40), 3) * 2 - 1) * tf.shake * 0.4;
    shakeY += (hash2(Math.floor(t * 40), 4) * 2 - 1) * tf.shake;
  }
  const offX = s.bx.offset + Math.round(shakeX * dpr), offY = s.by.offset + Math.round(shakeY * dpr);
  const finale = world.phase === 'finale' || (world.phase === 'done' && world.result === 'secret');
  if (v.pixel) {
    showOnPixelCanvas(s, v.pixel, m, offX, offY);
    // the screen canvas above it only carries words: cleared when they go
    const words = juice.floaters.length > 0 || finale;
    if (words || s.overlayDirty) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, m.dw, m.dh);
      ctx.restore();
      s.overlayDirty = words;
    }
  } else {
    s.pixel = null;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage((s.main as Buffers).canvas, offX, offY, s.bw * m.k, s.bh * m.k);
    ctx.restore();
  }

  if (juice.floaters.length) {
    ctx.save();
    drawFloaters(ctx, s, juice, rx, ry, shakeX, shakeY, mono);
    ctx.restore();
  }
  // the secret world's finale card stays the full-resolution one
  if (finale && finaleCards) finaleCards(ctx, world, v, mono);
}

/** A plain dark frame (a theme still loading), on the pixel canvas or the screen. */
function drawPlain(ctx: CanvasRenderingContext2D, s: State, m: ViewMetrics, v: PixelView) {
  if (!s.main) s.main = makeCanvas(m.bw * m.q, m.bh * m.q);
  if (s.bw !== m.bw || s.bh !== m.bh || s.q !== m.q) { resize(s.main.canvas, m.bw * m.q, m.bh * m.q); s.sky = null; }
  s.bw = m.bw; s.bh = m.bh; s.q = m.q;
  const c = s.main.ctx;
  c.setTransform?.(1, 0, 0, 1, 0, 0);
  c.globalCompositeOperation = 'source-over';
  c.globalAlpha = 1;
  c.fillStyle = '#05040b';
  c.fillRect(0, 0, m.bw * m.q, m.bh * m.q);
  if (v.pixel) {
    showOnPixelCanvas(s, v.pixel, m, 0, 0);
    if (s.overlayDirty) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, m.dw, m.dh);
      ctx.restore();
      s.overlayDirty = false;
    }
    return;
  }
  s.pixel = null;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(s.main.canvas, 0, 0, m.bw * m.k, m.bh * m.k);
  ctx.restore();
}

/** Copy the frame into the pixel canvas; size it in CSS once per resize; offset it by a cached transform. */
function showOnPixelCanvas(s: State, P: HTMLCanvasElement, m: ViewMetrics, offX: number, offY: number) {
  if (s.pixel !== P) {
    s.pixel = P; s.pixelCtx = P.getContext('2d'); s.pixelW = 0; s.pixelH = 0; s.overlayDirty = true;
  }
  if (P.width !== s.bw * s.q) P.width = s.bw * s.q;
  if (P.height !== s.bh * s.q) P.height = s.bh * s.q;
  const cssW = (s.bw * m.k) / m.dpr, cssH = (s.bh * m.k) / m.dpr;
  if (cssW !== s.pixelW || cssH !== s.pixelH) {
    P.style.width = `${cssW}px`;
    P.style.height = `${cssH}px`;
    s.pixelW = cssW; s.pixelH = cssH;
    s.transforms.clear();
  }
  const pc = s.pixelCtx;
  if (pc) {
    pc.globalCompositeOperation = 'source-over';
    pc.globalAlpha = 1;
    pc.drawImage((s.main as Buffers).canvas, 0, 0);
  }
  const key = (offX + 1024) * 4096 + (offY + 1024);
  let tr = s.transforms.get(key);
  if (!tr) { tr = `translate(${offX / m.dpr}px, ${offY / m.dpr}px)`; s.transforms.set(key, tr); }
  if (P.style.transform !== tr) P.style.transform = tr;
}

/** The full-resolution finale card, from the cartoon renderer once its chunk has loaded (see ../frame.ts). */
type FinaleCards = (ctx: CanvasRenderingContext2D, world: World, v: View, mono: boolean) => void;
let finaleCards: FinaleCards | null = null;
export function setFinaleCards(fn: FinaleCards) { finaleCards = fn; }

/** What the last frame drew. */
export function frameStats(): FrameStats { return state().stats; }

/** For tests: forget every buffer and cache. */
export function resetWorld1() { S = null; }
