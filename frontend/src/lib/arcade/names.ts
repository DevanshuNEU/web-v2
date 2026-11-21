/**
 * Player names: validation, a small profanity filter, and the crown.
 *
 * Names are unique case-insensitively: "Dev" and "dev" are the same player.
 * The board stores scores under nameKey(display) and keeps the display form
 * in a hash.
 */

export const NAME_MIN = 2;
export const NAME_MAX = 12;

const ALLOWED = /^[\p{L}\p{M}\p{N} _]+$/u;
// Invisible characters that render as nothing: the combining grapheme
// joiner, zero-width spaces and joiners, word joiners, the BOM, variation
// selectors and tag characters. Never allowed, so two names that look the
// same are the same name.
const INVISIBLE = /[\u00AD\u034F\u061C\u115F\u1160\u17B4\u17B5\u180B-\u180F\u200B-\u200F\u202A-\u202E\u2060-\u206F\u3164\uFE00-\uFE0F\uFEFF\uFFA0]|\uDB40[\uDC00-\uDDEF]/u;

// Letters from other scripts that look like Latin ones, for the
// impersonation check only (the name itself is stored as typed).
const CONFUSABLE: Record<string, string> = {
  а: 'a', в: 'b', е: 'e', ё: 'e', к: 'k', м: 'm', н: 'h', о: 'o', р: 'p', с: 'c', т: 't', у: 'y', х: 'x',
  і: 'i', ї: 'i', ј: 'j', ѕ: 's', ԁ: 'd', ԛ: 'q', ԝ: 'w', һ: 'h', ү: 'y', ӏ: 'l',
  α: 'a', β: 'b', ε: 'e', η: 'n', ι: 'i', κ: 'k', ν: 'v', ο: 'o', ρ: 'p', τ: 't', υ: 'u', χ: 'x', ω: 'w',
  ı: 'i', ł: 'l', ø: 'o', đ: 'd', ħ: 'h', ŀ: 'l', ɡ: 'g', ɑ: 'a', ʀ: 'r',
};

/**
 * What a name looks like: compatibility-folded (full-width letters become
 * ASCII), accents stripped, look-alike letters mapped to Latin, then
 * squashed. Two names with the same skeleton read the same on the board.
 */
export function skeleton(s: string): string {
  const folded = s.normalize('NFKD').replace(/\p{M}+/gu, '').toLowerCase();
  return squash(Array.from(folded, (ch) => CONFUSABLE[ch] ?? ch).join(''));
}
const HAS_ALNUM = /[\p{L}\p{N}]/u;

const LEET: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '@': 'a',
  $: 's',
};

// Matched anywhere in the squashed name. Only words that rarely hide inside
// an innocent one belong here.
const BLOCK_ANYWHERE = [
  'fuck', 'fuk', 'fck', 'shit', 'bitch', 'nigger', 'nigga', 'faggot', 'whore', 'slut',
  'pussy', 'penis', 'vagina', 'dildo', 'porn', 'hitler', 'wank', 'twat', 'bastard',
  'asshole', 'jizz', 'cunt', 'kkk', 'blowjob', 'boner', 'molest', 'pedo',
];

// Matched only as a whole word (split on spaces and underscores) or as the
// whole squashed name, so "class" and "Dickens" stay allowed.
const BLOCK_WHOLE = [
  'ass', 'arse', 'cum', 'fag', 'fags', 'tit', 'tits', 'dick', 'dicks', 'cock', 'cocks',
  'rape', 'rapist', 'retard', 'nazi', 'sex', 'anal', 'anus', 'hoe', 'kys', 'coon',
  'spic', 'chink', 'kike', 'wetback', 'semen', 'nude', 'nudes', 'boob', 'boobs',
];

/** Storage key for a display name: NFC, lowercase. */
export function nameKey(display: string): string {
  return display.normalize('NFC').toLowerCase();
}

function deleet(s: string): string {
  return Array.from(s.toLowerCase(), (ch) => LEET[ch] ?? ch).join('');
}

/** Lowercase, leetspeak undone, spaces and underscores removed. */
export function squash(s: string): string {
  return deleet(s).replace(/[\s_]+/g, '');
}

export function isProfane(name: string): boolean {
  const squashed = squash(name);
  const collapsed = squashed.replace(/(.)\1+/gu, '$1');
  const forms = [squashed, collapsed];
  if (forms.some((f) => BLOCK_ANYWHERE.some((w) => f.includes(w)))) return true;
  const words = deleet(name).split(/[\s_]+/).filter(Boolean);
  const candidates = [...words, ...words.map((w) => w.replace(/(.)\1+/gu, '$1')), squashed, collapsed];
  return candidates.some((w) => BLOCK_WHOLE.includes(w));
}

export type NameCheck =
  | { ok: true; display: string; key: string; crowned: boolean }
  | { ok: false; code: 'bad_name' | 'name_taken'; message: string };

const TAKEN = 'That name is taken. Pick another.';

export function crownEnv(): { herName: string | null } {
  return { herName: process.env.ARCADE_HER_NAME?.trim() || null };
}

/** Her name as stored on the board, when the crown code resolves to it. */
export function crownedName(herName: string): Extract<NameCheck, { ok: true }> {
  const display = herName.normalize('NFC');
  return { ok: true, display, key: nameKey(display), crowned: true };
}

/**
 * Turn a submitted name into the stored display name and key, or say what to
 * change. Typing her name is refused so nobody can wear her crown; only the
 * crown code (lib/arcade/crown.ts, checked by the service before this) posts
 * under it.
 */
export function resolveName(raw: unknown, env = crownEnv()): NameCheck {
  if (typeof raw !== 'string') {
    return { ok: false, code: 'bad_name', message: `Send a name as text, ${NAME_MIN} to ${NAME_MAX} characters.` };
  }
  // Checked before trim(), which would quietly drop a trailing BOM.
  if (INVISIBLE.test(raw)) {
    return { ok: false, code: 'bad_name', message: 'That name has an invisible character in it. Type it again without it.' };
  }
  const trimmed = raw.normalize('NFC').trim();

  const display = trimmed.replace(/ {2,}/g, ' ');
  const length = Array.from(display).length;
  if (length < NAME_MIN) {
    return { ok: false, code: 'bad_name', message: `That name is too short. Use at least ${NAME_MIN} characters.` };
  }
  if (length > NAME_MAX) {
    return { ok: false, code: 'bad_name', message: `That name is too long. Use ${NAME_MAX} characters or fewer.` };
  }
  if (!ALLOWED.test(display)) {
    return {
      ok: false,
      code: 'bad_name',
      message: 'Names can only use letters, numbers, spaces and underscores. Remove the other characters.',
    };
  }
  if (!HAS_ALNUM.test(display)) {
    return { ok: false, code: 'bad_name', message: 'Names need at least one letter or number. Add one.' };
  }

  if (env.herName) {
    const her = env.herName.normalize('NFC');
    if (nameKey(display) === nameKey(her) || squash(display) === squash(her) || skeleton(display) === skeleton(her)) {
      return { ok: false, code: 'name_taken', message: TAKEN };
    }
  }

  if (isProfane(display)) {
    return { ok: false, code: 'bad_name', message: 'That name is not allowed on the board. Pick a different one.' };
  }

  return { ok: true, display, key: nameKey(display), crowned: false };
}
