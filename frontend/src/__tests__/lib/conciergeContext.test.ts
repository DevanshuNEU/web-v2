import { describe, it, expect } from 'vitest';
import { identity } from '@/data/aboutMe';
import {
  buildGrounding,
  buildConciergeSystem,
  MAX_QUERY_LENGTH,
  sanitizeVoice,
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

  it('carries few-shot voice examples and the anti-recitation rule', () => {
    const sys = buildConciergeSystem();
    const lower = sys.toLowerCase();
    expect(sys).toContain('HOW I ANSWER');
    expect(lower).toContain('answer the specific question');
    // our authored head (rules + few-shot) must be em-dash free; the grounding
    // data after the CONTEXT marker is source content and may contain them.
    const promptHead = sys.split('--- CONTEXT ---')[0];
    expect(promptHead).not.toMatch(/[—–―]/);
  });

  describe('sanitizeVoice', () => {
    it('replaces em dashes with commas', () => {
      expect(sanitizeVoice('I ship things — fast — and clean.'))
        .toBe('I ship things, fast, and clean.');
    });

    it('replaces en dashes and tight (unspaced) dashes too', () => {
      expect(sanitizeVoice('2020–2026')).toBe('2020, 2026');
      expect(sanitizeVoice('state—of—the—art')).toBe('state, of, the, art');
    });

    it('tidies the space-comma seam streamed chunks create, idempotently', () => {
      // chunk "foo " + sanitized chunk ", bar" concatenate to "foo , bar"
      const seam = sanitizeVoice('foo , bar');
      expect(seam).toBe('foo, bar');
      expect(sanitizeVoice(seam)).toBe(seam);
    });

    it('leaves clean text untouched', () => {
      const clean = 'I build AI dev tools at the MCP layer.';
      expect(sanitizeVoice(clean)).toBe(clean);
    });
  });

  it('caps query length to a sane positive bound', () => {
    expect(MAX_QUERY_LENGTH).toBeGreaterThan(0);
    expect(MAX_QUERY_LENGTH).toBeLessThanOrEqual(2000);
  });
});
