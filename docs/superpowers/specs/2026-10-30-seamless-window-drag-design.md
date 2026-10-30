# Seamless window drag (and resize)

Date: 2026-10-30. Status: design, approved direction by the owner in chat.
Research behind every claim here: `docs/research/2026-10-30-window-drag-smoothness.md` (cited below as "research §N").

## Intent

Dragging a window on the desktop feels laggy and buggy. The owner wants it to feel seamless: the window stays glued to the pointer the way a macOS window does, with no rubber band, no float-into-place after you stop, no jumps at screen edges, and no freezes over other windows. It must never break the things that work today (snap, maximize, genie minimize, open/close animation, resize, saved layout, reduced motion).

## What is wrong today (measured and sourced)

Measured on 2026-10-30 in headless Chromium, `next dev`, 1440x900, About Me window, 2 s scripted drag:

- The window trails the pointer by 71 px median and 107 px p95 (should be about 0).
- 123 writes of `portfolio-os-windows` to localStorage for 122 mousemoves.

Causes, ranked (research TL;DR):

1. `layout` on the window `motion.div` turns every left/top change into a layout animation, and Motion restarts it from rest (velocity 0) on every move. The window crawls while you move, floats to the pointer when you pause, and teleports when it hits a clamp edge (research §1).
2. Every mousemove calls `updateWindowPosition`: a zustand set, a synchronous persist `JSON.stringify` + `localStorage.setItem`, and a re-render of WindowManager, every Window, every app subtree, Taskbar, MenuBar, AppSwitcher, DesktopWidgets, FirstVisitHint, plus a Motion layout measure per window (research §2).
3. Drag uses `document` mouse events with no pointer capture, no button check, no `pointercancel`. Over the Browser and Resume iframes the drag freezes, and releasing over an iframe leaves the window stuck to the cursor (research §3).
4. The 1.02 scale on drag start slides the grabbed point up to about 10 px away from the cursor, and re-runs the open animation's x/y spring on every titlebar mousedown (research §4).
5. Position via `left`/`top` costs layout every frame instead of a compositor-only transform (research §4).
6. Snap preview re-renders the window on every move near an edge (research §2).
7. Resize has the same store-per-step cost as cause 2 (research §5.2).
8. The wallpaper drifts under the window during a drag (pointer parallax), and the backdrop under glass changes every frame (research §4, §5.7).

## Goals

- During a drag the window moves 1:1 with the pointer: at most 1 frame behind at 4x CPU throttle, on a production build.
- Zero React renders, zero store writes, zero localStorage writes, zero layout animations while a drag is in progress. Exception: the dragged Window renders once each time the snap zone changes.
- Store writes happen only on discrete events, never per move: at most one on pointerdown (focus, only if the window was not already on top, like macOS raising on press), one on release (position, skipped if the window did not move), and one for a snap. So 1 to 3 per gesture, 0 during the move. (Builder-check answer, my call.)
- Drag never freezes or sticks over iframes or other windows; right-click never drags; touch and pen drag work on the desktop shell.
- Snap and maximize keep their spring, and the snap spring starts from where you let go, not from where the drag started.
- Resize gets the same treatment: live while resizing, one commit on release.
- Nothing listed under "Must keep working" regresses.

## Non-goals

- No change to the mobile phone shell (`components/mobile/*`).
- No new drag library (no react-rnd, react-draggable, dnd-kit). Motion's `drag` prop is also rejected (research §5.1: no pointer capture, defeats `layoutDependency`, adds release inertia).
- No visual redesign of window chrome. That is the next project (Fun palette, direction A).
- No inertia or throw physics on release. macOS windows stop where you drop them.

## Anti-goals (would count as failure even if the numbers pass)

- The window visibly jumps at drag start, at release, or at snap (one frame at the pre-drag position is a failure).
- A window ends up semi-transparent, offset, or the wrong size after any sequence of open, drag, snap, maximize, minimize, restore, close.
- The saved layout restored on reload differs from what was on screen.
- Genie minimize flies from the wrong place after a drag.

## Must keep working

Open animation (fade + rise), close animation, genie minimize to the dock icon and restore, double-click titlebar to maximize and restore, traffic-light buttons (no drag starts from them), edge and corner snap with preview, all 8 resize handles with per-app min sizes, clamping under the menu bar and above the dock, focus and z-order on click, saved layout across reloads, reduced-motion behavior (instant layout transitions), the Help app's recruiter tour if it moves or opens windows, and every existing test.

## Decided approach (research §5.2, "option B")

