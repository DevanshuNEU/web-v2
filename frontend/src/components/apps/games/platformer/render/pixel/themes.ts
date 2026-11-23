/**
 * The theme seam of the pixel renderer. A level's theme id names one
 * PixelTheme: the tile and decor art, what a building looks like under its
 * surface, the parallax behind it, the weather, the enemy and goal art, the
 * breakable sign, which decor casts light, and (optionally) layers of its own
 * drawn at fixed points of the frame. The pipeline (./world1.ts) asks the
 * theme; it never branches on a theme's name. A new chapter adds a theme
 * here, not cases there.
 *
 * `rooftops` (Endless) and `austin` (chapter 1) are bundled. Each later
 * chapter is one lazy chunk (`airport` and `clouds`; `campus`, `library` and
 * `tracks`; `newbury`, `river`, `harbor` and `beach`), fetched by
 * `loadTheme` when its chapter card shows, so the platformer's first
 * download does not grow.
 * Until it lands `themeFor` returns null and the renderer draws a plain dark
 * frame. Any other pixel theme id falls back to the rooftops.
 */

import type { SpriteSet } from '../sprites';
import type { RooftopTile } from '../sprites';
import type { World } from '../../sim/world';
import { ROWS, type Level } from '../../sim/level';
import { bakeGrid, toMono } from '../bake';
import type { Decor } from './read';
import { ART_TILE } from './camera';
import { makeCanvas, type Ctx } from './canvas';
import { lightSprite } from './lights';
import { STRIP_W, bakeSkyCanvas, hash2, rng, type Sky } from './skyline';
import { atlas, drawFrame } from './sprites';
import { K, KIND, WALK_DIR, type FacadeCell } from './tiles';
import { GLYPH_H, drawText, textWidth } from './font';
import type { SkyPreset } from './timeofday';
import { AUSTIN_THEME, ROOFTOPS_THEME } from './themes/rooftops';

/** Enemy art for one sim kind: the set, its glowing keys, its moving and knocked-out anims, its light. */
export interface EnemyArt {
  set: SpriteSet<string>;
  glow: string;
  /** The anim while it moves ('walk', 'roll'; flyers 'hover', and 'dive' when diving). */
  move: string;
  dead: string;
  /** A flyer's anim while it dives (default 'dive'). */
  dive?: string;
  /** A hopper: plays its `frames` at `fps` once per hop (`every` seconds, from the sim's hopT), still between hops. */
  hop?: { every: number; fps: number; frames: number };
  /** The colour of the light it carries (an eye, a screen, a tag). */
  light: string;
}

/** A light placed relative to a sprite's bottom left (art pixels). */
export interface SpriteLight { dx: number; dy: number; r: number; color: string; k: number; priority: number; halo: number }

export interface GoalArt {
  /** Decor name of the goal sprite. */
  kind: string;
  /** The sprite sits at the goal's top on a lattice mast down to the floor (the beacon); else it stands on the floor. */
  mast: boolean;
  /** Frames per second, looping; 0 plays the frames once as she comes near (a board settling). */
  fps: number;
  /** Shift right in art pixels from the goal's column (a wide goal centred on it, or ending at it). */
  dx?: number;
  /** Raise the sprite's top this many pixels by carrying one row down (a roof that must meet the level's roof row). */
  lift?: number;
  /** The row carried (default the bottom row): a row through the columns makes them taller instead of the plinth. */
  liftRow?: number;
  lights: readonly SpriteLight[];
}

/** Light a static decoration casts: offset from its bottom left, colours by index, steady or blinking. */
export interface DecorLight {
  dx: number; dy: number; r: number;
  /** Picked by the decoration's index (red and green wing lights). */
  colors: readonly string[];
  k: number; halo: number;
  /** Blinks per second (on half the time, dimmer when off); 0 is steady. */
  blink: number;
}

/**
 * What a theme's own layers get each frame. One object, rewritten: hooks
 * must not keep it. Positions in buffer pixels; `ox`, `oy` is the world art
 * pixel at the buffer's top left. `light` adds a level light (none in a blackout).
 */
export interface ThemeFrame {
  world: World;
  t: number; dt: number;
  /** How far between the last two sim steps this frame is (0..1), for moving things' px, py. */
  alpha: number;
  ox: number; oy: number; bw: number; bh: number;
  /** The render camera in art pixels, for parallax. */
  rx: number; ry: number;
  camDx: number; camDy: number;
  /** The hero's feet, buffer pixels. */
  heroX: number; heroY: number;
  mono: boolean; reduced: boolean;
  /** Resolves a story text id (private overrides included): a boss's name and lines. */
  text: (id: string) => string;
  /** Art px at the top the page's own HUD covers: drawn HUD art (a boss bar) goes under it. */
  insetTop: number;
  /** A layer may set a rumble here (CSS px of camera shake); reset every frame, ignored under reduced motion. */
  shake: number;
  light: (x: number, y: number, r: number, color: string, k: number, halo: number) => void;
}

/** Optional layers a theme draws at fixed points of the frame. */
export interface ThemeLayers {
  /** Over the parallax strips, under the darkness (far planes, the city below). */
  back?(c: Ctx, f: ThemeFrame): void;
  /** Over the darkened background: what glows out there (runway lights, landing lights). */
  backGlow?(c: Ctx, f: ThemeFrame): void;
  /** On the playfield, base pass then glow pass (walkways, thin clouds). */
  tiles?(c: Ctx, f: ThemeFrame, layer: 'base' | 'glow'): void;
  /** In front of everything but the screen effects and cards (drifting wisps, a boss's bar and lines). */
  front?(c: Ctx, f: ThemeFrame): void;
  /** Every game event the view forwards (positions in tiles): a boss's hit flash. Must not allocate. */
  event?(type: string, x: number, y: number, n: number): void;
}

