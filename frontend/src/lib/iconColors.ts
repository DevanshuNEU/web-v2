/**
 * Icon color system — CSS values, not Tailwind classes.
 *
 * Uses inline style objects so gradients/shadows can never be purged
 * by Tailwind's JIT scanner. Each app's `iconColor` key from appRegistry
 * maps to a rich multi-stop gradient, a colored drop shadow, and an
 * ambient glow color.
 */

export interface IconColorScheme {
  gradient: string;
  shadow: string;
  glow: string;
}

export const ICON_COLORS: Record<string, IconColorScheme> = {
  blue: {
    gradient: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 40%, #1d4ed8 100%)',
    shadow: 'rgba(37, 99, 235, 0.45)',
    glow: 'rgba(59, 130, 246, 0.2)',
  },
  orange: {
    gradient: 'linear-gradient(135deg, #fdba74 0%, #f97316 40%, #c2410c 100%)',
    shadow: 'rgba(234, 88, 12, 0.45)',
    glow: 'rgba(249, 115, 22, 0.2)',
  },
  purple: {
    gradient: 'linear-gradient(135deg, #c084fc 0%, #a855f7 40%, #7e22ce 100%)',
    shadow: 'rgba(126, 34, 206, 0.45)',
    glow: 'rgba(168, 85, 247, 0.2)',
  },
  teal: {
    gradient: 'linear-gradient(135deg, #5eead4 0%, #14b8a6 40%, #0d7377 100%)',
    shadow: 'rgba(13, 148, 136, 0.45)',
    glow: 'rgba(20, 184, 166, 0.2)',
  },
  pink: {
    gradient: 'linear-gradient(135deg, #f9a8d4 0%, #ec4899 40%, #be185d 100%)',
    shadow: 'rgba(190, 24, 93, 0.45)',
    glow: 'rgba(236, 72, 153, 0.2)',
  },
  slate: {
    gradient: 'linear-gradient(135deg, #94a3b8 0%, #475569 40%, #1e293b 100%)',
    shadow: 'rgba(30, 41, 59, 0.5)',
    glow: 'rgba(71, 85, 105, 0.2)',
  },
  green: {
    gradient: 'linear-gradient(135deg, #86efac 0%, #22c55e 40%, #15803d 100%)',
    shadow: 'rgba(21, 128, 61, 0.45)',
    glow: 'rgba(34, 197, 94, 0.2)',
  },
  red: {
    gradient: 'linear-gradient(135deg, #fca5a5 0%, #ef4444 40%, #b91c1c 100%)',
    shadow: 'rgba(185, 28, 28, 0.45)',
    glow: 'rgba(239, 68, 68, 0.2)',
  },
  sky: {
    gradient: 'linear-gradient(135deg, #7dd3fc 0%, #0ea5e9 40%, #0369a1 100%)',
    shadow: 'rgba(3, 105, 161, 0.45)',
    glow: 'rgba(14, 165, 233, 0.2)',
  },
  amber: {
    gradient: 'linear-gradient(135deg, #fde68a 0%, #f59e0b 40%, #b45309 100%)',
    shadow: 'rgba(180, 83, 9, 0.45)',
    glow: 'rgba(245, 158, 11, 0.2)',
  },
  indigo: {
    gradient: 'linear-gradient(135deg, #a5b4fc 0%, #6366f1 40%, #3730a3 100%)',
    shadow: 'rgba(55, 48, 163, 0.45)',
    glow: 'rgba(99, 102, 241, 0.2)',
  },
};

export function getIconColors(colorKey: string): IconColorScheme {
  return ICON_COLORS[colorKey] ?? ICON_COLORS.blue;
}
