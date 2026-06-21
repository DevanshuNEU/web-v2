import { describe, it, expect } from 'vitest';
import {
  TOUR_STEPS,
  APPS_IN_HELP,
  SHORTCUTS,
} from '../../components/apps/HelpApp';
import { appRegistry, getAppLabel } from '../../lib/appRegistry';

describe('TOUR_STEPS', () => {
  it('is non-empty', () => {
    expect(TOUR_STEPS.length).toBeGreaterThan(0);
  });

  it('every step has a non-empty glyph, title, and body', () => {
    for (const step of TOUR_STEPS) {
      expect(step.glyph.trim(), `step "${step.title}" has empty glyph`).not.toBe('');
      expect(step.title.trim(), 'a step has an empty title').not.toBe('');
      expect(step.body.trim(), `step "${step.title}" has empty body`).not.toBe('');
    }
  });

  it('all step titles are unique', () => {
    const titles = TOUR_STEPS.map((s) => s.title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it('contains no em dashes', () => {
    for (const step of TOUR_STEPS) {
      expect(step.body.includes('—'), `step "${step.title}" body has an em dash`).toBe(false);
      expect(step.title.includes('—'), `step "${step.title}" title has an em dash`).toBe(false);
    }
  });
});

describe('APPS_IN_HELP', () => {
  it('is non-empty', () => {
    expect(APPS_IN_HELP.length).toBeGreaterThan(0);
  });

  it('every app type resolves to a real registry entry', () => {
    for (const appType of APPS_IN_HELP) {
      expect(appRegistry[appType], `no registry entry for ${appType}`).toBeDefined();
    }
  });

  it('every app type resolves to a non-empty label and description', () => {
    for (const appType of APPS_IN_HELP) {
      const label = getAppLabel(appType);
      expect(label.title.trim(), `${appType} has empty title`).not.toBe('');
      expect(label.description.trim(), `${appType} has empty description`).not.toBe('');
    }
  });

  it('has no duplicate app types', () => {
    expect(new Set(APPS_IN_HELP).size).toBe(APPS_IN_HELP.length);
  });
});

describe('SHORTCUTS', () => {
  it('is non-empty', () => {
    expect(SHORTCUTS.length).toBeGreaterThan(0);
  });

  it('every row has at least one key and a non-empty description', () => {
    for (const row of SHORTCUTS) {
      expect(row.keys.length, `"${row.description}" has no keys`).toBeGreaterThan(0);
      for (const k of row.keys) {
        expect(k.trim(), `"${row.description}" has an empty key`).not.toBe('');
      }
      expect(row.description.trim(), 'a shortcut row has an empty description').not.toBe('');
    }
  });

  it('all descriptions are unique', () => {
    const descs = SHORTCUTS.map((r) => r.description);
    expect(new Set(descs).size).toBe(descs.length);
  });
});
