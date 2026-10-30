# Seamless Window Drag Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Windows on the desktop shell move and resize 1:1 with the pointer, with zero React or store work during the gesture, while snap, maximize, genie, open/close, saved layout and reduced motion keep working.

**Architecture:** Drag writes `x`/`y` MotionValues (transform only) from pointer-captured titlebar events and commits position to the zustand store once on release. The window's `layout` animation is gated by `layoutDependency` so only maximize and snap animate. Resize writes live bounds to the element and commits once. A small gesture flag on `<html>` shields iframes and pauses wallpaper parallax during any window gesture.

**Tech Stack:** Next.js 15, React 19.1, framer-motion 12.38 (`useMotionValue`, `frame`, `layoutDependency`), zustand 5 (`persist`, `useShallow` from `zustand/react/shallow`), vitest 4 + jsdom + @testing-library/react.

**Spec:** `docs/superpowers/specs/2026-10-30-seamless-window-drag-design.md`. Research behind it: `docs/research/2026-10-30-window-drag-smoothness.md` (sections 5.2 to 5.6 contain a code sketch of the drag handler and the snap sequence; read them before Task 4).

## Global Constraints

- All work in `frontend/`. Run tests with `npx vitest run <path>` from `frontend/`; full suite `npx vitest run` (baseline: 80 files, 738 tests, all pass).
- Component tests start with `// @vitest-environment jsdom` and `import '../setup/dom';` (path relative to the test file), like existing tests in `src/__tests__/os/`.
- Desktop shell only. Do not touch `src/components/mobile/*`.
- No new dependencies. No Motion `drag` prop, no react-rnd/react-draggable/dnd-kit.
- No `scale` on drag, no lift cue, no release inertia.
- Clamp semantics: x in `[0, vw - width]`, y in `[MENUBAR_H, vh - height - DOCK_H]`; a window larger than the band pins to x 0, y `MENUBAR_H`. `MENUBAR_H = 28`, `DOCK_H = 74` from `src/lib/windowSnap.ts`.
- Store writes only on discrete events: at most one on pointerdown (focus, skipped when already on top), one on release (skipped if nothing moved), one for a snap. Zero during the move.
- Never write an em dash or en dash character in code, comments, tests, or commit messages. Use a hyphen, comma, colon or parentheses.
- Match surrounding style: `'use client'` files, single quotes, 2-space indent, short doc comments explaining why.
- Every commit message ends with a blank line then `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.
- Stay on the current git branch. Do not push.

## Review Focus

1. A drag that starts while the window is still in its open animation (y spring from 30 to 0 in flight): the window must not jump, and must end at the dropped position. Test in Task 4.
2. A window closed or minimized (keyboard shortcut, or unmount) mid-drag or mid-resize: the `data-window-drag` flag on `<html>` must clear, so iframes and parallax are not left disabled. Tests in Tasks 3, 4 and 5.
3. Double-click on the titlebar: maximize still toggles, and the two pointerdown/up pairs cause no position write. Test in Task 4.
4. A second pointer (another finger, or pen while mouse is down) during a drag: ignored; only the captured pointer moves the window. Test in Task 4.
5. A window bigger than the viewport (small screen, then browser shrunk) dragged: pins to the band's top-left, never negative coordinates. Test in Task 1.

---

### Task 1: Geometry helpers and snap-zone fix

**Files:**
- Modify: `frontend/src/lib/windowGeometry.ts`
- Modify: `frontend/src/lib/windowSnap.ts`
- Test: `frontend/src/__tests__/lib/windowGeometry.test.ts`, `frontend/src/__tests__/lib/windowSnap.test.ts`

**Interfaces:**
- Produces:
  - `clampWindowPosition(pos: { x: number; y: number }, size: Size, vw: number, vh: number): { x: number; y: number }` in `windowGeometry.ts`.
  - `SNAP_TOP_EDGE = 4` exported from `windowSnap.ts`; `computeSnap` treats `py <= MENUBAR_H + SNAP_TOP_EDGE` as near the top (also for top corners). Left, right and bottom keep `SNAP_EDGE`.
  - `sameSnap(a: SnapBounds | null, b: SnapBounds | null): boolean` in `windowSnap.ts` (value equality; two nulls are equal).

- [ ] **Step 1: Write failing tests**

In `windowGeometry.test.ts`, `describe('clampWindowPosition')` with VW 1440, VH 900, size 800x600:
- `clampWindowPosition({ x: 300, y: 200 }, size, VW, VH)` equals `{ x: 300, y: 200 }`.
- `{ x: -40, y: 5 }` gives `{ x: 0, y: 28 }`.
- `{ x: 2000, y: 2000 }` gives `{ x: 640, y: 226 }` (1440 - 800, 900 - 600 - 74).
- Larger than viewport: size 1600x1000, `{ x: 50, y: 300 }` gives `{ x: 0, y: 28 }`.

In `windowSnap.test.ts`:
- `computeSnap(500, 32, VW, VH)` still fills (`{ x: 0, y: 28, width: 1000, height: 698 }`).
- `computeSnap(500, 40, VW, VH)` is `null` (was fill before the fix).
- `computeSnap(4, 40, VW, VH)` is the left half `{ x: 0, y: 28, width: 500, height: 698 }`, not the top-left quarter.
- `computeSnap(4, 30, VW, VH)` is still the top-left quarter.
- `sameSnap(null, null)` true; `sameSnap(a, { ...a })` true; `sameSnap(a, null)` false; `sameSnap(a, { ...a, width: a.width + 1 })` false.

- [ ] **Step 2: Run and see them fail**

Run: `npx vitest run src/__tests__/lib/windowGeometry.test.ts src/__tests__/lib/windowSnap.test.ts`
Expected: FAIL (`clampWindowPosition` / `sameSnap` not exported; `computeSnap(500, 40)` returns the fill bounds).

- [ ] **Step 3: Implement the three changes**

Update the `computeSnap` doc comment to say why the top zone is thin (a window parked at the menu bar is grabbed inside a 54 px zone otherwise). All existing snap tests must still pass unchanged.

- [ ] **Step 4: Run and see them pass**

Run the same command. Expected: PASS, including the pre-existing cases.

- [ ] **Step 5: Commit**

```bash
git add src/lib/windowGeometry.ts src/lib/windowSnap.ts src/__tests__/lib/windowGeometry.test.ts src/__tests__/lib/windowSnap.test.ts
git commit -m "Add drag clamp and snap equality helpers, thin the top snap zone"
```

---

### Task 2: Store: no-op focus and a single bounds write

**Files:**
- Modify: `frontend/src/store/osStore.ts`
- Test: `frontend/src/__tests__/store/osStore.test.ts`

**Interfaces:**
- Consumes: `WindowBounds` from `src/lib/windowGeometry.ts`.
- Produces:
  - `focusWindow(id)` does nothing (no `set`, so no persist write and no subscriber notify) when `activeWindowId === id`, the window is not minimized, and its `zIndex === nextZIndex - 1`.
  - `setWindowBounds(windowId: string, bounds: WindowBounds): void` writes position and size in one `set`. Add it to the `OSStore` interface.

- [ ] **Step 1: Write failing tests**

`describe('osStore.focusWindow')`:
- open `about-me`, call `focusWindow(id)` once, capture `useOSStore.getState()`; subscribe a `vi.fn()` with `useOSStore.subscribe`; call `focusWindow(id)` again; expect the listener not called and `nextZIndex` unchanged.
- open `about-me` then `projects`; `focusWindow(aboutId)` raises it: listener called once, about's `zIndex` equals previous `nextZIndex`.
- a minimized active window: `focusWindow` still un-minimizes it.

`describe('osStore.setWindowBounds')`:
- `setWindowBounds(id, { x: 10, y: 40, width: 700, height: 500 })` sets `position` `{ x: 10, y: 40 }` and `size` `{ width: 700, height: 500 }`; subscribed listener called exactly once; other windows unchanged.

- [ ] **Step 2: Run and see them fail**

Run: `npx vitest run src/__tests__/store/osStore.test.ts`
Expected: FAIL (listener called on repeat focus; `setWindowBounds` is not a function).

- [ ] **Step 3: Implement both**

- [ ] **Step 4: Run and see them pass**

Run the same command, then `npx vitest run src/__tests__/lib/recruiterTour.test.ts src/__tests__/os` to confirm focus callers still behave. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/store/osStore.ts src/__tests__/store/osStore.test.ts
git commit -m "Skip redundant focus writes and add a single-write setWindowBounds"
```

