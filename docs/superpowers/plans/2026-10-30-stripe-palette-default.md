# Color Palette Default (Product Glyphs) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the color palette the default and restyle it in the Stripe "Product Glyphs" direction: navy tiles, two-tone Phosphor glyphs in flavor families, Stripe window chrome, navy dock, blurple accent.

**Architecture:** A flavor table plus one tile component render every app tile (desktop and phone). The theme store migrates once to the color palette; a testable boot script applies palette and accent before first paint. Window chrome and dock read the palette through `useIsMono()` as they do today.

**Tech Stack:** Next.js 15, React 19.1, Tailwind 3, framer-motion 12, zustand 5 persist, @phosphor-icons/react 2.1.10, vitest + jsdom.

**Spec:** `docs/superpowers/specs/2026-10-30-stripe-palette-default-design.md`. Values come from `docs/research/2026-10-30-stripe-icons-and-color.md` §5.

## Global Constraints

- Work in `frontend/`. Tests: `npx vitest run <path>`; full suite `npx vitest run` (baseline on this branch: 84 files, 805 tests).
- Exact values (tile gradient, border, shadows, flavor hexes, traffic-light oklch values, dock glass, accent hexes `#635BFF` / `#7A73FF`) are copied verbatim from the spec.
- Flavor colors must reach 3:1 against `#19223f`.
- Mono palette output stays as it is today except tiles use the Phosphor glyph in white.
- Phone shell: only the tile face changes.
- No em dash or en dash characters in code, comments, tests, copy, or commit messages.
- Commit messages end with a blank line then `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.

## Review Focus

1. A returning visitor with a pre-migration blob that says `mono` and a custom accent: first paint and hydrated state are both color with blurple. Test in Task 1.
2. A visitor who picks Mono after the migration keeps Mono across reloads (no re-migration). Test in Task 1.
3. Two tiles of the same app on screen at once (dock and Launchpad): gradient ids do not collide. Test in Task 2.
4. Light mode: navy tiles on the light wallpaper still read; traffic lights keep their rings. Checked in Task 6 screenshots.
5. Mono tiles still graphite with a white glyph after the icon switch. Test in Task 2.

---

### Task 1: Default, migration, accent, boot script

**Files:**
- Create: `frontend/src/lib/themeBoot.ts`
- Modify: `frontend/src/store/themeStore.ts`, `frontend/src/components/providers/ThemeProvider.tsx`, `frontend/src/app/layout.tsx`, `frontend/src/app/globals.css` (`--color-accent` defaults in `:root` and `.dark`)
- Test: `frontend/src/__tests__/store/themeStore.test.ts`, create `frontend/src/__tests__/lib/themeBoot.test.ts`

**Interfaces:**
- Produces: `BLURPLE = '#635BFF'`, `BLURPLE_DARK = '#7A73FF'`, `ACCENT_COLORS.blurple` (first key); `migrateTheme(persisted: unknown, version: number)` used as the persist `migrate`; `THEME_BOOT_SCRIPT: string` exported from `lib/themeBoot.ts`.

- [ ] Tests first: migrate v0 `{palette:'mono', accentColor:'#FF9500', mode:'light', wallpaper:W}` gives palette `color`, accent `#635BFF`, mode and wallpaper kept; v0 color stays color with accent reset; store default palette is `color` and accent `#635BFF`; after `setPalette('mono')` the persisted blob has version 1 and palette mono. Boot script (eval with `new Function(THEME_BOOT_SCRIPT)()` after seeding localStorage): no blob gives `data-palette="color"` and class `dark`; v0 mono blob gives `color`; v1 mono gives `mono`; v1 color with accent `#FF9500` sets `--color-accent` to `255 149 0`; v1 color with blurple in dark leaves the CSS default (no inline accent).
- [ ] Run, see them fail. Implement. Run, see them pass. Update existing tests that assumed the mono default to set it explicitly. Full suite. Commit "Make the color palette the default with a blurple accent".

### Task 2: Flavor table, tile component, glyphs everywhere

