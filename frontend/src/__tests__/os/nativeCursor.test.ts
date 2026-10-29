import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Guard: the site uses the system cursor.
 *
 * A page-drawn cursor trails the real pointer and breaks over iframes, resize
 * edges and text fields. These checks fail if any piece of the old custom
 * cursor (component, mount, CSS override, spring token) comes back.
 */

const SRC = path.resolve(__dirname, '../..');
const read = (rel: string) => readFileSync(path.join(SRC, rel), 'utf8');

// Built at runtime: Tailwind scans src/ for class names, and the literal here
// would make it emit an unused utility for that class into the CSS bundle.
const HIDE_CLASS = ['cursor', 'none'].join('-');

describe('native cursor', () => {
  it('has no Cursor component file', () => {
    expect(existsSync(path.join(SRC, 'components/os/Cursor.tsx'))).toBe(false);
  });

  it('does not import or render Cursor in Desktop', () => {
    expect(read('components/os/Desktop.tsx')).not.toMatch(/\bCursor\b/);
  });

  it('does not hide the system cursor in globals.css', () => {
    const css = read('app/globals.css');
    expect(css).not.toContain('cursor: none');
    expect(css).not.toContain(HIDE_CLASS);
  });

  it('has no spring.cursor token', () => {
    expect(read('lib/motion.ts')).not.toMatch(/\bcursor:\s*\{/);
  });
});
