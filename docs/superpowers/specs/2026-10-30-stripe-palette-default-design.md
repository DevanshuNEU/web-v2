# Color palette as the default, redesigned in the Stripe "Product Glyphs" direction

Date: 2026-10-30. Status: design. Owner decisions made in chat on 2026-10-30: direction A ("Product Glyphs") from the mockup; the color palette becomes the default; returning visitors are moved to it once; the "Fun" label is renamed.
Research behind the values: `docs/research/2026-10-30-stripe-icons-and-color.md` (cited as "research §N").

## Intent

The desktop has two palettes: `mono` (graphite, today's default) and `color` (labelled "Fun": saturated Tailwind 500 gradients, white gloss, colored glows, lucide glyphs). The owner wants the color palette to be the face of the site and to look elegant, in the way Stripe designs its product surfaces. Direction A puts every app on the same deep navy tile and moves the color into a two-tone glyph, grouped into a few hue families, so the dock reads like a Stripe product grid instead of a row of 15 candy tiles.

## Goals

- `color` is the default palette for new visitors and, once, for returning visitors.
- The UI calls the two options "Color" and "Mono". The word "Fun" no longer appears in the UI or in Help copy.
- In the color palette, every app tile is the direction A tile: navy gradient, hairline border, lit top edge, navy-tinted shadow, two-tone Phosphor glyph colored by the app's flavor family.
- The same tile renders everywhere app tiles appear: dock, desktop icons, Launchpad, app switcher, and the phone shell's home screen and app library.
- Window chrome, dock glass, accent and focus ring follow the Stripe craft rules in research §4 and §5.5 to §5.6.
- First paint shows the right palette (no flash of mono for returning visitors who have not chosen anything).
- The mono palette keeps its current look, except that its tiles use the same Phosphor glyphs (in white) so both palettes share one icon set.

## Non-goals

- No custom hand-drawn icons (research phase 2). Phosphor only.
- No change to app content colors inside windows (Games, Terminal, Skills, etc. keep their existing palette branches).
- No change to wallpapers or to the light/dark mode default (dark stays default).
- No new font. Söhne is licensed; keep the current fonts.
- No change to the generative signature visuals (Halftone, Dither, AsciiField, Plotter). They stay mono-only, so the color default shows the plain photo and no generative art. Accepted with the color default (my call, flagged to the owner).
- Phone shell: only the app tile face changes. The phone dock glass and the iOS-colored Settings row tiles stay as they are.
- No app glyph in window title bars (the pale flavor colors would fail contrast on light title bars).

## Anti-goals

- A rainbow: 15 different hues in a row. Families are the point.
- Glyph colors that fail 3:1 against the tile (WCAG 1.4.11).
- A returning visitor sees mono for a frame, then color.
- Any app tile still showing the old Tailwind gradient or white gloss in the color palette.
- Breaking the mono palette's legibility or its existing tests.

## Decided design

### Palette default and migration

- `themeStore` default `palette: 'color'`, default `accentColor` blurple `#635BFF`.
- `themeStore` persist gets `version: 1` and a `migrate` that sets `palette: 'color'` and `accentColor: '#635BFF'` for any stored blob below version 1, keeping every other field (mode, wallpaper, wallpaperByMode, tint). This flips visitors who had deliberately chosen mono; the owner accepted that. After the migration their choice persists normally.
- The pre-paint boot script (`app/layout.tsx`, `THEME_BOOT_SCRIPT`) applies the same rule: `data-palette="mono"` only when the stored blob is version 1 or later and `palette === 'mono'`; everything else is `color`. Move the script string to `lib/themeBoot.ts` so it can be tested by evaluating it against stored blobs.
- Labels: Settings (desktop and mobile) show "Color" first, then "Mono"; Help copy says "Color or Mono". Hints: Color "Navy tiles, two-tone icons."; Mono "Black and white." (replaces "the way it ships", which is no longer true). Code comments that say "Fun" in touched files become "Color".

### Accent

- Default accent `#635BFF` (research §1.3, Stripe's classic blurple). In dark mode, `ThemeProvider` renders this preset as `#7A73FF` so it keeps contrast on dark surfaces (research §5.6).
- `ACCENT_COLORS` gains `blurple: '#635BFF'` as its first entry; the other presets stay. Swatches and "active" checks compare the stored hex, so the blurple swatch shows `#635BFF` in both modes.
- No accent flash at first paint: the boot script also sets `--color-accent`, `--primary` and `--ring` (blurple, or `#7A73FF` in dark, or the stored accent, or graphite in mono, mirroring `ThemeProvider`), and the `:root` / `.dark` CSS defaults in `globals.css` change from `#007AFF` to the blurple values. The Launchpad pulse ring in `Taskbar.tsx` (`rgba(59,130,246,0.35)`) uses the accent var instead.

### Tile (color palette), both light and dark mode

Values from research §5.2:

- background `linear-gradient(180deg, oklch(0.30 0.05 268) 0%, oklch(0.22 0.06 268) 100%)`
- border `1px solid oklch(1 0 0 / 0.08)`
- box-shadow `inset 0 1px 0 oklch(1 0 0 / 0.10), 0 6px 12px -2px rgba(50,50,93,0.35), 0 3px 7px -3px rgba(0,0,0,0.40)`
- radius stays `size * 0.22`; no gloss overlay; no colored glow.

### Glyph

- Phosphor `duotone` weight at `size * 0.56`.
- Back layer (the duotone's `opacity` shape): flat flavor `back` color at opacity 0.9.
- Front layer: vertical linear gradient from flavor `top` to flavor `bottom`, via an SVG `<linearGradient>` with a per-instance id (`useId`).
- Mono palette: same glyph, white front, back layer white at Phosphor's default 0.2, on today's graphite tile.

### App to glyph and flavor (research §5.2 table, verbatim values)

| App | Phosphor icon | Flavor | back | top | bottom |
|---|---|---|---|---|---|
| about-me | IdentificationCard | chroma | #00d4ff | #ccffff | #7a73ff |
| resume | ReadCvLogo | chroma | #00d4ff | #ccffff | #7a73ff |
| dev-ai | Sparkle | cottonCandy | #ff80ff | #fac7ff | #0073e6 |
| contact | PaperPlaneTilt | pomegranate | #ff5996 | #ffdcf2 | #9966ff |
| games | GameController | sunset | #ff80ff | #ffeeb2 | #ffbb00 |
| projects | Folders | sunburst | #ff7700 | #ffea9e | #ffbb00 |
| changelog | Scroll | sunburst | #ff7700 | #ffea9e | #ffbb00 |
| github-activity | GithubLogo | lemonLime | #00d924 | #fff5ad | #ffd848 |
| analytics | ChartBar | wintergreen | #00d924 | #cbffef | #1df5e9 |
| skills-dashboard | Pulse | overcast | #11efe3 | #b3ffff | #0073e6 |
| browser | Compass | overcast | #11efe3 | #b3ffff | #0073e6 |
| file-explorer | HardDrives | slate | #b4d2eb | #ecf6ff | #7995ac |
| terminal | TerminalWindow | slate | #b4d2eb | #ecf6ff | #7995ac |
| display-options | GearSix | slate | #b4d2eb | #ecf6ff | #7995ac |
| help | Lifebuoy | slate | #b4d2eb | #ecf6ff | #7995ac |

Each flavor's `back` and both gradient stops must reach at least 3:1 contrast against the tile midpoint `#19223f`. A unit test enforces it.

### Where it lives

- `appRegistry` gains `glyph` (the Phosphor component) and `flavor` (a flavor key) per app. The existing `icon` (lucide, used for small inline UI) and `iconColor` stay until nothing reads `iconColor`; remove `iconColor` once every tile uses `flavor`.
- `lib/iconColors.ts` is replaced by the flavor table plus the tile style (same file or a renamed `lib/appTile.ts`, builder's choice).
- One tile component renders both palettes. Desktop `components/os/AppIcon.tsx` and phone `components/mobile/AppIcon.tsx` both use it (the phone component keeps its button, label and haptics; only the tile face is shared).
- Call sites (`Taskbar`, `DesktopIcons`, `Launchpad`, `AppSwitcher`) pass `appType` instead of `icon` + `colorKey`.

### Window chrome (color palette)

- Traffic lights (research §5.5): close `oklch(0.68 0.20 27)`, minimize `oklch(0.84 0.16 84)`, zoom `oklch(0.76 0.19 145)`, each with `box-shadow: inset 0 0 0 0.5px` ring `oklch(0.55 0.18 27)` / `oklch(0.68 0.15 80)` / `oklch(0.60 0.17 145)`; hover glyph colors `oklch(0.45 0.12 27)` / `oklch(0.50 0.11 84)` / `oklch(0.45 0.12 145)`. Inactive windows show all three as `oklch(0.55 0.015 260 / 0.45)` with no glyph. Mono traffic lights unchanged.
- Active window shadow: `0 0 0 1px oklch(1 0 0 / 0.06), 0 50px 100px -20px rgba(50,50,93,0.25), 0 30px 60px -30px rgba(0,0,0,0.5)` in dark, same with `rgba(0,0,0,0.3)` last layer in light. Inactive: `0 30px 45px -30px rgba(50,50,93,0.25), 0 18px 36px -18px rgba(0,0,0,0.1)`. The accent-tinted ring is removed. Applies in both palettes (shadows are neutral).

### Dock (color palette)

- Glass tinted navy: dark `oklch(0.22 0.05 268 / 0.55)`, light `oklch(0.98 0.005 248 / 0.6)`; border `oklch(1 0 0 / 0.10)`; shadow `0 20px 80px -16px #0d173840, 0 10px 60px -16px #0d173833`. Blur radius unchanged.
- Running indicator: the app's flavor `back` color instead of `bg-text/80`. Mono unchanged.

### Focus and motion

- `:focus-visible` outline becomes `3px solid rgb(var(--color-accent))` with `outline-offset: 2px` (research §4.4, minus Stripe's 0.6 alpha: at 0.6 blurple measured about 2.4:1, below WCAG 1.4.11's 3:1). Applies in both palettes; in mono the accent var is graphite.
- Add `ease.stripe = [0.25, 1, 0.5, 1]` to `lib/motion.ts` and use it (as the CSS `cubic-bezier(.25,1,.5,1)`, 150 ms) for the traffic-light color transition. No other motion changes; no new hover effects on tiles (the dock magnification and desktop tilt stay as they are).

## Verification

- Unit tests: boot script sets the accent vars for color dark, color light, stored custom accent, and mono; theme migration (v0 mono -> color, v0 color stays color, accent reset, other fields kept, v1 mono stays mono); boot script evaluated against those blobs sets the right `data-palette`; every registry app has a glyph and a flavor; every flavor color reaches 3:1 against `#19223f`; the tile component renders the navy tile and a gradient whose id is unique per instance in color, and the graphite tile in mono; no element in the color dock uses the old Tailwind gradient strings.
- Existing suite stays green; tests that assumed the mono default are updated to set mono explicitly where they test mono behavior.
- `npm run build` passes.
- Screenshots (production build): desktop dark and light, color and mono, with the dock, desktop icons, Launchpad, an open window (active and inactive), the app switcher; phone shell home screen in color. Saved under `.context/shots/palette-*` and embedded in the PR.

## Left to the builder

- File names for the flavor table and tile component.
- Whether `iconColor` removal lands in the same commit.
- Exact Tailwind vs inline-style split, matching surrounding code.

## Delivery

Separate PR from branch `DevanshuNEU/stripe-palette`, built natively in this session per the owner's choice.
