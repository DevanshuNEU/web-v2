import { describe, it, expect } from 'vitest';
import {
  normalizeUrl,
  hostOf,
  isEmbeddableUrl,
  isSecure,
  START_URL,
  START_LINKS,
} from '@/lib/browser';

describe('browser logic', () => {
  describe('normalizeUrl', () => {
    it('keeps full urls as-is', () => {
      expect(normalizeUrl('https://opencodeintel.com')).toBe('https://opencodeintel.com');
    });
    it('prepends https to bare hosts', () => {
      expect(normalizeUrl('github.com')).toBe('https://github.com');
    });
    it('maps empty input to the start page', () => {
      expect(normalizeUrl('   ')).toBe(START_URL);
    });
  });

  describe('hostOf', () => {
    it('strips www', () => {
      expect(hostOf('https://www.getsaar.com/x')).toBe('getsaar.com');
    });
    it('returns null for junk', () => {
      expect(hostOf('not a url')).toBeNull();
    });
  });

  describe('isEmbeddableUrl', () => {
    it('allows the portfolio (the only frame-able own site)', () => {
      expect(isEmbeddableUrl('https://devanshuchicholikar.com')).toBe(true);
      expect(isEmbeddableUrl('https://www.devanshuchicholikar.com/about')).toBe(true);
    });
    it('sends frame-blocking sites to the fallback card', () => {
      // OCI and Saar send X-Frame-Options / frame-ancestors, so they fall back.
      expect(isEmbeddableUrl('https://opencodeintel.com')).toBe(false);
      expect(isEmbeddableUrl('https://getsaar.com')).toBe(false);
      expect(isEmbeddableUrl('https://github.com')).toBe(false);
      expect(isEmbeddableUrl('https://google.com')).toBe(false);
      expect(isEmbeddableUrl('about:home')).toBe(false);
    });
  });

  it('isSecure tracks the https scheme', () => {
    expect(isSecure('https://x.com')).toBe(true);
    expect(isSecure('http://x.com')).toBe(false);
  });

  it('every start link is a real https url', () => {
    for (const link of START_LINKS) {
      expect(link.url).toMatch(/^https:\/\//);
      expect(hostOf(link.url)).not.toBeNull();
    }
  });
});
