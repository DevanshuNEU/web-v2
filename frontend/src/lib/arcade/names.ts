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

export function crownEnv(): { code: string | null; herName: string | null } {
  return {
    code: process.env.ARCADE_CROWN_CODE?.trim() || null,
    herName: process.env.ARCADE_HER_NAME?.trim() || null,
  };
}

/**
 * Turn a submitted name into the stored display name and key, or say what to
 * change. The crown code is checked first so it may be any string, and it
 * never reaches the board: it stores under ARCADE_HER_NAME instead. Typing
 * her name without the code is refused so nobody can wear her crown.
 */
export function resolveName(raw: unknown, env = crownEnv()): NameCheck {
  if (typeof raw !== 'string') {
    return { ok: false, code: 'bad_name', message: `Send a name as text, ${NAME_MIN} to ${NAME_MAX} characters.` };
  }
  const trimmed = raw.normalize('NFC').trim();

  if (env.code && trimmed.toLowerCase() === env.code.toLowerCase()) {
    // A code with no name to store under would leak the code onto the board.
    if (!env.herName) return { ok: false, code: 'name_taken', message: TAKEN };
    const display = env.herName.normalize('NFC');
    return { ok: true, display, key: nameKey(display), crowned: true };
  }

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
    if (nameKey(display) === nameKey(her) || squash(display) === squash(her)) {
      return { ok: false, code: 'name_taken', message: TAKEN };
    }
  }

  if (isProfane(display)) {
    return { ok: false, code: 'bad_name', message: 'That name is not allowed on the board. Pick a different one.' };
  }

  return { ok: true, display, key: nameKey(display), crowned: false };
}
