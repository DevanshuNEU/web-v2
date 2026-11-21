/**
 * Time of day for the pixel renderer: one preset per mood, chosen by the
 * level's `sky` (default night). A preset sets the sky gradient, the stars,
 * the moon or the sun, fog, the darkness the light pass starts from, the
 * city glow, how strong the lights are, and how much the windows glow.
 * Chapter 1 (Austin) is night; Boston uses the rest.
 */

export type SkyId = 'night' | 'lateNight' | 'preDawn' | 'sunrise' | 'morning';
export const SKY_IDS: readonly SkyId[] = ['night', 'lateNight', 'preDawn', 'sunrise', 'morning'];

export interface SkyPreset {
  id: SkyId;
  /** Sky gradient, top to horizon (4 stops at 0, 0.42, 0.72, 1). */
  sky: readonly [string, string, string, string];
  /** 0..1 how many stars show. */
  stars: number;
  /** 'moon', 'sun' (low over the water) or none. */
  disc: 'moon' | 'sun' | null;
  /** 0..1 strength of the low fog band. */
  fog: number;
  fogColor: string;
  /** The darkness the light pass starts from (lighter is brighter). */
  ambient: string;
  /** Warm glow rising from the streets, and its strength 0..1. */
  cityGlow: string;
  glow: number;
  /** Multiplies every light's strength (lights matter less in daylight). */
  lightK: number;
  /** Multiplies the lit windows and neon on the skyline. */
  windows: number;
}

export const SKY_PRESETS: Readonly<Record<SkyId, SkyPreset>> = {
  night: {
    id: 'night', sky: ['#03030b', '#100a22', '#2c1334', '#55223c'], stars: 1, disc: 'moon', fog: 0, fogColor: '#2a1838',
    ambient: '#6a6496', cityGlow: '#3a1c3e', glow: 1, lightK: 1, windows: 1,
  },
  lateNight: {
    id: 'lateNight', sky: ['#020208', '#0a0818', '#18102a', '#2a1a3a'], stars: 0.6, disc: 'moon', fog: 0.65, fogColor: '#3a3050',
    ambient: '#5a5680', cityGlow: '#2a1a34', glow: 0.7, lightK: 1, windows: 0.7,
  },
  preDawn: {
    id: 'preDawn', sky: ['#0a0c2a', '#1e1e4a', '#5a3a6a', '#d0808a'], stars: 0.3, disc: null, fog: 0.25, fogColor: '#6a5078',
    ambient: '#8a80aa', cityGlow: '#5a3048', glow: 0.6, lightK: 0.8, windows: 0.6,
  },
  sunrise: {
    id: 'sunrise', sky: ['#2a3a6a', '#7a6a9a', '#e8a07a', '#ffd08a'], stars: 0, disc: 'sun', fog: 0.15, fogColor: '#ffcf9a',
    ambient: '#c8b0b8', cityGlow: '#6a4030', glow: 0.5, lightK: 0.5, windows: 0.3,
  },
  morning: {
    id: 'morning', sky: ['#5a8ac8', '#8ab4e0', '#c0dcf0', '#e8f2f8'], stars: 0, disc: null, fog: 0.1, fogColor: '#e8f0f8',
    ambient: '#e8e8f4', cityGlow: '#606070', glow: 0.2, lightK: 0.25, windows: 0.1,
  },
};

/** The preset for a level (its `sky`, else night). */
export function skyOf(level: unknown): SkyPreset {
  const id = (level as { sky?: unknown } | null)?.sky;
  return typeof id === 'string' && id in SKY_PRESETS ? SKY_PRESETS[id as SkyId] : SKY_PRESETS.night;
}

/** Relative luminance of a hex colour, 0..1. */
export function luma(hex: string): number {
  const n = parseInt(hex.slice(1, 7), 16);
  return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
}