export interface PixelTheme {
  id: string;
  /** Tile art, with the rooftop keys so the chunk baker works for every theme. */
  tiles: SpriteSet<RooftopTile>;
  /** Decor by kind name: scenery, the goal, the checkpoint. Art that animates is drawn per frame, the rest baked. */
  decor: Readonly<Record<string, SpriteSet<'idle'>>>;
  /** How often each roofFill variant shows (default: the rooftops' weights). */
  fillWeights?: readonly number[];
  /** Palette keys that glow in the tiles and decor. */
  glow: string;
  /** Paint under a surface at bake time (windows, doors, puddles, side seams). */
  facade(cell: FacadeCell): void;
  /** The background: sky, clouds and parallax strips, baked per view size, palette, seed and time of day. */
  sky(w: number, h: number, mono: boolean, seed: number, o: { sky: SkyPreset; neon: number }): Sky;
  /** Rain, nothing, or dust motes drifting in the lamp light. */
  weather: 'rain' | 'none' | 'motes';
  /** The darkness the light pass starts from, and the glow from below, when the theme overrides its sky's (indoors). */
  ambient?: string;
  cityGlow?: string;
  /** The theme draws the dash-breakable walls itself (in its tiles layer). */
  drawsCracks?: boolean;
  /** The theme draws the blade's breakables (crates) itself, as its own art. */
  drawsCrates?: boolean;
  /** Art for the sim's walker (doomCrawler) and flyer (adDrone). */
  enemies: { walker: EnemyArt; flyer: EnemyArt };
  goal: GoalArt;
  /** The breakable sign (L): its art by run seed, level and index, and the colour it spills. */
  sign(seed: number, level: number, i: number): SpriteSet<'idle'>;
  signLight: string;
  /** Glowing keys of the sign art when they differ from the theme's (a borrowed neon sign). */
  signGlow?: string;
  /** Lights cast by static decor, by kind. */
  decorLights: Readonly<Record<string, DecorLight>>;
  /**
   * Decor whose frames are variants that animate in cycles (a wing light:
   * red on, red off, green on, green off): `frames` per cycle at `fps`, the
   * decoration's index picks the cycle. Drawn per frame.
   */
  animDecor?: Readonly<Record<string, { frames: number; fps: number }>>;
  /** Decor she passes behind, drawn over her and over memories tucked inside it (which show only their light). */
  frontDecor?: Readonly<Record<string, true>>;
  /** Extra still decor the theme places from the level's shape (set dressing), baked with the level's decor; called once per level. */
  dressing?(level: Level): readonly Decor[];
  /** Decor kind drawn at the checkpoint; its lamp is at the top centre. */
  checkpoint: string;
  layers?: ThemeLayers;
}

const READY = new Map<string, PixelTheme>([
  ['rooftops', ROOFTOPS_THEME],
  ['austin', AUSTIN_THEME],
]);

/**
 * What a lazy theme chunk borrows from the renderer, handed to it as a value
 * so the chunk has no runtime imports back into the main bundle (which would
 * split the platformer's chunk into separate modules and grow it).
 */
export const THEME_KIT = {
  toMono, bakeGrid, ART_TILE, ROWS, makeCanvas, lightSprite, STRIP_W, bakeSkyCanvas, hash2, rng, atlas, drawFrame, K, KIND, WALK_DIR,
  /** The rooftops' slang neon sign and its glowing keys, for a theme without sign art of its own. */
  neonSign: ROOFTOPS_THEME.sign, neonGlow: ROOFTOPS_THEME.glow,
  /** The bundled rooftops theme, for art a chapter borrows (the beacon goal). */
  rooftops: ROOFTOPS_THEME,
  /** The renderer's 5 by 7 pixel font. */
  drawText, textWidth, GLYPH_H,
};
export type ThemeKit = typeof THEME_KIT;
/** The kit as the trip chunk names it. */
export type TripKit = ThemeKit;

type Loader = () => Promise<Readonly<Record<string, PixelTheme>>>;
const trip: Loader = () => import('./themes/trip').then(m => m.tripThemes(THEME_KIT));
const campus: Loader = () => import('./themes/campus').then(m => m.campusThemes(THEME_KIT));
const boston: Loader = () => import('./themes/boston').then(m => m.bostonThemes(THEME_KIT));
const zakim: Loader = () => import('./themes/zakim').then(m => m.zakimThemes(THEME_KIT));
/** Lazy chunks by theme id: one per chapter. */
const LAZY: Readonly<Record<string, Loader>> = {
  airport: trip, clouds: trip,
  campus, library: campus, tracks: campus,
  newbury: boston, river: boston, harbor: boston, beach: boston,
  zakim,
};
const pending = new Map<string, Promise<PixelTheme>>();

/** The theme for an id, or null while its chunk is loading. Unknown ids get the rooftops. */
export function themeFor(id: string): PixelTheme | null {
  const t = READY.get(id);
  if (t) return t;
  return id in LAZY ? null : ROOFTOPS_THEME;
}

/** Load a theme (its chunk once); resolves at once for a bundled one. A failed load can be retried. */
export function loadTheme(id: string): Promise<PixelTheme> {
  const hit = themeFor(id);
  if (hit) return Promise.resolve(hit);
  let p = pending.get(id);
  if (p) return p;
  p = LAZY[id]().then(set => {
    for (const [k, v] of Object.entries(set)) READY.set(k, v);
    return READY.get(id) ?? ROOFTOPS_THEME;
  });
  p.catch(() => { pending.delete(id); });
  pending.set(id, p);
  return p;
}
