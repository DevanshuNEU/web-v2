import { describe, it, expect } from 'vitest';
import { resolveName, isProfane, skeleton } from '@/lib/arcade/names';

const noCrown = { herName: null };
const crown = { herName: 'Juniper' };

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
  it('is never a name: the crown code is too long for one (the service checks codes, see arcadeCrown.test.ts)', () => {
    expect(resolveName('moonlight over the bay', crown)).toMatchObject({ ok: false, code: 'bad_name' });
  });

  it('refuses her name without the code', () => {
    for (const fake of ['Juniper', 'juniper', 'JUNIPER', 'jun1per', 'Juni_per']) {
      expect(resolveName(fake, crown), fake).toEqual({ ok: false, code: 'name_taken', message: 'That name is taken. Pick another.' });
    }
  });

  it('treats her name as an ordinary name when no crown is configured', () => {
    expect(resolveName('Juniper', noCrown)).toMatchObject({ ok: true, crowned: false });
  });
});

describe('invisible characters', () => {
  it('refuses zero-width and other invisible characters in any name', () => {
    for (const n of ['Dev\u200B', 'De\u034Fv', 'Dev\uFEFF', 'D\u2060ev', 'Dev\uFE0F']) {
      expect(resolveName(n, { herName: null })).toMatchObject({ ok: false, code: 'bad_name' });
    }
  });

  it('still allows real accented and non-Latin names', () => {
    for (const n of ['Zoë', 'José', 'देव', 'Ана', '小明']) {
      expect(resolveName(n, { herName: null })).toMatchObject({ ok: true });
    }
  });
});

describe('look-alikes of her name', () => {
  // A placeholder with an h, o, l and u in it.
  const hollow = { herName: 'Hollow Sun' };
  const taken = { ok: false, code: 'name_taken' };

  it('gives capital I, lowercase l and digit 1 one skeleton', () => {
    expect(skeleton('Il1')).toBe(skeleton('lll'));
    for (const fake of ['HoIIow Sun', 'Ho11ow Sun', 'HolIow Sun', 'Ho1low Sun']) {
      expect(resolveName(fake, hollow), fake).toMatchObject(taken);
    }
  });

  it('blocks Armenian o, u and h', () => {
    for (const fake of ['\u0570ollow Sun', 'H\u0585llow Sun', 'Hollow S\u057Dn']) {
      expect(resolveName(fake, hollow), fake).toMatchObject(taken);
    }
  });

  it('blocks other common Latin look-alikes from the Unicode confusables list', () => {
    const fakes = [
      '\u0397ollow Sun', // Greek capital eta
      'Ho\u01C0low Sun', // Latin letter dental click
      'Hollow \u0405un', // Cyrillic capital dze
      'Hollo\u0461 Sun', // Cyrillic omega
      'Hollow Su\u0578', // Armenian vo
      'H\u03C3llow Sun', // Greek small sigma
      'Hollow S\u028Bn', // Latin v with hook
      'Ho\u0627low Sun', // Arabic alef
    ];
    for (const fake of fakes) expect(resolveName(fake, hollow), fake).toMatchObject(taken);
    expect(resolveName('Ho\u217Clow Sun', hollow)).toMatchObject({ ok: false }); // small roman fifty
  });

  it('still lets genuinely different names through', () => {
    for (const ok of ['Hallow Sun', 'Hollow Son', 'Mellow Sun', 'Willow']) {
      expect(resolveName(ok, hollow), ok).toMatchObject({ ok: true });
    }
  });
});
