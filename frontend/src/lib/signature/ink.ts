/**
 * ink — resolve the active "ink" (text) and "paper" (background) colors.
 *
 * Pure logic, no React and no DOM-construction. The signature generators are
 * strictly monochrome, but "monochrome" is not hardcoded black-on-white: it
 * tracks the live theme. We read the same CSS custom properties the rest of the
 * portfolio uses (`--color-text` / `--color-bg`), which are authored as
 * space-separated rgb triples ("245 245 247"), and resolve them to numeric
 * [r,g,b] triples so a canvas can draw with them.
 *
 * The function accepts anything that exposes `getPropertyValue` (a real
 * CSSStyleDeclaration from getComputedStyle, or a fake object in tests), so it
 * is unit-testable in the node environment with no DOM.
 */

export type RGB = [number, number, number];

export interface Ink {
  /** Foreground / stroke color, resolved from `--color-text`. */
  ink: RGB;
  /** Background / paper color, resolved from `--color-bg`. */
  paper: RGB;
}

/** Minimal surface we depend on — both CSSStyleDeclaration and a fake satisfy it. */
export interface StyleSource {
  getPropertyValue(prop: string): string;
}

/** Sane fallbacks for SSR / unset vars: ink is black, paper is white. */
const FALLBACK_INK: RGB = [0, 0, 0];
const FALLBACK_PAPER: RGB = [255, 255, 255];

/**
 * Parse a CSS rgb triple authored as "r g b" (the portfolio's token format) or
 * the comma form "r, g, b". Returns null when the value is empty or malformed
 * so callers can fall back deterministically.
 */
export function parseRgbTriple(raw: string | null | undefined): RGB | null {
  if (!raw) return null;
  const parts = raw
    .trim()
    .replace(/,/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length < 3) return null;
  const nums = parts.slice(0, 3).map((p) => Number(p));
  if (nums.some((n) => !Number.isFinite(n))) return null;
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return [clamp(nums[0]), clamp(nums[1]), clamp(nums[2])];
}

/**
 * getInk — resolve ink/paper from an element's computed style or a style source.
 *
 * Pass either an Element (DOM path) or any object with `getPropertyValue`
 * (test path). When the element is null, or the vars are unset/malformed, we
 * fall back to black ink on white paper so the generators never crash and never
 * leak color.
 */
export function getInk(source: Element | StyleSource | null): Ink {
  const style = resolveStyle(source);
  if (!style) {
    return { ink: FALLBACK_INK, paper: FALLBACK_PAPER };
  }
  const ink = parseRgbTriple(style.getPropertyValue('--color-text')) ?? FALLBACK_INK;
  const paper = parseRgbTriple(style.getPropertyValue('--color-bg')) ?? FALLBACK_PAPER;
  return { ink, paper };
}

/** Format an RGB triple as a CSS `rgb(r, g, b)` string. */
export function rgbString([r, g, b]: RGB): string {
  return `rgb(${r}, ${g}, ${b})`;
}

/** Coerce an Element to its computed style; pass through a StyleSource as-is. */
function resolveStyle(source: Element | StyleSource | null): StyleSource | null {
  if (!source) return null;
  if (typeof (source as StyleSource).getPropertyValue === 'function') {
    return source as StyleSource;
  }
  // DOM element path — guard for non-browser environments.
  if (typeof getComputedStyle === 'function') {
    try {
      return getComputedStyle(source as Element);
    } catch {
      return null;
    }
  }
  return null;
}
