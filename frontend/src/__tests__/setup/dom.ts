/**
 * Test setup for component tests.
 *
 * Import this from any test that needs DOM rendering. Pair it with
 *   // @vitest-environment jsdom
 * at the top of the test file so vitest uses jsdom rather than the
 * default node environment (existing data tests keep using node).
 */

import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Auto-unmount after every test to prevent state leaking between cases.
afterEach(() => {
  cleanup();
});
