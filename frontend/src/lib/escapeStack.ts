/**
 * Escape routing for transient UI.
 *
 * Menus, popovers, Spotlight, Launchpad and the chat panel each close on Esc.
 * When two are open at once, only the one opened last (the topmost) should
 * close, and nothing behind it should hear the key: no window, no other menu.
 *
 * Each open surface pushes a layer. One window-level capture listener runs
 * before any other key handler, calls the top layer's handler, and stops the
 * event. When no layer is open, Esc passes through untouched (Radix menus and
 * apps keep their own Esc handling).
 */

import { useEffect, useRef } from 'react';

type Layer = { onEscape: () => void };

const stack: Layer[] = [];
let listening = false;

function onKeyDown(e: KeyboardEvent) {
  if (e.key !== 'Escape' || e.isComposing) return;
  const top = stack[stack.length - 1];
  if (!top) return;
  e.preventDefault();
  e.stopImmediatePropagation();
  top.onEscape();
}

function ensureListener() {
  if (listening || typeof window === 'undefined') return;
  window.addEventListener('keydown', onKeyDown, true);
  listening = true;
}

/** Push an Esc layer. Returns a cleanup that removes it. */
export function pushEscapeLayer(onEscape: () => void): () => void {
  ensureListener();
  const layer: Layer = { onEscape };
  stack.push(layer);
  return () => {
    const i = stack.indexOf(layer);
    if (i !== -1) stack.splice(i, 1);
  };
}

/** Number of open layers (for tests). */
export function escapeLayerCount(): number {
  return stack.length;
}

/**
 * While `active` is true, Esc calls `onEscape` if this is the topmost layer.
 * The handler is read through a ref, so an inline arrow does not re-push the
 * layer on every render (which would change the stacking order).
 */
export function useEscapeLayer(active: boolean, onEscape: () => void): void {
  const ref = useRef(onEscape);
  useEffect(() => {
    ref.current = onEscape;
  });
  useEffect(() => {
    if (!active) return;
    return pushEscapeLayer(() => ref.current());
  }, [active]);
}