---

### Task 3: Window gesture flag, iframe shield, parallax pause

**Files:**
- Create: `frontend/src/lib/windowGesture.ts`
- Modify: `frontend/src/app/globals.css` (one rule, next to other shell rules)
- Modify: `frontend/src/components/os/ParallaxProvider.tsx`
- Test: `frontend/src/__tests__/lib/windowGesture.test.ts`

**Interfaces:**
- Produces:
  - `beginWindowGesture(): () => void` increments a module-level counter and sets `document.documentElement.dataset.windowDrag = ''`; returns an idempotent `end` function that decrements once and removes the attribute when the count reaches 0.
  - `isWindowGestureActive(): boolean`.
  - CSS: `[data-window-drag] iframe { pointer-events: none; }`.
  - `ParallaxProvider`'s `onMove` returns early while `isWindowGestureActive()`, so the wallpaper holds still during a drag.

- [ ] **Step 1: Write failing tests** (jsdom)

- after `const end = beginWindowGesture()`: `document.documentElement.hasAttribute('data-window-drag')` true and `isWindowGestureActive()` true; after `end()`: both false.
- calling `end()` twice leaves the count at 0 (a second `begin`/`end` pair still toggles correctly).
- two overlapping gestures: attribute stays until both ends are called.
- `ParallaxProvider`: render a consumer that reads `useParallaxContext()`; dispatch `pointermove` on `window` with `clientX` 0 while a gesture is active, expect `nx.get()` still 0; after `end()`, the same event sets `nx.get()` to `-0.5`. Stub `window.matchMedia` to report `(pointer: fine)` matches and ensure reduced motion is off.

