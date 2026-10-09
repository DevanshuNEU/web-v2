/**
 * Keyboard shortcut matchers.
 *
 * Browsers keep some shortcuts for themselves and never deliver them to the
 * page: in Chrome, Cmd+T (new tab), Cmd+Shift+T (reopen closed tab), Cmd+W
 * (close tab) and Cmd+1..8 (switch tab). So devOS uses Cmd/Ctrl+K for the
 * palette (not reserved) and Option/Alt for everything else.
 *
 * Matching uses `code` (the physical key) with `key` as a fallback, so Caps
 * Lock, Shift and non-US layouts still match. On a Mac, Option changes `key`
 * (Option+T types a dagger), which is another reason to match on `code`.
 */

type KeyLike = Pick<KeyboardEvent, 'key' | 'code' | 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey'>;

/** Cmd+K on Mac, Ctrl+K elsewhere: open or close the command palette. */
export function isPaletteShortcut(e: KeyLike): boolean {
  if (!(e.metaKey || e.ctrlKey) || e.altKey) return false;
  return e.code === 'KeyK' || e.key.toLowerCase() === 'k';
}

/** A bare `/` opens the palette too, the way GitHub and Linear do. */
export function isSlashShortcut(e: KeyLike): boolean {
  return e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey;
}

/** Option/Alt + a physical key, with no Cmd or Ctrl held. */
function optionKey(e: KeyLike, code: string): boolean {
  return e.altKey && !e.metaKey && !e.ctrlKey && e.code === code;
}

/** Option+T: play the guided tour. */
export function isTourShortcut(e: KeyLike): boolean {
  return optionKey(e, 'KeyT');
}

/** Option+W: close the focused window. */
export function isCloseWindowShortcut(e: KeyLike): boolean {
  return optionKey(e, 'KeyW');
}

/** Option+1..4 open the core apps; returns the digit or null. */
export function appShortcutDigit(e: KeyLike): 1 | 2 | 3 | 4 | null {
  for (const d of [1, 2, 3, 4] as const) {
    if (optionKey(e, `Digit${d}`)) return d;
  }
  return null;
}

/** True when the keystroke is going into a text field, so plain keys stay text. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!target || typeof (target as HTMLElement).tagName !== 'string') return false;
  const el = target as HTMLElement;
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable;
}
