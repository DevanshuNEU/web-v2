import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

// WCAG 2.2 SC 1.4.11: a focus indicator needs 3:1 against what is around it.
// Blurple at full strength is about 4.7:1 on white and 4.6:1 on the dark
// surface; at 60% alpha it fell to about 2.4:1, so the ring stays opaque.
describe('focus ring', () => {
  it('draws a 3px opaque accent outline', () => {
    const css = readFileSync(path.resolve(__dirname, '../../app/globals.css'), 'utf8');
    const rule = css.match(/(^|\n):focus-visible\s*\{([^}]*)\}/)![2];
    expect(rule).toMatch(/outline:\s*3px solid rgb\(var\(--color-accent\)\);/);
  });
});
