/**
 * ISO 8601 week label for a UTC timestamp, for example "2026-W47". The ISO
 * year can differ from the calendar year in the first and last days of
 * January and December, so both parts come from the week's Thursday.
 */
export function isoWeek(ms: number): string {
  const d = new Date(ms);
  const thursday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = thursday.getUTCDay() || 7;
  thursday.setUTCDate(thursday.getUTCDate() + 4 - day);
  const year = thursday.getUTCFullYear();
  const week = Math.ceil(((thursday.getTime() - Date.UTC(year, 0, 1)) / 86_400_000 + 1) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}