- [ ] **Step 2: Run and see them fail**

Run: `npx vitest run src/__tests__/lib/windowGesture.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement the module, the CSS rule, and the parallax guard**

- [ ] **Step 4: Run and see them pass**

Run the same command. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/windowGesture.ts src/app/globals.css src/components/os/ParallaxProvider.tsx src/__tests__/lib/windowGesture.test.ts
git commit -m "Add a window gesture flag that shields iframes and holds the wallpaper still"
```

---

### Task 4: Pointer-captured drag on MotionValues

**Files:**
- Create: `frontend/src/hooks/useWindowDrag.ts`
- Modify: `frontend/src/components/os/Window.tsx`
- Test: `frontend/src/__tests__/os/windowDrag.test.tsx`

**Interfaces:**
- Consumes: `clampWindowPosition`, `sameSnap`, `computeSnap` (Task 1); `focusWindow`, `updateWindowPosition`, `snapWindow` from the store (Task 2 semantics); `beginWindowGesture` (Task 3).
- Produces: `useWindowDrag(win: WindowState): { x: MotionValue<number>; y: MotionValue<number>; snapPreview: SnapBounds | null; layoutKey: number; titlebarProps: { onPointerDown; onPointerMove; onPointerUp; onPointerCancel; onLostPointerCapture } }` (React pointer handlers for an `HTMLDivElement`).

Behavior the hook must have (research section 5.2 has a sketch):
- `onPointerDown`: ignore unless `e.button === 0`, the target is not inside a `button`, and the window is not maximized. Then `setPointerCapture`, `x.stop()`/`y.stop()`, `focusWindow`, record pointer id, start pointer, start position (the store position plus the current `x`/`y`, so a drag during the open rise does not jump), viewport size, and call `beginWindowGesture()`.
- `onPointerMove`: ignore other pointer ids. Clamp with `clampWindowPosition`, set `x`/`y` to the offset from the stored position. Snap: track whether the pointer has been outside every zone this drag (`computeSnap(...) === null` at least once); only then compute the preview; call `setSnapPreview` only when `!sameSnap(next, current)`.
- End (`pointerup`, `pointercancel`, `lostpointercapture`, and unmount): run once per gesture. Call the gesture `end()`. If the window moved, `updateWindowPosition` with the final position, then `x.jump(0)`/`y.jump(0)`. If a preview was showing on `pointerup` (not on cancel), then in `frame.postRender` (import `frame` from `framer-motion`) bump `layoutKey` and call `snapWindow(win.id, preview)`. Clear the preview.

