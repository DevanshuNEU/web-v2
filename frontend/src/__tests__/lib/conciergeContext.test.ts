import { describe, it, expect } from 'vitest';
import { identity } from '@/data/aboutMe';
import {
  buildGrounding,
  buildConciergeSystem,
  MAX_QUERY_LENGTH,
} from '@/lib/conciergeContext';

describe('conciergeContext', () => {
  it('grounds on the real portfolio data', () => {
    const g = buildGrounding();
    expect(g).toContain(identity.name); // "Devanshu Chicholikar"
    expect(g).toContain('Financial Copilot'); // a known projectMeta displayName
    expect(g).toContain('IDENTITY');
    expect(g).toContain('PROJECTS');
  });

  it('keeps the grounding free of visa/sponsorship framing', () => {
    // Note: "grad students" legitimately appears (people he TA'd), so the
    // student *label* rule is enforced in the system prompt, not here.
    const g = buildGrounding().toLowerCase();
    expect(g).not.toContain('visa');
    expect(g).not.toContain('sponsorship');
  });

  it('system prompt carries the first-person voice, rules, and grounding', () => {
    const sys = buildConciergeSystem();
    const lower = sys.toLowerCase();
    expect(sys).toContain('--- CONTEXT ---');
    // answers as Devanshu, in first person
    expect(sys).toContain(`You are ${identity.name}`);
    expect(lower).toContain('first person');
    // the hard rules are stated to the model
    expect(lower).toContain('never mention visa');
    expect(lower).toContain('never describe myself as a "student"');
    expect(lower).toContain('never use em dashes');
  });

  it('caps query length to a sane positive bound', () => {
    expect(MAX_QUERY_LENGTH).toBeGreaterThan(0);
    expect(MAX_QUERY_LENGTH).toBeLessThanOrEqual(2000);
  });
});
