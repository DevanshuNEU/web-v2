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
import { MotionGlobalConfig } from 'framer-motion';

// Framer Motion animations rely on requestAnimationFrame, which JSDom
// supplies but does not drive deterministically. Skipping animations
// makes exit animations complete synchronously, so AnimatePresence
// actually unmounts removed children inside a single test tick.
MotionGlobalConfig.skipAnimations = true;

// Auto-unmount after every test to prevent state leaking between cases.
afterEach(() => {
  cleanup();
});