Changes in `Window.tsx`:
- Remove `handleMouseDown`, the `document` mousemove/mouseup effect, `isDragging`, `isDraggingState`, `dragOffset`, `snapPreviewRef`.
- The open-animation effect no longer depends on drag state and no longer animates `scale` on drag (keep `scale: 1` in its target); it runs on mount and on `reduced` change.
- `motion.div`: `style={{ x, y, ... }}` alongside the existing left/top/width/height; `layoutDependency={`${window.isMaximized}:${layoutKey}`}`; `transition={{ layout: reduced ? INSTANT : spring.windowLayout }}` (drop the `isResizing` branch, Task 5 relies on `layoutDependency` instead).
- Titlebar: spread `titlebarProps`, add `touch-none`, keep `onDoubleClick` maximize and `cursor-move select-none`.
- Snap preview overlay reads `snapPreview` from the hook.

- [ ] **Step 1: Write failing tests**

Setup in the test file: stub `Element.prototype.setPointerCapture`, `releasePointerCapture`, `hasPointerCapture` with `vi.fn()`; set `document.documentElement.clientWidth/clientHeight` to 1440/900 via `Object.defineProperty`; reset the store as in `osStore.test.ts`; open `about-me` and render `<Window window={win}><div /></Window>` reading the window from the store. If jsdom's `fireEvent.pointerDown` drops `clientX`/`button`/`pointerId`, define a minimal `PointerEvent` subclass of `MouseEvent` in the test that carries `pointerId`. Spy on store actions with `vi.spyOn(useOSStore.getState(), ...)` replaced via `useOSStore.setState({ updateWindowPosition: spy })` or by counting `useOSStore.subscribe` calls; pick one and use it consistently.

Tests:
- `moves 1:1 and commits once on release`: pointerDown at (400, 100) on the titlebar, three pointerMoves to (420, 110), (450, 130), (500, 160), pointerUp. During the moves the store position is unchanged and no store listener fires. After pointerUp the stored position equals start + (100, 60), exactly one store notification from the release.
- `no write when the pointer did not move`: pointerDown then pointerUp at the same point: zero position writes.
- `right button does not drag`: `button: 2` pointerDown, moves, up: position unchanged.
- `drag does not start from a traffic light`: pointerDown on the Close button: no gesture flag, no capture.
- `pointercancel ends the drag`: down, move, cancel: position committed, `data-window-drag` cleared, a following move changes nothing.
- `lostpointercapture ends the drag`: same as above with `lostPointerCapture`.
- `unmount mid-drag clears the gesture flag`: down, move, unmount: attribute gone.
- `ignored while maximized`: maximize first, down/move/up: position unchanged, no flag.
- `second pointer is ignored`: down with `pointerId: 1`, move with `pointerId: 2` to a far point, up with `pointerId: 1`: position reflects only pointer 1 moves (unchanged).
- `double-click still maximizes without a position write`: down/up, down/up at the same point, then `dblClick`: `isMaximized` true, zero position writes.
- `snap on release`: drag the pointer to (4, 400) after first passing through the middle, release: after `await waitFor(...)`, `snapWindow` result is in the store (`position` `{ x: 0, y: 28 }`, width `Math.round(1440 / 2)`).
- `no snap if the drag never left the zone`: start the drag at (4, 400) (window parked at the left edge), move to (6, 420), release: no snap, size unchanged.
- `drag during the open animation does not jump`: with `MotionGlobalConfig.skipAnimations` temporarily false for this test, mount, then immediately pointerDown/move by (50, 0)/up: committed x equals initial x + 50 (y equals the stored y within 1 px).

- [ ] **Step 2: Run and see them fail**

