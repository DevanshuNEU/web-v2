/**
 * Living-desktop ambient tint.
 *
 * Maps the local hour to a subtle color wash applied over the wallpaper: warm
 * at dawn/dusk, deep indigo at night, near-neutral midday. Pure function so the
 * boundaries are unit-testable.
 */

export type DayPhase = 'dawn' | 'day' | 'dusk' | 'night';

export function phaseForHour(hour: number): DayPhase {
  if (hour >= 5 && hour < 8) return 'dawn';
  if (hour >= 8 && hour < 17) return 'day';
  if (hour >= 17 && hour < 20) return 'dusk';
  return 'night';
}

const PHASE_TINT: Record<DayPhase, string> = {
  dawn: 'rgba(255, 170, 90, 0.14)', // amber
  day: 'rgba(120, 170, 255, 0.06)', // cool, faint
  dusk: 'rgba(255, 120, 80, 0.16)', // orange
  night: 'rgba(30, 40, 120, 0.20)', // deep indigo
};

export function tintForHour(hour: number): string {
  return PHASE_TINT[phaseForHour(hour)];
}
