import { describe, it, expect } from 'vitest';
import { resolveName, isProfane } from '@/lib/arcade/names';

const noCrown = { code: null, herName: null };
const crown = { code: 'moonlight', herName: 'Juniper' };

describe('arcade name filter', () => {
  it('accepts and trims a valid name', () => {
    expect(resolveName('  Dev_01  ', noCrown)).toEqual({ ok: true, display: 'Dev_01', key: 'dev_01', crowned: false });
    expect(resolveName('Ana Lu', noCrown).ok).toBe(true);
  });

  it('accepts unicode letters', () => {
    const r = resolveName('Zoë Müller', noCrown);
    expect(r).toMatchObject({ ok: true, key: 'zoë müller' });
    expect(resolveName('देव', noCrown).ok).toBe(true);
  });

  it('rejects too short and too long with a hint', () => {
    const short = resolveName(' a ', noCrown);
    expect(short).toMatchObject({ ok: false, code: 'bad_name' });
    if (!short.ok) expect(short.message).toMatch(/at least 2/);
    const long = resolveName('abcdefghijklm', noCrown);
    expect(long).toMatchObject({ ok: false, code: 'bad_name' });
    if (!long.ok) expect(long.message).toMatch(/12 characters or fewer/);
  });

  it('rejects other characters and non-strings', () => {
    for (const bad of ['dev!', 'a-b', '<b>hi', 'tab\there', 42, null]) {
      expect(resolveName(bad, noCrown)).toMatchObject({ ok: false, code: 'bad_name' });
    }
    expect(resolveName('__', noCrown)).toMatchObject({ ok: false, code: 'bad_name' });
  });

  it('blocks profanity, including leetspeak and spacing', () => {
    for (const bad of ['fuck', 'FuCk you', 'f u c k', 'sh1t', '5h17', 'b1tch_', 'a55', 'big dick', 'fuuuck']) {
      expect(isProfane(bad), bad).toBe(true);
      expect(resolveName(bad, noCrown), bad).toMatchObject({ ok: false, code: 'bad_name' });
    }
  });

  it('leaves innocent names that contain a short bad word alone', () => {
    for (const ok of ['class', 'Dickens', 'Cassie', 'title', 'peacock', 'Hancock']) {
      expect(isProfane(ok), ok).toBe(false);
    }
  });

  it('never leaks a message with a dash character', () => {
    const r = resolveName('x', noCrown);
    if (!r.ok) expect(r.message).not.toMatch(/[\u2013\u2014]/);
  });
});

describe('crown', () => {
  it('stores the crown code under her name with a crown', () => {
    expect(resolveName(' MoonLight ', crown)).toEqual({ ok: true, display: 'Juniper', key: 'juniper', crowned: true });
  });

  it('refuses her name without the code', () => {
    for (const fake of ['Juniper', 'juniper', 'JUNIPER', 'jun1per', 'Juni_per']) {
      expect(resolveName(fake, crown), fake).toEqual({ ok: false, code: 'name_taken', message: 'That name is taken. Pick another.' });
    }
  });

  it('refuses the code when there is no name to store it under', () => {
    expect(resolveName('moonlight', { code: 'moonlight', herName: null })).toMatchObject({ ok: false, code: 'name_taken' });
  });

  it('treats her name as an ordinary name when no crown is configured', () => {
    expect(resolveName('Juniper', noCrown)).toMatchObject({ ok: true, crowned: false });
  });
});

describe('invisible characters', () => {
  it('refuses zero-width and other invisible characters in any name', () => {
    for (const n of ['Dev\u200B', 'De\u034Fv', 'Dev\uFEFF', 'D\u2060ev', 'Dev\uFE0F']) {
      expect(resolveName(n, { code: null, herName: null })).toMatchObject({ ok: false, code: 'bad_name' });
    }
  });

  it('still allows real accented and non-Latin names', () => {
    for (const n of ['Zoë', 'José', 'देव', 'Ана', '小明']) {
      expect(resolveName(n, { code: null, herName: null })).toMatchObject({ ok: true });
    }
  });
});
