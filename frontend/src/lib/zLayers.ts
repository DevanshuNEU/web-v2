/**
 * One z-index scale for the desktop shell.
 *
 * Desktop.tsx renders three stacking contexts side by side at the root:
 *   1. the content box (z CONTENT): desktop icons, widgets and every window.
 *      Window z-indexes (1000+) only compete inside this box, so a window can
 *      never rise above the dock, the menu bar or an overlay.
 *   2. the bars: dock and menu bar.
 *   3. the overlays slot: notifications, Spotlight, the app switcher and the
 *      assistant, rendered after the dock so they sit above it.
 *
 * Use these constants instead of magic numbers. Tailwind needs literal class
 * names, so components pass them through `style={{ zIndex: Z.x }}`.
 */
export const Z = {
  /** The content box that holds icons, widgets and windows. */
  content: 10,
  /** Desktop icons and widgets, inside the content box, under windows. */
  desktopItem: 1,
  /** Dock shelf. */
  dock: 50,
  /** First-visit hint next to the dock. */
  hint: 60,
  /** Notification toasts: above windows and the dock. */
  notifications: 900,
  /** Menu bar. */
  menuBar: 999,
  /** Floating assistant orb and chat panel. */
  assistant: 8500,
  /** Launchpad is modal: it covers the menu bar and the assistant orb. */
  launchpad: 8600,
  /** Spotlight backdrop and panel (panel is +1). */
  spotlight: 9000,
  /** Option+Tab switcher. */
  switcher: 9500,
  /** Boot overlay. */
  boot: 9999,
  /** Custom cursor. */
  cursor: 10000,
} as const;