Run: `npx vitest run src/__tests__/os/windowDrag.test.tsx`
Expected: FAIL (hook missing; mouse-based drag does not react to pointer events).

- [ ] **Step 3: Implement `useWindowDrag` and wire it into `Window.tsx`**

- [ ] **Step 4: Run the drag tests, then the whole suite**

Run: `npx vitest run src/__tests__/os/windowDrag.test.tsx` then `npx vitest run`.
Expected: PASS; full suite still green (738 + new tests).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useWindowDrag.ts src/components/os/Window.tsx src/__tests__/os/windowDrag.test.tsx
git commit -m "Drag windows on MotionValues with pointer capture and one commit on release"
```

---

### Task 5: Resize with live bounds and one commit

**Files:**
- Create: `frontend/src/hooks/useWindowResize.ts`
- Modify: `frontend/src/components/os/Window.tsx`
- Test: `frontend/src/__tests__/os/windowResize.test.tsx`

**Interfaces:**
- Consumes: `resizeBounds` (existing), `setWindowBounds` (Task 2), `beginWindowGesture` (Task 3).
- Produces: `useWindowResize(win: WindowState, elRef: React.RefObject<HTMLDivElement | null>, minSize: Size): { isResizing: boolean; handleProps: (dir: ResizeDir) => { onPointerDown; onPointerMove; onPointerUp; onPointerCancel; onLostPointerCapture } }`.

Behavior: pointerdown (primary button, not maximized) captures, focuses, calls `beginWindowGesture()`, records start bounds. Each move computes `resizeBounds(...)` and writes `left/top/width/height` straight to `elRef.current.style` (no React state per move; `isResizing` flips only at start and end). End (up, cancel, lost capture, unmount) commits once with `setWindowBounds` if the bounds changed and ends the gesture. React will not overwrite the inline styles mid-resize because the store values it renders from are unchanged until the commit.

In `Window.tsx`, replace `handleResizeStart`/`handleResizeMove`/`handleResizeEnd`/`resizeStart` with the hook; keep the content `pointer-events-none select-none` while `isResizing`.

- [ ] **Step 1: Write failing tests**

Same jsdom setup as Task 4. For a window at a known position and size:
- `se` handle: down at (x, y), moves by (+50, +30) then (+100, +60), up: during moves the store size is unchanged and the element's `style.width` reflects the live width; after up, size is start + (100, 60) and exactly one store notification.
- `nw` handle: move by (+40, +20): after up, position moved by (40, 20) and size shrank by (40, 20), in one notification.
- min size: `w` handle dragged far right stops at the app's min width (from `appRegistry['about-me'].minSize` or `DEFAULT_MIN_SIZE`).
- no movement: down/up: zero writes.
- unmount mid-resize clears `data-window-drag`.

- [ ] **Step 2: Run and see them fail**

Run: `npx vitest run src/__tests__/os/windowResize.test.tsx`
Expected: FAIL (store is written on every move today).

- [ ] **Step 3: Implement `useWindowResize` and wire it in**

- [ ] **Step 4: Run resize tests, drag tests, then the whole suite**

Run: `npx vitest run src/__tests__/os/windowResize.test.tsx src/__tests__/os/windowDrag.test.tsx` then `npx vitest run`.
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useWindowResize.ts src/components/os/Window.tsx src/__tests__/os/windowResize.test.tsx
git commit -m "Resize windows with live bounds and a single commit on release"
```

---

### Task 6: Stop shell-wide re-renders on window commits

**Files:**
- Modify: `frontend/src/components/os/WindowManager.tsx`
- Modify: `frontend/src/components/os/Taskbar.tsx`, `frontend/src/components/os/MenuBar.tsx`, `frontend/src/components/os/AppSwitcher.tsx`
- Test: `frontend/src/__tests__/os/shellRenders.test.tsx`

**Interfaces:**
- Consumes: store actions only.
- Produces: no new exports. Requirement: a commit that changes only `position`, `size` or `zIndex` of a window does not re-render Taskbar, MenuBar or AppSwitcher, and does not re-render any app component. `DesktopWidgets` and `FirstVisitHint` keep reading positions (they compute coverage) and may re-render on commits.

