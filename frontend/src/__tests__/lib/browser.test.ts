import { describe, it, expect } from 'vitest';
import {
  normalizeUrl,
  hostOf,
  isEmbeddableUrl,
  isSecure,
  START_URL,
  START_LINKS,
  SITE_LINKS,
  EXTERNAL_LINKS,
} from '@/lib/browser';

const ORIGIN = 'http://localhost:3477';

describe('browser logic', () => {
  describe('normalizeUrl', () => {
    it('keeps full urls as-is', () => {
      expect(normalizeUrl('https://opencodeintel.com', ORIGIN)).toBe('https://opencodeintel.com');
    });
    it('prepends https to bare hosts', () => {
      expect(normalizeUrl('github.com', ORIGIN)).toBe('https://github.com');
    });
    it('maps empty input to the start page', () => {
      expect(normalizeUrl('   ', ORIGIN)).toBe(START_URL);
    });
    it('resolves a path against the current origin', () => {
      expect(normalizeUrl('/writing', ORIGIN)).toBe(`${ORIGIN}/writing`);
    });
    it("maps this site's production URLs to the current origin, so they can be framed", () => {
      expect(normalizeUrl('https://www.devanshuchicholikar.com/resume', ORIGIN)).toBe(`${ORIGIN}/resume`);
      expect(normalizeUrl('devanshuchicholikar.com/about', ORIGIN)).toBe(`${ORIGIN}/about`);
    });
    it('returns null for a search phrase instead of inventing a host', () => {
      expect(normalizeUrl('react hooks', ORIGIN)).toBeNull();
      expect(normalizeUrl('hello', ORIGIN)).toBeNull();
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
    it('embeds same-origin pages', () => {
      expect(isEmbeddableUrl(`${ORIGIN}/writing`, ORIGIN)).toBe(true);
      expect(isEmbeddableUrl(`${ORIGIN}/projects/opencodeintel`, ORIGIN)).toBe(true);
      expect(isEmbeddableUrl('/resume', ORIGIN)).toBe(true);
    });
    it('never embeds the desktop itself', () => {
      expect(isEmbeddableUrl(`${ORIGIN}/`, ORIGIN)).toBe(false);
      expect(isEmbeddableUrl(ORIGIN, ORIGIN)).toBe(false);
    });
    it('sends other sites to the new-tab card', () => {
      expect(isEmbeddableUrl('https://opencodeintel.com', ORIGIN)).toBe(false);
      expect(isEmbeddableUrl('https://getsaar.com', ORIGIN)).toBe(false);
      expect(isEmbeddableUrl('https://github.com', ORIGIN)).toBe(false);
      expect(isEmbeddableUrl('about:home', ORIGIN)).toBe(false);
    });
    it('embeds nothing without an origin (server render)', () => {
      expect(isEmbeddableUrl('/writing')).toBe(false);
    });
  });

  it('isSecure tracks the https scheme', () => {
    expect(isSecure('https://x.com')).toBe(true);
    expect(isSecure('http://x.com')).toBe(false);
  });

  it('start links: site pages are paths that embed, the rest are https sites', () => {
    expect(START_LINKS.length).toBe(SITE_LINKS.length + EXTERNAL_LINKS.length);
    for (const link of SITE_LINKS) {
      expect(link.url).toMatch(/^\/[a-z]/);
      expect(isEmbeddableUrl(link.url, ORIGIN)).toBe(true);
    }
    for (const link of EXTERNAL_LINKS) {
      expect(link.url).toMatch(/^https:\/\//);
      expect(isEmbeddableUrl(link.url, ORIGIN)).toBe(false);
    }
  });
});