1. **Pointer events with capture on the titlebar.** `pointerdown` (primary button only, ignore targets inside `button`, ignore when maximized), `setPointerCapture`, `touch-action: none` on the titlebar. End on `pointerup`, `pointercancel`, and `lostpointercapture`. This is the pattern the resize handles already use in `Window.tsx`.
2. **Move with MotionValues, not state.** `x` and `y` MotionValues on the window `motion.div` style hold the offset from the stored position during a drag. `pointermove` computes the clamped position and calls `x.set` / `y.set`. Nothing goes through React or the store.
3. **Gate the layout animation with `layoutDependency`.** Key it on `isMaximized` plus a snap counter, so only maximize/restore and snap animate layout. Drag and resize steps never measure or animate.
4. **Commit once on release.** Write the final position to the store, then `x.jump(0)` / `y.jump(0)`. Skip the write if the window did not move.
5. **Snap from the drop point.** On release with a pending snap: commit the drop position first, then in `frame.postRender` bump the snap counter and call `snapWindow`, so the layout snapshot sees the drop position (research §5.3). If this two-step proves unreliable in testing, fall back to research option C for the drop commit only (write `el.style.left/top` directly before the snap) and record why.
6. **Snap preview renders only on zone change.** Compare the new `computeSnap` result to the previous one by value; set state only when it changes.
7. **Iframe shield.** On drag (and resize) start set `data-window-drag` on `<html>`; CSS `[data-window-drag] iframe { pointer-events: none }`. Remove it on every end path, including unmount mid-drag.
8. **No scale on drag.** Remove `isDraggingState` from the open/mount animation effect so drag start never restarts x/y/scale animations. If a "lifted" cue is wanted, deepen the shadow via an opacity transition on a pseudo-element or extra layer, not `scale` and not an animated `box-shadow`.
9. **Genie and open/close share x/y safely.** Invariant: `x = y = 0` whenever no drag is in progress. Drag start calls `x.stop()` / `y.stop()` (not `controls.stop()`, which would freeze an in-flight opacity fade, research §5.4).
10. **Resize, same pattern.** During a resize, write the live bounds to the element (width/height MotionValues or direct style writes, builder's choice) and commit size and, for n/w edges, position once on release. Keep pointer capture and `pointer-events: none` on content as today.
11. **No duplicate focus writes.** `focusWindow` becomes a no-op when the window is already active and on top; the window's `onClick` focus after a drag then costs nothing.
12. **Pause wallpaper parallax during a drag.** `ParallaxProvider` ignores pointer moves while `data-window-drag` is set, so the wallpaper does not slide under the window. The wallpaper canvas keeps animating unless the measurement below shows dropped frames during a drag. Only then cap it to 30 fps or freeze it while dragging, and record the numbers.
13. **Narrow store subscriptions.** Components that only need the list of open apps (Taskbar, MenuBar, AppSwitcher, and any others found) select a primitive projection with `useShallow`, so position, size, and z-index commits do not re-render them. Window content is memoized so a commit re-renders only the window chrome that changed.

14. **Snap zones arm only after the drag has left them.** Today the top zone covers `py <= MENUBAR_H + SNAP_EDGE` (54 px), so grabbing a window that sits at the menu bar (every snapped window does) starts inside the "fill" zone, and a sideways drag of a left-half window fills the screen or snaps to a quarter. With 1:1 drag this becomes obvious. Fix (my call, flagged to the owner): (a) a snap preview only appears once the pointer has been outside every snap zone at least once during this drag; (b) the top zone shrinks to the pointer touching the menu bar, `py <= MENUBAR_H + 4`, which also applies to the top corners. Left, right and bottom zones keep `SNAP_EDGE`. Add `windowSnap` tests for both.

Pure math (drag clamp, snap-zone equality) lives in `lib/windowGeometry.ts` / `lib/windowSnap.ts` next to the existing helpers, so it can be unit-tested without a DOM. The clamp must keep today's semantics: x within `[0, vw - width]`, y within `[MENUBAR_H, vh - height - DOCK_H]`, and a window larger than the band pins to the top-left (x 0, y MENUBAR_H).

## Verification (must pass before the PR)

Unit and component tests (vitest + jsdom, existing setup in `frontend/src/__tests__`):

- Clamp helper: inside, each edge, window larger than viewport.
- Snap-zone equality helper.
- Window drag: pointerdown + moves + pointerup results in exactly one `updateWindowPosition` call with the right position; no call when there was no movement; right button does not drag; drag does not start from a traffic-light button; `pointercancel` and `lostpointercapture` end the drag; `data-window-drag` is set during and cleared after, including on unmount mid-drag; drag is ignored while maximized.
- Resize: one `updateWindowSize` per resize gesture, and n/w edges commit position too.
- `focusWindow` no-op when already on top.
- The whole existing suite stays green (`npm test` in `frontend`), plus `npm run lint` and `npm run build`.

Measurement (production build, `next build && next start`), before and after, using the scripted Playwright drag already used for the baseline (kept in `.context/pw/`, not committed) and the probe in research §7:

- Pointer-to-window drift: under 2 px p95 (baseline 107 px).
- localStorage writes during the move: 0; per gesture: 1 to 3 as listed under Goals (baseline: 1 per move).
- Layout animations started during a drag: 0; exactly 1 per snap release and 1 per maximize toggle.
- No red frames during a drag at 4x CPU on a static wallpaper; with the default animated wallpaper, no worse than idle.

Manual checks in a real browser (Chrome and Safari), recorded in the PR:

- Slow and fast drags; drag across the Browser and Resume iframes and release over them.
- Snap to each edge and corner; snap animates from the drop point.
- Grab a snapped (left-half) window and drag it sideways: no fill preview until the pointer reaches the menu bar; dragging it to the right edge gives the right half.
- Double-click maximize and restore; drag after restore.
- Minimize after a drag: genie flies from the current spot; restore.
- Drag a window while it is still in its open animation.
- Reload: layout restored exactly.
- OS Reduce Motion on: drag 1:1, snap and maximize instant.

## Left to the builder

- MotionValues vs direct style writes for resize.
- Exact structure of the refactor inside `Window.tsx` (hooks such as `useWindowDrag` / `useWindowResize` are welcome if they keep `Window.tsx` readable).
- Which extra components need `useShallow`, found by grepping `s.windows`.
- Whether the lift cue ships at all (fine to omit).

## Delivery

One PR from the current branch, built with subagent-driven development. The Fun palette work is a separate, later PR.
