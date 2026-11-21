// ─────────────────────────────────────────────────────────────────────────────
// MONO PALETTE - grayscale tones for the arcade.
// Pieces/segments stay distinguishable by LIGHTNESS, not hue (color-not-only).
// Fun mode is gated to keep today's colors byte-for-byte.
// ─────────────────────────────────────────────────────────────────────────────

// Seven graphite tones spaced by lightness - one per tetromino, all distinct
// without relying on hue. Index aligns with TETROMINOES order (I,O,T,S,Z,L,J).
export const MONO_TETRIS = ['#f4f4f5', '#d4d4d8', '#a1a1aa', '#71717a', '#52525b', '#e4e4e7', '#8a8a93'];
// Snake head brighter than body so the head reads at a glance.
export const MONO_SNAKE_HEAD = '#f4f4f5';
export const MONO_SNAKE_BODY = '#a1a1aa';
export const MONO_APPLE      = '#e4e4e7';
