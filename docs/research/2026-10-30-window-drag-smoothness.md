# Window drag smoothness: why dragging a window feels laggy and buggy, and what to change

Date: 2026-10-30. Scope: read-only research, no product code changed.
Trigger: the owner says dragging an app window "feels very buggy, not smooth at all, laggy".

Labels used below:
- (spec) W3C/WHATWG text. (docs) MDN, web.dev, developer.chrome.com, motion.dev, react.dev. (source) code in the owning repo at the version this repo pins. (tracker) bug tracker or merge request.
- (derived) my arithmetic or inference from cited facts. Not a quote. Check it with the measurement recipe in section 7.
- UNVERIFIED means I did not find a primary source. All of those are collected at the end.

Versions (from `frontend/package-lock.json`): framer-motion 12.38.0, motion-dom 12.38.0, motion-utils 12.36.0, zustand 5.0.13, react 19.1.0, next 15.5.18. Motion and zustand source below is read at those tags. `node_modules` is not installed in this worktree, so source was read from GitHub.

## TL;DR: ranked fixes (highest impact first)

1. Measure first (section 7): production build, Chrome Performance panel, 4x CPU slowdown, scripted 5 s drag, plus a 10-line console probe that reports how many frames the window trails the pointer. Cost: 30 min. Risk: none.
2. Stop the layout animation from chasing the pointer. `layout` on the window makes Motion animate every left/top change from a React render. Each mousemove restarts that spring from rest (velocity 0) at the window's current on-screen spot. Under continuous motion the spring never builds speed: the window crawls or stalls, then springs to the cursor when you pause, and teleports when it hits a clamp edge (source + derived, section 1). Even a clean continuous follower with these constants (k=140, c=22, m=0.9) would trail by 157 ms. Fix: `layoutDependency={isMaximized + snap counter}` so only maximize and snap animate. Biggest single win. Risk: low.
3. Take the drag out of React. Titlebar `pointerdown` + `setPointerCapture`, `pointermove` writes `x`/`y` MotionValues (transform only), one store write on `pointerup`. Removes per-move: zustand set, persist `JSON.stringify` + `localStorage.setItem`, re-render of every window and every app subtree plus dock, menu bar, app switcher, widgets, the left/top layout, and forced layouts from Motion's measuring. Risk: medium (touches genie and snap, see 5.4).
4. Fix the event bugs: pointer events with capture, `touch-action: none` on the titlebar, `pointer-events: none` on all iframes while dragging (daedalOS does exactly this), handle `pointercancel`/`lostpointercapture`, primary button only. Fixes freezes and "window stuck to cursor" over the Browser and Resume iframes. Risk: low.
5. Drop the 1.02 drag scale. It slides the grabbed point up to about 10 px away from the cursor at drag start and adds a tween to every titlebar click. Risk: low (loses a "lift" cue; use a shadow-opacity layer instead).
6. Snap and maximize keep their spring: commit the drop position first, then bump the layout key one frame later (`frame.postRender`) so the snap animates from where you let go. Reduced motion stays `INSTANT`. Genie keeps sharing `x`/`y` safely because drag and genie never overlap and drag always returns `x`/`y` to 0. Risk: medium, verify with Screenshots.
7. Narrow store subscriptions (`useShallow` or primitive selectors; memoized window content) so a commit does not re-render the dock, menu bar and every app. Risk: low.
8. GPU only if the trace says so: pause the wallpaper canvas and pointer parallax during a drag, then A/B the 40 px glass blur. Risk: visual change.
9. Re-measure. Accept only if: window trails the pointer by at most 1 frame, zero React commits during a drag except on snap-zone change, zero layout animations started during a drag, no red frames at 4x on the default wallpaper.

## Repo observations (from reading the code, not from research)

- `frontend/src/components/os/Window.tsx`
  - `motion.div` has `layout` and `transition={{ layout: reduced || isResizing ? INSTANT : spring.windowLayout }}`. Position comes from CSS `left`/`top` in `style` (lines 210 to 222, 247, 261).
  - Drag: `onMouseDown` on the titlebar (no button check, so right-click starts a drag), then a `useEffect` binds `document` `mousemove`/`mouseup` (lines 123 to 167). Every move calls `updateWindowPosition` and `setSnapPreview(computeSnap(...))`.
  - The effect deps are `[window.id, window.size, window.isMaximized, updateWindowPosition, snapWindow]`. `updateWindowPosition` spreads `{ ...window, position }`, so the `size` object keeps its identity and the listener is NOT rebound per move. Suspected cause 6 is refuted. Each window keeps a permanent document `mousemove` listener that early-returns, which is cheap.
  - Drag start sets `isDraggingState`, which re-runs the mount effect: `controls.start({ opacity: 1, x: 0, y: 0, scale: 1.02, ... })` with `spring.window` for x/y and a 0.15 s tween for scale (lines 65 to 80). It fires on every titlebar mousedown, including plain clicks and double-click-to-maximize.
  - `onClick={() => focusWindow(window.id)}` on the window fires after a drag ends, a second store write after the one on mousedown.
  - Classes: `glass-medium`, `will-change-transform`, `transition-[border-radius,box-shadow] duration-300`. Active shadow `0 0 0 1px ..., 0 20px 60px rgba(0,0,0,0.3)`, inactive `0 8px 32px`. Dragging an inactive window flips it active, which starts a 300 ms box-shadow transition at drag start.
  - Snap preview overlay has `backdropFilter: blur(2px)` and is re-rendered on every move while near an edge, because `computeSnap` returns a new object each call.
  - Resize already uses pointer events with `setPointerCapture` and `touch-none` (lines 169 to 208, 366 to 378), and disables content hit testing while resizing (line 359). Drag does neither.