Approach: Taskbar and MenuBar select primitive projections with `useShallow` (for example the list of `appType|isOpen|isMinimized|id` strings plus `activeWindowId`) and derive what they need from those. AppSwitcher reads `useOSStore.getState().windows` when it opens instead of subscribing to `windows`, so it stops rebinding its key listeners on every commit. In WindowManager, render the app through a `React.memo` component that takes only `appType` (wrapping the existing `Suspense` and `ErrorBoundary`), so a Window re-render does not re-render the app.

- [ ] **Step 1: Write failing tests**

Use React `<Profiler id onRender={spy}>` around each component (mock heavy children if needed, as `appRenderSmoke.test.tsx` and `desktopContextMenu.test.tsx` do):
- Taskbar: open `about-me`, render, reset the spy, `updateWindowPosition(id, { x: 5, y: 40 })`: spy not called. Then `minimizeWindow(id)`: spy called.
- MenuBar: same position write: not called; `openWindow('projects')`: called.
- AppSwitcher: same position write: not called.
- WindowManager: register a counting test app by mocking `appRegistry['about-me'].component` (follow the mocking style in `appRenderSmoke.test.tsx`); after `updateWindowPosition`, the app's render count is unchanged.

- [ ] **Step 2: Run and see them fail**

Run: `npx vitest run src/__tests__/os/shellRenders.test.tsx`
Expected: FAIL (all four re-render on a position write today).

- [ ] **Step 3: Implement the subscriptions and the memoized app body**

AppSwitcher must still list windows in most-recently-used order (zIndex descending, minimized last) at the moment it opens.

- [ ] **Step 4: Run these tests, then the whole suite**

Run: `npx vitest run src/__tests__/os/shellRenders.test.tsx` then `npx vitest run`.
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/os/WindowManager.tsx src/components/os/Taskbar.tsx src/components/os/MenuBar.tsx src/components/os/AppSwitcher.tsx src/__tests__/os/shellRenders.test.tsx
git commit -m "Keep dock, menu bar, switcher and apps from re-rendering on window moves"
```

---

### Task 7: Measure, verify in a real browser, open the PR (controller runs this)

**Files:** none committed except fixes found here. Scratch scripts live in `.context/pw/` (gitignored).

- [ ] **Step 1: Static checks**

Run from `frontend/`: `npx vitest run`, `npm run lint`, `npm run build`.
Expected: all tests pass, lint clean (no new warnings in touched files), build succeeds.

- [ ] **Step 2: Production measurement**

`npx next start -p 3517` after the build. Run `.context/pw/shoot.mjs` (drag drift, localStorage writes, frame times at 1x and 4x CPU) and record the numbers next to the baseline: drift p50 71 px / p95 107 px, 123 writes for 122 moves. Add a layout-animation counter (`onLayoutAnimationStart`) locally, uncommitted, to confirm 0 per drag and 1 per snap/maximize.
Pass: drift p95 under 2 px; 0 writes during the move; layout animations 0 per drag.

- [ ] **Step 3: Wallpaper decision**

Repeat the 4x run on the default Signal Grid wallpaper and on a static wallpaper. Only if the drag on Signal Grid shows more long frames than idle on Signal Grid, cap the canvas to 30 fps while `isWindowGestureActive()` and re-measure; otherwise change nothing and record the numbers.

- [ ] **Step 4: Scripted scenario screenshots**

Extend the Playwright script to cover: drag across the Browser app's iframe and release over it; snap left, right, top, each corner (screenshots right after release show the spring starting at the drop point); drag a left-half window sideways (no fill preview); double-click maximize and restore; minimize after a drag (genie from current spot); drag during open animation; reload restores the layout exactly; `reducedMotion: 'reduce'` context: snap and maximize instant. Save screenshots under `.context/shots/drag-*`.

- [ ] **Step 5: Final whole-branch review, then PR**

Dispatch the final reviewer per subagent-driven-development. Then push the branch and open the PR against `main` with the before/after numbers and screenshots, ending the body with the Claude Code attribution line.