**Files:**
- Create: `frontend/src/lib/appTile.ts` (flavor table, tile style, mono scheme), `frontend/src/components/shared/AppTile.tsx` (tile face)
- Delete: `frontend/src/lib/iconColors.ts`
- Modify: `frontend/src/lib/appRegistry.ts` (add `glyph`, `flavor`; remove `iconColor`), `frontend/src/lib/mobileAppRegistry.ts`, `frontend/src/components/os/AppIcon.tsx`, `frontend/src/components/mobile/AppIcon.tsx`, call sites in `Taskbar.tsx`, `DesktopIcons.tsx`, `Launchpad.tsx`, `AppSwitcher.tsx`
- Test: create `frontend/src/__tests__/lib/appTile.test.ts`, `frontend/src/__tests__/os/AppTile.test.tsx`

**Interfaces:**
- Produces: `type FlavorKey`; `FLAVORS: Record<FlavorKey, { back: string; top: string; bottom: string }>`; `COLOR_TILE` (background, border, boxShadow); `<AppTile appType={AppType} size={number} />`; `<AppIcon appType size />` (desktop).

- [ ] Tests first: every `appRegistry` entry has `glyph` and a `flavor` in `FLAVORS`; the spec's app-to-flavor map matches exactly; every flavor color has contrast >= 3 against `#19223f` (WCAG relative luminance); color palette tile has the spec background and no element with the old Tailwind gradient strings; two tiles of one app render two distinct gradient ids, each referenced by its own glyph; mono tile renders the graphite gradient and the glyph front in white.
- [ ] Run, fail, implement, pass. Full suite. Commit "Render every app tile as a navy tile with a two-tone Phosphor glyph".

### Task 3: Window chrome

**Files:** Modify `frontend/src/components/os/Window.tsx`, `frontend/src/lib/motion.ts` (`ease.stripe`), `frontend/src/app/globals.css` (`:focus-visible`). Test: extend `frontend/src/__tests__/os/windowDrag.test.tsx` neighbours or create `frontend/src/__tests__/os/windowChrome.test.tsx`.

- [ ] Tests first: color palette active window shadow equals the spec string for dark; inactive shadow equals the spec string; no `--color-accent` ring in either; traffic-light spans in color use the spec oklch fills and inset ring; inactive window shows the inactive fill and no glyph; mono traffic lights unchanged.
- [ ] Run, fail, implement, pass. Commit "Give windows Stripe shadows, ringed traffic lights and a softer focus ring".

### Task 4: Dock

**Files:** Modify `frontend/src/components/os/Taskbar.tsx`. Test: extend `frontend/src/__tests__/os/shellRenders.test.tsx` or create `dockStyle.test.tsx`.

- [ ] Tests first: color palette dock `nav[aria-label="Dock"]` background is the spec dark value in dark mode and light value in light mode; running indicator for an open about-me window has the chroma `back` color; Launchpad pulse ring uses `rgb(var(--color-accent)`; mono dock unchanged.
- [ ] Run, fail, implement, pass. Commit "Tint the dock navy and color running dots by app family".

### Task 5: Labels and copy

**Files:** Modify `frontend/src/components/apps/SettingsApp.tsx`, `frontend/src/components/apps/MobileSettings.tsx`, `frontend/src/components/apps/HelpApp.tsx`, comments mentioning "Fun" in files this plan touches. Test: `frontend/src/__tests__/mobile/apps/MobileSettings.test.tsx`, Settings and Help tests.

- [ ] Tests first: Settings and MobileSettings show "Color" before "Mono"; no visible "Fun"; hints match the spec; Help copy says "Color or Mono".
- [ ] Run, fail, implement, pass. `grep -rn "Fun" src --include='*.tsx'` shows no UI string. Commit "Call the palettes Color and Mono".

### Task 6: Verify and ship

- [ ] Full suite, `npx tsc --noEmit`, `npm run build`.
- [ ] Production build screenshots: desktop dark and light in color and mono (dock, desktop icons, Launchpad, active and inactive window, app switcher), phone shell home in color. Save under `.context/shots/palette-*`.
- [ ] Re-run the drag scenarios (`.context/pw/scenarios.mjs`) to confirm nothing regressed.
- [ ] Final whole-branch review on the most capable model, fix findings, then PR.