- `frontend/src/store/osStore.ts`: `persist` middleware, `partialize` keeps `windows`, `activeWindowId`, `nextZIndex`, `windowCounter`. Every action builds a new `windows` array. `focusWindow` bumps `zIndex` and `nextZIndex` even when the window is already on top.
- Components that select the whole `s.windows` array and so re-render on every position write: `WindowManager.tsx`, `Taskbar.tsx` (whole dock including `Launchpad` and `FirstVisitHint` children), `FirstVisitHint.tsx`, `MenuBar.tsx`, `AppSwitcher.tsx` (also rebinds its `document` keydown/keyup listeners because `windows` is an effect dep), `components/widgets/DesktopWidgets.tsx` (the path in the brief was `components/os/`, it lives in `components/widgets/`). `TerminalApp.tsx` selects a boolean, so it is stable.
- `WindowManager.tsx` builds `<Window window={w}><Suspense><ErrorBoundary><AppComponent/></ErrorBoundary></Suspense></Window>` inline for every visible window on every render. Neither `Window` nor the content is memoized, so one position write re-renders every open window and every app subtree.
- `frontend/src/lib/motion.ts`: `windowLayout` = damping 22, stiffness 140, mass 0.9. `window` = 20 / 120 / 0.8. `genie` = 26 / 210 / 0.9.
- `frontend/src/app/globals.css`: `.glass-medium` = `blur(40px) saturate(180%)`; `--glass-bg-medium` is `rgba(255,255,255,0.6)` light and `rgba(0,0,0,0.4)` dark. `.app-sidebar` inside windows has its own `blur(8px)` plus `will-change: backdrop-filter`. Dock uses `blur(55px)`.
- `frontend/src/components/os/AnimatedBackground.tsx`: default Signal Grid canvas redraws every frame (dot grid plus full-screen radial gradients, see the cursor note section 4). The canvas also moves with pointer parallax (`useParallaxDepth`, `ParallaxProvider` listens to every `pointermove`), so during a drag the wallpaper drifts under the window too.
- Iframes: `BrowserApp.tsx` line 222 (same-origin site pages), `ResumeApp.tsx` line 372 (PDF).
- Other global move listeners still active during a drag: `ParallaxProvider` (pointermove), `useMagneticField` (pointermove, `getBoundingClientRect` on magnetic targets), `NotificationCenter` idle timer reset (mousemove).

## 1. Root cause: the `layout` prop animates every drag step, and restarts from rest each time

What the docs say:
- "Any layout change that happens as a result of a React render will now be automatically animated." https://motion.dev/docs/react-layout-animations (docs). Moving `left`/`top` through React state is exactly such a change, so every mousemove is a layout animation.
- Motion performs layout animations "using the CSS transform property" (same page). So the window's DOM box jumps to the new left/top instantly, and Motion counter-translates it back to where it was and springs it forward.

