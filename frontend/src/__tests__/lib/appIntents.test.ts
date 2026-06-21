import { describe, it, expect } from 'vitest';
import { appIntents, type AppIntent, type AppIntentKind } from '@/lib/appIntents';
import type { AppType } from '../../../../shared/types';
import { appRegistry } from '@/lib/appRegistry';

const VALID_KINDS: AppIntentKind[] = ['open', 'filter', 'focus', 'ask-about'];
const VALID_APP_TYPES = new Set(Object.keys(appRegistry) as AppType[]);

// Flatten every intent across the manifest, paired with the map key it lives under.
const allEntries = (Object.entries(appIntents) as [AppType, typeof appIntents[AppType]][])
  .flatMap(([key, intents]) => (intents ?? []).map(intent => ({ key, intent })));

describe('appIntents manifest', () => {
  it('is non-empty', () => {
    expect(allEntries.length).toBeGreaterThan(0);
  });

  it('every key is a valid AppType', () => {
    for (const key of Object.keys(appIntents) as AppType[]) {
      expect(VALID_APP_TYPES.has(key), `key "${key}" is not a valid AppType`).toBe(true);
    }
  });

  it('every entry appType field equals its map key', () => {
    for (const { key, intent } of allEntries) {
      expect(intent.appType, `intent ${intent.id} appType "${intent.appType}" != key "${key}"`).toBe(key);
    }
  });

  it('every intent id is unique across the whole manifest', () => {
    const ids = allEntries.map(e => e.intent.id);
    const unique = new Set(ids);
    expect(unique.size, `duplicate ids present: ${ids.join(', ')}`).toBe(ids.length);
  });

  it('every kind is one of the four allowed kinds', () => {
    for (const { intent } of allEntries) {
      expect(VALID_KINDS.includes(intent.kind), `intent ${intent.id} has invalid kind: ${intent.kind}`).toBe(true);
    }
  });

  it('every label is a non-empty string with no em dash', () => {
    for (const { intent } of allEntries) {
      expect(typeof intent.label, `intent ${intent.id} label is not a string`).toBe('string');
      expect(intent.label.trim(), `intent ${intent.id} has empty label`).not.toBe('');
      expect(intent.label.includes('—'), `intent ${intent.id} label contains an em dash`).toBe(false);
    }
  });

  it('every id is a namespaced, non-empty string', () => {
    for (const { intent } of allEntries) {
      expect(intent.id.trim(), 'empty intent id').not.toBe('');
      expect(intent.id.includes('.'), `intent id "${intent.id}" is not namespaced`).toBe(true);
    }
  });

  it('declared params are non-empty strings when present', () => {
    for (const { intent } of allEntries) {
      if (!intent.params) continue;
      for (const param of intent.params) {
        expect(param.trim(), `intent ${intent.id} has an empty param name`).not.toBe('');
      }
    }
  });

  it('every seeded app has both open and ask-about intents', () => {
    for (const [key, intents] of Object.entries(appIntents) as [AppType, AppIntent[]][]) {
      const kinds = new Set((intents ?? []).map(i => i.kind));
      expect(kinds.has('open'), `app "${key}" missing open intent`).toBe(true);
      expect(kinds.has('ask-about'), `app "${key}" missing ask-about intent`).toBe(true);
    }
  });
});
