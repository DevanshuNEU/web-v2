import { describe, it, expect } from 'vitest';
import {
  RELEASES,
  CHANGE_TYPES,
  CHANGE_TYPE_LABEL,
  type ChangeType,
} from '../../data/changelog';

const VALID_TYPES: ChangeType[] = ['feature', 'fix', 'perf', 'refactor', 'release'];
const SEMVER = /^\d+\.\d+\.\d+$/;

describe('RELEASES array', () => {
  it('is non-empty', () => {
    expect(RELEASES.length).toBeGreaterThan(0);
  });

  it('every release has a semver version', () => {
    for (const release of RELEASES) {
      expect(release.version, `release "${release.codename}" has bad version`).toMatch(SEMVER);
    }
  });

  it('all versions are unique', () => {
    const versions = RELEASES.map((r) => r.version);
    expect(new Set(versions).size).toBe(versions.length);
  });

  it('every release has a non-empty date', () => {
    for (const release of RELEASES) {
      expect(release.date.trim(), `release v${release.version} has empty date`).not.toBe('');
    }
  });

  it('every release has a non-empty codename', () => {
    for (const release of RELEASES) {
      expect(release.codename.trim(), `release v${release.version} has empty codename`).not.toBe('');
    }
  });

  it('every release has a non-empty summary', () => {
    for (const release of RELEASES) {
      expect(release.summary.trim(), `release v${release.version} has empty summary`).not.toBe('');
    }
  });

  it('every release has at least one change', () => {
    for (const release of RELEASES) {
      expect(release.changes.length, `release v${release.version} has no changes`).toBeGreaterThan(0);
    }
  });

  it('every change has a valid type', () => {
    for (const release of RELEASES) {
      for (const change of release.changes) {
        expect(
          VALID_TYPES.includes(change.type),
          `release v${release.version} has invalid change type: ${change.type}`,
        ).toBe(true);
      }
    }
  });

  it('every change has non-empty text', () => {
    for (const release of RELEASES) {
      for (const change of release.changes) {
        expect(change.text.trim(), `release v${release.version} has an empty change`).not.toBe('');
      }
    }
  });

  it('no change text contains an em dash', () => {
    for (const release of RELEASES) {
      for (const change of release.changes) {
        expect(change.text.includes('—'), `release v${release.version} change has an em dash`).toBe(false);
      }
    }
  });

  it('contains a latest (first) release', () => {
    expect(RELEASES[0]).toBeDefined();
    expect(RELEASES[0].highlight).toBe(true);
  });
});

describe('CHANGE_TYPES', () => {
  it('lists exactly the valid change types', () => {
    expect([...CHANGE_TYPES].sort()).toEqual([...VALID_TYPES].sort());
  });

  it('has no duplicates', () => {
    expect(new Set(CHANGE_TYPES).size).toBe(CHANGE_TYPES.length);
  });
});

describe('CHANGE_TYPE_LABEL', () => {
  it('has a label for every change type', () => {
    for (const type of VALID_TYPES) {
      expect(CHANGE_TYPE_LABEL[type], `missing label for ${type}`).toBeDefined();
      expect(CHANGE_TYPE_LABEL[type].trim()).not.toBe('');
    }
  });

  it('has no extra labels beyond the valid types', () => {
    expect(Object.keys(CHANGE_TYPE_LABEL).sort()).toEqual([...VALID_TYPES].sort());
  });
});
