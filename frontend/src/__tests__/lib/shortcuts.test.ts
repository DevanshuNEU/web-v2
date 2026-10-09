import { describe, it, expect } from 'vitest';
import {
  isPaletteShortcut,
  isSlashShortcut,
  isTourShortcut,
  isCloseWindowShortcut,
  appShortcutDigit,
  isTypingTarget,
} from '@/lib/shortcuts';

const key = (over: Partial<KeyboardEvent>) => ({
  key: '', code: '', metaKey: false, ctrlKey: false, altKey: false, shiftKey: false, ...over,
}) as KeyboardEvent;

describe('palette shortcut', () => {
  it('matches Cmd+K and Ctrl+K', () => {
    expect(isPaletteShortcut(key({ key: 'k', code: 'KeyK', metaKey: true }))).toBe(true);
    expect(isPaletteShortcut(key({ key: 'k', code: 'KeyK', ctrlKey: true }))).toBe(true);
  });
  it('still matches with Caps Lock or Shift (uppercase key)', () => {
    expect(isPaletteShortcut(key({ key: 'K', code: 'KeyK', metaKey: true }))).toBe(true);
  });
  it('matches the physical key on a non-US layout', () => {
    expect(isPaletteShortcut(key({ key: 'л', code: 'KeyK', metaKey: true }))).toBe(true);
  });
  it('ignores a bare k and Cmd+Option+K', () => {
    expect(isPaletteShortcut(key({ key: 'k', code: 'KeyK' }))).toBe(false);
    expect(isPaletteShortcut(key({ key: 'k', code: 'KeyK', metaKey: true, altKey: true }))).toBe(false);
  });
  it('opens on a bare slash only', () => {
    expect(isSlashShortcut(key({ key: '/' }))).toBe(true);
    expect(isSlashShortcut(key({ key: '/', metaKey: true }))).toBe(false);
  });
});

describe('Option shortcuts (the browser keeps the Cmd versions)', () => {
  it('Option+T plays the tour even though Option changes the typed key', () => {
    expect(isTourShortcut(key({ key: '†', code: 'KeyT', altKey: true }))).toBe(true);
    expect(isTourShortcut(key({ key: 't', code: 'KeyT', metaKey: true, shiftKey: true }))).toBe(false);
  });
  it('Option+W closes a window; Cmd+W is left to the browser', () => {
    expect(isCloseWindowShortcut(key({ key: '∑', code: 'KeyW', altKey: true }))).toBe(true);
    expect(isCloseWindowShortcut(key({ key: 'w', code: 'KeyW', metaKey: true }))).toBe(false);
  });
  it('Option+1..4 map to digits', () => {
    expect(appShortcutDigit(key({ key: '¡', code: 'Digit1', altKey: true }))).toBe(1);
    expect(appShortcutDigit(key({ key: '¢', code: 'Digit4', altKey: true }))).toBe(4);
    expect(appShortcutDigit(key({ key: '1', code: 'Digit1', metaKey: true }))).toBeNull();
    expect(appShortcutDigit(key({ key: '5', code: 'Digit5', altKey: true }))).toBeNull();
  });
});

describe('typing targets', () => {
  it('treats inputs and textareas as typing, other targets not', () => {
    expect(isTypingTarget({ tagName: 'INPUT', isContentEditable: false } as unknown as EventTarget)).toBe(true);
    expect(isTypingTarget({ tagName: 'TEXTAREA', isContentEditable: false } as unknown as EventTarget)).toBe(true);
    expect(isTypingTarget({ tagName: 'DIV', isContentEditable: true } as unknown as EventTarget)).toBe(true);
    expect(isTypingTarget({ tagName: 'DIV', isContentEditable: false } as unknown as EventTarget)).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
  });
});
