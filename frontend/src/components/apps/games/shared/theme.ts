/**
 * Brainrot arcade palette, canvas only. The arcade chrome (launcher, HUD,
 * buttons) keeps the portfolio tokens; these colors are for what is drawn
 * inside a game board.
 *
 * Under the Mono palette every fill falls back to a grayscale tone split by
 * lightness, so pieces stay distinguishable without hue.
 */

export interface ArcadeTheme {
  board: string;
  boardAlt: string;
  outline: string;
  text: string;
  textDim: string;
  pink: string;
  sun: string;
  sky: string;
  lime: string;
  orange: string;
  violet: string;
  danger: string;
}

export const COLOR_THEME: ArcadeTheme = {
  board: '#1d1430',
  boardAlt: '#251a3d',
  outline: '#120b1f',
  text: '#fff4e0',
  textDim: '#bfb3d6',
  pink: '#ff5fa2',
  sun: '#ffd23f',
  sky: '#3ee0ff',
  lime: '#8cf25a',
  orange: '#ff9a3c',
  violet: '#a98bff',
  danger: '#ff4d4d',
};

export const MONO_THEME: ArcadeTheme = {
  board: '#0f0f10',
  boardAlt: '#18181b',
  outline: '#050505',
  text: '#f4f4f5',
  textDim: '#a1a1aa',
  pink: '#d4d4d8',
  sun: '#f4f4f5',
  sky: '#a1a1aa',
  lime: '#e4e4e7',
  orange: '#8a8a93',
  violet: '#71717a',
  danger: '#ffffff',
};

export function arcadeTheme(mono: boolean): ArcadeTheme {
  return mono ? MONO_THEME : COLOR_THEME;
}

/** Display font for hype words drawn on canvas. Falls back to the system stack. */
export const HYPE_FONT = '800 {size}px ui-rounded, "SF Pro Rounded", system-ui, -apple-system, "Segoe UI", sans-serif';

export function hypeFont(size: number): string {
  return HYPE_FONT.replace('{size}', String(Math.round(size)));
}
