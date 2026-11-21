import { describe, it, expect } from 'vitest';
import { prefersPhoneShell } from '@/lib/shellChoice';

/**
 * The phone shell used to be chosen by width alone (under 768px), so a phone
 * turned sideways (844 by 390) loaded the desktop OS and lost every open app.
 */
describe('prefersPhoneShell', () => {
  it.each([
    ['iPhone portrait', 390, 844, true, true],
    ['iPhone landscape', 844, 390, true, true],
    ['iPhone Pro Max landscape', 932, 430, true, true],
    ['small Android landscape', 780, 360, true, true],
    ['narrow desktop window', 700, 900, false, true],
    ['iPad mini portrait (unchanged, under 768)', 744, 1133, true, true],
    ['iPad landscape stays desktop', 1180, 820, true, false],
    ['laptop', 1440, 900, false, false],
    ['short laptop window with a mouse stays desktop', 1200, 450, false, false],
    ['touch laptop', 1366, 768, true, false],
  ])('%s: %i x %i, coarse %s -> phone %s', (_label, width, height, coarse, phone) => {
    expect(prefersPhoneShell({ width, height, coarse })).toBe(phone);
  });
});
