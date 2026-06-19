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

  it('system prompt carries the rules and the grounding', () => {
    const sys = buildConciergeSystem();
    expect(sys).toContain('devOS Concierge');
    expect(sys).toContain('--- CONTEXT ---');
    // the hard rules are stated to the model
    expect(sys.toLowerCase()).toContain('never mention visa');
    expect(sys.toLowerCase()).toContain('never call him a "student"');
    expect(sys.toLowerCase()).toContain('never use em dashes');
    // grounding is appended
    expect(sys).toContain(identity.name);
  });

  it('caps query length to a sane positive bound', () => {
    expect(MAX_QUERY_LENGTH).toBeGreaterThan(0);
    expect(MAX_QUERY_LENGTH).toBeLessThanOrEqual(2000);
  });
});