What the source does (motion-dom 12.38.0, `packages/motion-dom/src/projection/node/create-projection-node.ts`: https://github.com/motiondivision/motion/blob/v12.38.0/packages/motion-dom/src/projection/node/create-projection-node.ts) (source):
- Snapshot before the React commit: `MeasureLayout.getSnapshotBeforeUpdate` calls `projection.willUpdate()` whenever `layoutDependency` is undefined (https://github.com/motiondivision/motion/blob/v12.38.0/packages/framer-motion/src/motion/features/layout/MeasureLayout.tsx, lines 68 to 100). `willUpdate` -> `updateSnapshot` -> `measure()` -> `getBoundingClientRect` (`measurePageBox`, lines 992 to 1036). The bounding rect includes the in-flight projection transform, and `removeTransform` only strips the element's own `x`/`y`/`scale` values, so the snapshot is the window's current on-screen position, not its last left/top.
- After the commit, `didUpdate` queues `update()` in a microtask (lines 804 to 809). `update()` resets transforms (write), re-measures layout (read, a forced synchronous layout), notifies listeners, then flushes Motion's update/preRender/render steps synchronously (lines 717 to 801).
- The `didUpdate` listener restarts the animation whenever `hasLayoutChanged && (hasTargetChanged || !this.currentAnimation)` (lines 495 to 596). A new pointer position is always a new target, so every move restarts.
- `startAnimation` stops the running animation and starts a new 0 to 1000 progress animation with `velocity: 0` (lines 1683 to 1734). `setAnimationOrigin` then sets progress 0, which renders the window at the snapshot (lines 1583 to 1680).
- If a render produces no layout change (pointer pushes past the clamp so left/top stay the same), the else branch calls `finishAnimation`, which jumps straight to the target (lines 585 to 588). That is a visible teleport at screen edges, which is also where the snap zones are.
- `velocity: 0` on restart is the key fact. Momentum is thrown away on every mousemove.

When the restarted spring gets to run:
- Chrome dispatches `mousemove` once per frame, right before `requestAnimationFrame` callbacks: https://developer.chrome.com/blog/aligning-input-events (docs). The handler calls `set` on the store.
- zustand subscribers use `useSyncExternalStore`, whose store updates are scheduled at `SyncLane` (`forceStoreRerender`, https://github.com/facebook/react/blob/v19.1.0/packages/react-reconciler/src/ReactFiberHooks.js line 1905), and React 19 flushes sync work in a microtask (`ensureRootIsScheduled` -> `scheduleImmediateRootScheduleTask` -> `scheduleMicrotask`, https://github.com/facebook/react/blob/v19.1.0/packages/react-reconciler/src/ReactFiberRootScheduler.js lines 103 to 139 and 582 to 600) (source). So render, commit, snapshot and Motion's `update()` all run in microtasks between the mousemove and the rAF callbacks of the same frame.
- Motion's frame batch takes its timestamp from `performance.now()` when the rAF fires (`batcher.ts` `processBatch`, https://github.com/motiondivision/motion/blob/v12.38.0/packages/motion-dom/src/frameloop/batcher.ts), and `JSAnimation.updateTime` uses `Math.round(timestamp - startTime)` (https://github.com/motiondivision/motion/blob/v12.38.0/packages/motion-dom/src/animation/JSAnimation.ts lines 176 to 189) (source).
- Inference (derived): the new spring is started a few milliseconds before the rAF that ticks it, then the next frame's mousemove restarts it again from rest. Each restart therefore runs for only the gap between Motion's microtask and the rAF, not a full frame.

The numbers (derived; spring formulas from `packages/motion-dom/src/animation/generators/spring.ts` at v12.38.0, as in the cursor note):
- `spring.windowLayout`: zeta = 22 / (2 * sqrt(140 * 0.9)) = 0.98, omega0 = sqrt(140 / 0.9) = 12.47 rad/s. Settles to 2% in about 0.45 s.
- If it were a continuous second-order follower (the cursor note's model), steady-state lag = 2 * zeta / omega0 = 157 ms, about 9 frames at 60 Hz, 157 px behind at 1,000 px/s. That alone is a rubber band.
- But it restarts from rest each frame. Starting at rest, the fraction of the remaining gap covered after time t is 1 - e^(-zeta*omega0*t) * (cos(wd*t) + (zeta*omega0/wd) * sin(wd*t)), with wd = omega0 * sqrt(1 - zeta^2) = 2.48 rad/s:
  - t = 16.7 ms (a whole frame, best case): 1.9% of the gap per frame. Steady-state gap = v * T / f = 0.88 s of pointer travel, about 880 px at 1,000 px/s.
  - t = 4 ms: 0.12% per frame. t = 2 ms: 0.03% per frame. The window effectively stops while the pointer keeps moving.
- Predicted feel (derived): while you keep moving, the window lags far behind or barely moves; when you pause, mousemove stops, the last spring runs to completion and the window floats to the cursor over about 0.45 s; at a clamped edge it teleports. That matches "laggy" and "buggy". Exact per-restart time is UNVERIFIED; the probe in section 7 measures the real trailing.

What Motion's own drag does instead: on drag start it sets `projection.isAnimationBlocked = true` so layout animations cannot fire while dragging, and moves the element with `x`/`y` MotionValues (`VisualElementDragControls.ts` lines 138 to 140 and 200 to 223, https://github.com/motiondivision/motion/blob/v12.38.0/packages/framer-motion/src/gestures/drag/VisualElementDragControls.ts) (source). That flag is internal; the public equivalent is `layoutDependency`.

`layoutDependency` (docs): "By default, layout changes are detected every render. To reduce measurements and thus improve performance, you can pass a layoutDependency prop. Measurements will only occur when this value changes." https://motion.dev/docs/react-motion-component. Source confirms: `willUpdate` is skipped when `layoutDependency` is defined and unchanged and no `drag` prop is set (`MeasureLayout.tsx` lines 92 to 101).

Takeaway: the spring on `layout` is the main cause of the lag. It must not see drag moves at all. Gate it with `layoutDependency` keyed on maximize and snap only.

## 2. React and store work on every mousemove

- zustand `setState` notifies every listener when the next state is not `Object.is` equal (https://github.com/pmndrs/zustand/blob/v5.0.13/src/vanilla.ts lines 66 to 80) (source). `updateWindowPosition` returns a new `windows` array, so every component selecting `s.windows` gets a new value and re-renders. Count in this repo: WindowManager, every visible Window, every app subtree inside them, Taskbar (dock, Launchpad, FirstVisitHint), MenuBar, AppSwitcher, DesktopWidgets. That is 7 subscribers plus N windows and N apps per mousemove (repo).
- Why apps re-render: React skips a child only when its element or props are unchanged; `memo` compares props with `Object.is` (https://react.dev/reference/react/memo) (docs). `WindowManager` creates fresh `children` elements every render and nothing is memoized, so all app components re-render (derived from code + docs).
- persist writes synchronously on every set. `persistImpl` wraps `set` so each call runs `setItem()`, which runs `partialize({ ...get() })` and `storage.setItem(name, { state, version })`; the default storage is `createJSONStorage(() => window.localStorage)`, whose `setItem` calls `JSON.stringify` then `localStorage.setItem` (https://github.com/pmndrs/zustand/blob/v5.0.13/src/middleware/persist.ts lines 31 to 57, 186 to 240) (source). web.dev: localStorage "should be used with caution because it is synchronous and will block the main thread" (https://web.dev/articles/storage-for-the-web) (docs). The payload here is small (a few windows), so per-write cost is probably well under 1 ms, but it runs on every mousemove and every resize step. Exact cost UNVERIFIED, measure.
- `setSnapPreview(snap)` per move: React bails out when the value is `Object.is` equal, so `null -> null` is free, but near an edge `computeSnap` returns a new object each call and forces a Window re-render each move (derived). Only zone changes need a render.
- Motion measuring per render: every Window has `layout`, so every Window re-render also runs a snapshot `getBoundingClientRect` in `getSnapshotBeforeUpdate`, then a transform reset and re-measure in `update()` (section 1). web.dev: "Avoid forced synchronous layouts and layout thrashing; read style values then make style changes", and layout is "normally scoped to the whole document" (https://web.dev/articles/avoid-large-complex-layouts-and-layout-thrashing) (docs). With N windows open, that is N snapshots per move (derived).
- Dev vs prod: `next dev` runs React development builds, which are slower; judge smoothness on `next build && next start` only (derived; see recipe).

Takeaway: during a drag, nothing should go through React or the store. Commit once on release.

## 3. Event plumbing: mouse events, iframes, capture, touch

- Iframes: events over an iframe go to the iframe's document. `document.elementFromPoint` returns the iframe element for points inside it (https://developer.mozilla.org/en-US/docs/Web/API/Document/elementFromPoint) (docs); parent-document `mousemove` loss over iframes is described in trackers only (https://bugs.webkit.org/show_bug.cgi?id=27449, https://bugzilla.mozilla.org/show_bug.cgi?id=1084121) (tracker). Consequence here (derived): drag a Browser or Resume window downward, the pointer runs ahead of the lagging titlebar onto the window's own iframe (or another window's), the drag freezes, and if the button is released over the iframe the parent never sees `mouseup`, so `isDragging` stays true and the window sticks to the cursor on the next move back over the desktop.
- Pointer capture: "Pointer capture allows the events for a particular pointer ... to be retargeted to a particular element other than the normal hit test result of the pointer's location" (https://www.w3.org/TR/pointerevents3/ section 9.1) (spec). MDN: subsequent events "will be targeted at the capture element until capture is released (via releasePointerCapture() or the pointerup event is fired)" (https://developer.mozilla.org/en-US/docs/Web/API/Element/setPointerCapture) (docs). Whether capture keeps routing events to the parent while the pointer is over a child iframe in every browser: UNVERIFIED. Belt and braces: also disable iframe hit testing during a drag.
- Prior art for the iframe shield: daedalOS sets `pointer-events: none` on every `iframe` on drag start and restores it on drag stop (`enableIframeCapture` / `disableIframeCapture` in https://github.com/DustinBrett/daedalOS/blob/main/components/system/Window/RndWindow/useRnd.ts) (source). `pointer-events: none` removes the element from hit testing (https://developer.mozilla.org/en-US/docs/Web/CSS/pointer-events) (docs).
- Touch and pen: mouse events do not give a touch drag. With Pointer Events the browser fires `pointercancel` when it takes over a touch gesture; `touch-action: none` disables browser panning and zooming on that element (https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action) (docs). The spec notes `touch-action` does not cascade into iframes (https://www.w3.org/TR/pointerevents3/) (spec). Phones get `PhoneShell`, but iPads in desktop mode and touch laptops get the desktop (derived from `DesktopHome.tsx`).
- Missing guards (derived from code): no `e.button === 0` check (right-click drags, and a native context menu can swallow the `mouseup`), no `pointercancel` or `lostpointercapture` path, no `blur` handling.
- Motion's `drag` gesture does not use pointer capture either: `PanSession` listens to `pointermove`/`pointerup`/`pointercancel` on `window` and throttles moves to one per frame with `frame.update` (https://github.com/motiondivision/motion/blob/v12.38.0/packages/framer-motion/src/gestures/pan/PanSession.ts lines 151 to 166 and 299 to 307) (source). So switching to `drag` alone would not fix the iframe problem.

Takeaway: use the same pointer-capture pattern the resize handles already use, plus an iframe shield.

## 4. Rendering cost: left/top, blur, scale, shadow

- Left/top vs transform: "Stick to transform and opacity changes for your animations ... Today there are only two properties for which that is true" (compositor-only), and promote moving elements with `will-change` (https://web.dev/articles/stick-to-compositor-only-properties-and-manage-layer-count) (docs). Motion: `transform` and `opacity` "are cheapest to render in all browsers" (https://motion.dev/docs/performance) (docs). `left`/`top` changes need style and layout each frame. Whether Chromium also repaints a `will-change: transform` layer whose position changes through `left`/`top` (versus only re-compositing it): UNVERIFIED. Expect layout per move to be smaller than the React cost in section 2, but it is avoidable.
- MotionValues: "Changes to the motion value will update the DOM without triggering a React re-render", renders are batched to the next animation frame (https://motion.dev/docs/react-motion-value) (docs). Motion writes `style.transform` in its render step (cursor note section 3, source).
- Backdrop blur: `backdrop-filter` filters "the pixels painted behind an element, up to the nearest ancestor that is a backdrop root" (https://developer.mozilla.org/en-US/docs/Web/CSS/backdrop-filter) (docs). The Chromium implementer calls it "very performance-demanding" (https://github.com/mfreed7/backdrop-filter-feature) and WebKit says it forces extra rendering passes (https://webkit.org/blog/3632/introducing-backdrop-filter/) (docs, from the cursor note). A moving window samples a new backdrop region every frame no matter how it is moved, and here the backdrop also changes every frame anyway (animated canvas plus parallax drift), so menu bar, dock and every glass window re-blur at display rate even without a drag (derived). Cost scaling with radius and area in Chromium: UNVERIFIED. Treat as a second-order cause, prove it with the static-wallpaper A/B.
- Backdrop roots: elements with `opacity < 1`, `filter`, `mask`, `clip-path`, `backdrop-filter`, `mix-blend-mode`, or `will-change` on any of those are backdrop roots (MDN page above) (docs). The window itself is one (it has `backdrop-filter`), so `.app-sidebar`'s 8 px blur inside it only samples window content. During the open fade the window's `opacity < 1` also makes it a root. No change needed, noted so nobody adds `will-change: opacity` on an ancestor and silently kills the glass.
- Scale 1.02 on drag (derived): scale is applied around the element center, so a point at distance d from the center moves by 0.02 * d. Grabbing a 900 x 600 window on the titlebar 400 px left of center moves the grabbed point about 8 px left and 6 px up, about 10 px total, over 0.15 s. The window slides under the cursor at drag start, then the release tween runs for 0.4 s. Raster quality of a `will-change: transform` layer scaled to 1.02 (blurry text during drag): UNVERIFIED. macOS does not scale windows on drag (no primary source fetched; drop the claim if challenged).
- Box shadow: Motion's performance guide recommends animating `filter: drop-shadow(...)` instead of `boxShadow` (https://motion.dev/docs/performance) (docs). Here the shadow is not animated per move, only transitioned for 300 ms when a background window becomes active at drag start (CSS `transition-[border-radius,box-shadow]`). A 60 px blur shadow repainting for 300 ms at the start of every drag of a background window (derived). Low impact; cheaper to put the big shadow on a pseudo-element and transition its `opacity`.
- `will-change-transform` on every window: web.dev warns layers "require memory and management" (page above). With a handful of windows this is fine and the drag benefits from it (derived).

Takeaway: transform for the move, no scale pulse, and pause the wallpaper while dragging if the trace shows raster/GPU time.

## 5. Fix design

### 5.1 Options compared

A. Motion `drag` with `useDragControls`, `dragListener={false}`, `dragMomentum={false}`, `dragElastic={0}`, pixel `dragConstraints`.
- Docs: `dragListener={false}` stops the element starting a drag on its own `pointerdown`, `dragControls.start(e)` starts it from a handle; default 3 px threshold (https://motion.dev/docs/react-use-drag-controls); `dragMomentum={false}` disables the release inertia; pixel `dragConstraints` and `dragElastic` 0 to 1 (https://motion.dev/docs/react-drag) (docs).
- Pros: one-frame throttling, layout animations blocked during drag for free (`isAnimationBlocked`), constraints built in.
- Cons (source): no pointer capture (window listeners, section 3); `drag` forces `willUpdate` (a measure) on every render of the component (`MeasureLayout.tsx` line 93), which defeats `layoutDependency`; release still runs an inertia animation per axis, with velocity 0 and overdamped bounce springs when `dragElastic` is 0 (`VisualElementDragControls.ts` lines 443 to 492). You still have to commit `x`/`y` into left/top yourself and suppress the layout animation that commit causes. It also drives `x`/`y`, the same values genie uses.

B. Hand-rolled pointer handlers + `x`/`y` MotionValues + `layoutDependency` (recommended, 5.2).
- Pros: matches the existing resize code (pointer capture, `touch-none`), zero React work per move, public APIs only, layout spring kept for maximize/snap.
- Cons: you own the commit sequence and the genie handoff (5.4).

C. Write `el.style.left`/`top` directly (no React) + `layoutDependency`.
- Pros: smallest diff, no `x`/`y` sharing with genie, snap can animate from the DOM position in one step.
- Cons: still layout per frame; not compositor-only. Good fallback if B's commit handoff misbehaves.

D. react-rnd / react-draggable (what daedalOS uses).
- react-draggable listens to `mousemove`/`touchmove` on `ownerDocument` (https://github.com/react-grid-layout/react-draggable/blob/master/lib/DraggableCore.tsx lines 17 to 28 and 378), calls `setState` on every drag step (https://github.com/react-grid-layout/react-draggable/blob/master/lib/Draggable.tsx line 337) and positions with a CSS `translate` transform (same file, lines 402 to 410) (source).
- daedalOS commits position to its session state only in `onDragStop` (useRnd.ts above) (source).
- Lessons worth copying: transform during drag, commit on stop, iframe shield. Not worth adopting: a second animation system next to Motion, React state per step, mouse/touch events instead of pointer events.
- dnd-kit: not surveyed (aimed at sortable/drop targets, not free window movement). UNVERIFIED.

### 5.2 Recommendation: B

Reasoning: it removes every per-move cost found above (layout spring, store, persist, re-renders, forced layouts, left/top layout), fixes the iframe and stuck-drag bugs with a pattern already in the file, and keeps the nice springs exactly where they are wanted. It relies only on documented APIs (`useMotionValue`, `style` MotionValues, `layoutDependency`, `setPointerCapture`).

Sketch (not product code):

```tsx
const x = useMotionValue(0);
const y = useMotionValue(0);
const [layoutKey, setLayoutKey] = React.useState(0);           // bumped only by snap
const drag = React.useRef<null | { id: number; sx: number; sy: number; bx: number; by: number; maxX: number; maxY: number; vw: number; vh: number }>(null);

const onTitlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
  if (e.button !== 0 || window.isMaximized || (e.target as Element).closest('button')) return;
  e.currentTarget.setPointerCapture(e.pointerId);
  x.stop(); y.stop();                                           // end any open/restore spring on x/y
  focusWindow(window.id);                                       // skip if already active
  const vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight;
  drag.current = { id: e.pointerId, sx: e.clientX, sy: e.clientY, bx: window.position.x, by: window.position.y,
                   maxX: vw - window.size.width, maxY: vh - window.size.height - DOCK_H, vw, vh };
  document.documentElement.dataset.windowDrag = '';             // CSS: [data-window-drag] iframe { pointer-events: none }
};

const onTitlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
  const d = drag.current; if (!d || e.pointerId !== d.id) return;
  const nx = Math.min(Math.max(d.bx + e.clientX - d.sx, 0), d.maxX);
  const ny = Math.min(Math.max(d.by + e.clientY - d.sy, MENUBAR_H), d.maxY);
  x.set(nx - d.bx); y.set(ny - d.by);                           // transform only, no React
  const snap = computeSnap(e.clientX, e.clientY, d.vw, d.vh);
  if (!sameBounds(snap, snapRef.current)) { snapRef.current = snap; setSnapPreview(snap); } // render on zone change only
};

const endDrag = () => {                                         // pointerup, pointercancel, lostpointercapture
  const d = drag.current; if (!d) return; drag.current = null;
  delete document.documentElement.dataset.windowDrag;
  updateWindowPosition(window.id, { x: d.bx + x.get(), y: d.by + y.get() }); // one store + persist write
  x.jump(0); y.jump(0);
  const snap = snapRef.current; snapRef.current = null; setSnapPreview(null);
  if (snap) frame.postRender(() => { setLayoutKey(k => k + 1); snapWindow(window.id, snap); });
};

<motion.div layout layoutDependency={`${window.isMaximized}:${layoutKey}`}
  style={{ x, y, left: ..., top: ..., width: ..., height: ... }} animate={controls} ... />
// titlebar: className="touch-none ..." onPointerDown/Move/Up/Cancel + onLostPointerCapture={endDrag}
```

Also:
- Remove `isDraggingState` from the mount/open effect so it never re-animates `x`/`y` (or `scale`) at drag start. The effect then only runs on mount and `reduced` change.
- Drop the `isResizing ? INSTANT` switch: with `layoutDependency`, resize steps do not measure or animate at all. Moving resize off the store per step (same pattern, write `width`/`height` to the element, commit on release) is a follow-up; it has the same persist and re-render cost.
- `pointerup` is a discrete event and is not rAF-aligned (https://developer.chrome.com/blog/aligning-input-events) (docs), so the commit runs promptly.
- Optional `focusWindow` guard: return early when the window is already active and on top, to skip one store write per drag.

### 5.3 Snap commit and maximize still animate

- Maximize and restore: `isMaximized` is in `layoutDependency`, so the toggle measures and animates with `spring.windowLayout` as today (`MeasureLayout.tsx` lines 92 to 98) (source).
- Snap: the drop position must be on screen before the snap animation measures its starting point. Why (source + derived): the snapshot strips the element's own `x`/`y` values (`removeTransform`, `create-projection-node.ts` lines 1106 to 1136), so if left/top still hold the pre-drag position while `x`/`y` hold the offset, the snap would spring from where the drag started. Sequence:
  1. `pointerup`: write the final position to the store and `jump` `x`/`y` to 0. React commits in a microtask (section 1); Motion renders `x = 0` in its next frame batch, before that frame paints. No double-offset frame should be visible (derived from rAF running before paint; verify with Screenshots).
  2. `frame.postRender` in that same batch runs after Motion's render step (step order `setup, read, resolveKeyframes, preUpdate, update, preRender, render, postRender`, https://github.com/motiondivision/motion/blob/v12.38.0/packages/motion-dom/src/frameloop/batcher.ts) (source). There, bump `layoutKey` and call `snapWindow`. The snapshot now measures the drop position and the spring runs to the snap bounds.
- If that two-step proves fiddly, option C (direct left/top writes) makes snap a single step, because the DOM already sits at the drop position when the snapshot is taken.

### 5.4 Genie minimize and open/close share `x`/`y`

- MotionValues passed in `style` are added to the element's value map (`updateMotionValuesFromProps`, https://github.com/motiondivision/motion/blob/v12.38.0/packages/motion-dom/src/render/utils/motion-values.ts) (source). So `controls.start({ x, y })` in the genie and open animations drives the same values the drag writes.
- `MotionValue.set` does not stop a running animation; `jump` and `stop` do (https://github.com/motiondivision/motion/blob/v12.38.0/packages/motion-dom/src/value/index.ts lines 305 to 330) (source). Hence `x.stop(); y.stop()` on drag start (a drag that starts during the 30 px open rise would otherwise fight the spring) and `jump(0)` on commit.
- Invariant (derived): `x = y = 0` whenever no drag is in progress. Genie measures `getBoundingClientRect` and animates `x`/`y` to the dock delta from 0, so it stays correct. Genie can never start mid-drag: the minimize button is a `button`, which the titlebar handler ignores. Restore remounts the window (minimized windows are filtered out of `visibleWindows`), so it starts from fresh values.
- Do not call `controls.stop()` on drag start: it would also stop an in-flight `opacity` fade and can leave a window semi-transparent (derived).

### 5.5 Reduced motion

- Drag is 1:1 with no easing, so there is nothing to reduce (derived). Keep `transition.layout = INSTANT` under `useReducedMotion()` for maximize and snap, as today. Motion also forces `type: false` on layout animations when its own `shouldReduceMotion` is set (`create-projection-node.ts` lines 562 to 568) (source).
- Pausing parallax during a drag (item 8 in the TL;DR) is already a no-op under reduced motion because `ParallaxProvider` never attaches its listener then (repo).

### 5.6 Subscriptions (after the drag fix)

- `useShallow` keeps the previous selector result when the new one is shallow-equal (https://github.com/pmndrs/zustand/blob/v5.0.13/src/react/shallow.ts) (source). Use it with primitive projections (for example `s.windows.map(w => w.id + '|' + w.appType + '|' + w.isOpen + '|' + w.isMinimized)` for the dock, menu bar and switcher) so a position or z-index change does not re-render them. DesktopWidgets and FirstVisitHint legitimately need positions, but now only on commit.
- Memoize window content per window (for example a `memo` inner component keyed by `appType`) so focus and z-index writes do not re-render apps.

### 5.7 GPU budget during a drag (only if the trace shows it)

- Pause the wallpaper rAF loop and the parallax listener while `data-window-drag` is set; the canvas keeps its last frame. That stops the menu bar, dock and other windows from re-blurring every frame. The dragged window still re-samples because it moves (derived).
- Then A/B `--glass-blur-medium` at 40 px vs 20 to 24 px, as in the cursor note. Changing the blur only during a drag would visibly change the glass at grab time, so prefer a permanent smaller radius if the A/B justifies it.

## 6. What does not need changing

- Listener rebinding per move: refuted (repo observation above).
- `pointerrawupdate` and `getPredictedEvents`: not useful for a DOM-drawn window, same reasoning as the cursor note section 1.
- Manual rAF throttling of `x.set`: Chrome already delivers one `pointermove` per frame and Motion batches renders to the next frame (sources above). Several `set` calls per frame still produce one style write (derived).

## 7. Measurement: baseline and after

1. `next build && next start` (not `next dev`). Fresh Chrome profile, no extensions, window 1440 x 900, default Signal Grid wallpaper. Open About, Projects and Browser (Browser showing a site page in its iframe) so there is an iframe and three apps mounted.
2. DevTools > Rendering: enable Frame Rendering Stats, Paint flashing, Layer borders. React DevTools > Profiler settings > "Highlight updates when components render".
3. Performance panel: Screenshots on, "Enable advanced paint instrumentation" on, CPU 4x slowdown (https://developer.chrome.com/docs/devtools/performance) (docs). Repeat once with the calibrated mid-tier preset (https://developer.chrome.com/docs/devtools/settings/throttling) (docs).
4. Paste this probe before recording (not committed):
   ```js
   window.__d = { px: [], wx: [] };
   let px = 0; addEventListener('pointermove', e => { px = e.clientX; }, { passive: true, capture: true });
   (function f() { const el = document.querySelector('[data-window]');
     if (el) { __d.px.push(px); __d.wx.push(el.getBoundingClientRect().left); }
     requestAnimationFrame(f); })();
   // For each candidate delay k, the pointer-to-window offset should be constant (the grab offset).
   // The k with the smallest spread is how many frames the window trails the pointer.
   __d.lag = () => { const { px, wx } = __d; let best = 0, bestSd = Infinity;
     for (let k = 0; k <= 60; k++) { const d = [];
       for (let i = k; i < wx.length; i++) d.push(px[i - k] - wx[i]);
       if (d.length < 30) break;
       const m = d.reduce((a, b) => a + b, 0) / d.length;
       const sd = Math.sqrt(d.reduce((a, b) => a + (b - m) ** 2, 0) / d.length);
       if (sd < bestSd) { bestSd = sd; best = k; } }
     return { framesBehind: best, residualPx: bestSd }; };
   ```
   Use a window that is not maximized, reset with `__d.px = []; __d.wx = []` right after grabbing the titlebar, sweep horizontally, then call `__d.lag()` before releasing. The probe reads layout in rAF, so it adds a forced layout and sees the previous frame's paint; a 1:1 drag reports `framesBehind` 0 or 1 with a small `residualPx` (derived). With today's code expect a large `residualPx`, because a restarting spring is not a fixed delay.
5. Record 5 s: slow drag, fast horizontal sweeps (about 1,500 px/s), a pass over the Browser window's iframe, a drag into the left edge snap zone and release, a double-click maximize and restore, a minimize to dock and restore.
6. Read, in order: (a) Frames track, red and yellow frames during drag; (b) Main track, per move: Function Call -> React commit, "Recalculate Style", "Layout", forced reflow warnings; (c) Paint flashing on the dragged window; (d) React highlight flashes on dock/menu bar during drag; (e) `__d.lag()`; (f) Screenshots around the snap release for a jump back to the drag start.
7. Temporary local instrumentation (do not commit): `onLayoutAnimationStart={() => console.count('layout-anim')}` on the window `motion.div` (documented prop, https://motion.dev/docs/react-motion-component) and a `console.count('persist')` in a custom `createJSONStorage` wrapper.
8. A/B toggles that isolate GPU cost: static image wallpaper vs Signal Grid; `.glass-medium` blur 40 px vs 20 px vs none.
9. Save each trace as `before-<change>.json` / `after-<change>.json`, one change per trace.

Pass criteria (derived targets):
- `__d.lag().framesBehind` at most 1 at 4x slowdown, for slow and fast sweeps.
- `layout-anim` count 0 during a drag; exactly 1 per snap release and 1 per maximize toggle.
- `persist` count 1 per drag (2 if focus changed), not one per move.
- React highlights: no component flashes during a drag except the dragged Window once per snap-zone change.
- No Layout task per move attributed to the window; no forced reflow warnings during a drag.
- Frames track: zero red frames during the 5 s drag at 4x on a static wallpaper; on Signal Grid, no worse than idle with the same wallpaper (the wallpaper is a separate budget, cursor note section 4).
- Drag over the Browser iframe never freezes, and releasing over it ends the drag.
- Snap release: the spring starts from the drop position (no frame at the pre-drag position in Screenshots). Maximize still springs; under OS Reduce Motion both are instant.
- Genie minimize after a drag flies from the window's current position to its dock icon.

## Open / UNVERIFIED

- The exact time each restarted layout spring runs before the next mousemove restarts it. Source shows the restart, `velocity: 0`, and same-frame scheduling; the "a few milliseconds" figure is inferred from Chrome's rAF-aligned input plus React's and Motion's microtasks, not traced. The probe in section 7 settles it.
- Whether Chromium repaints, rather than only re-composites, a `will-change: transform` element moved by `left`/`top`.
- Whether pointer capture keeps routing events to a parent-document element while the pointer is over a child iframe, per browser. Hence the iframe shield.
- Per-call cost of `JSON.stringify` + `localStorage.setItem` for this payload, and whether Chromium's localStorage write blocks on disk. Only web.dev's general "synchronous" statement was found.
- Backdrop-filter cost scaling with blur radius and area, and per-frame backdrop invalidation under an animated canvas, in Chromium and Safari.
- Text raster quality of a `will-change: transform` layer at scale 1.02.
- That macOS does not scale windows while dragging (no Apple source fetched).
- dnd-kit internals: not read.
- daedalOS, react-draggable and react-rnd were read on their default branches (`main`/`master`), not pinned tags.
- Motion docs pages (`/docs/frame`) render mostly client-side; frame step order is cited from source instead.
