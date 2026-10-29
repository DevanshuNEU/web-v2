# Cursor smoothness: why the custom cursor feels slow and buggy, and what to change

Date: 2026-10-28. Scope: read-only research, no product code changed.
Trigger: a visitor said the cursor "was quite slow and a bit buggy". The owner dislikes it too.

Labels used below:
- (spec) W3C/WHATWG text. (docs) MDN, web.dev, developer.chrome.com, motion.dev, gsap.com. (source) code or commit in the owning repo. (tracker) bug tracker or merge request.
- (derived) my arithmetic or inference from cited facts. Not a quote. Check it with the measurement recipe in section 6.
- UNVERIFIED means I did not find a primary source. All of those are collected at the end.

## TL;DR: ranked fixes (highest impact first)

1. Measure first (section 6): Chrome Performance panel, 4x CPU slowdown, 10 s scripted pointer path, save trace. Needed to prove every item below. Cost: 30 min. Risk: none.
2. Stop hiding the native cursor. Drop global `cursor: none !important`. Optional zero-JS branding via `cursor: url(...) x y, auto`. Removes the lag, the double cursor over iframes, the lost resize/I-beam/not-allowed cursors, the stuck ring, and OS cursor-size settings. Risk: low technically, loses the signature look.
3. If a follower stays, the dot is the pointer: 1:1, never faded on hover, never magnet-displaced. Current ring spring (k=420, c=28, m=0.4) trails a moving pointer by about 67 ms (about 4 frames at 60 Hz) in steady state (derived). Lag is the main "slow" feeling. Risk: low.
4. Cut frame-budget contention: the default wallpaper (Signal Grid) redraws about 1,000 to 1,600 dots plus 3 full-screen gradients per frame under 40 to 80 px backdrop blurs. Cap canvas to 30 fps or pause it when covered or idle, blur radius at or below 20 to 24 px. Biggest frame-time win on slow laptops (needs A/B proof). Risk: visual change.
5. Fix the bug classes: ring parked at last position when the pointer leaves the window, stale `magnetTarget` (detached element gives a zero rect, ring jumps to 35% of pointer position), `pointercancel` and `pointerType` ignored, `(pointer: fine)` read once, hover state only from `pointerover`. Risk: low.
6. Make the ring layout-free: fixed-size box, animate `scale` and `opacity` only, cache rects instead of calling `getBoundingClientRect` per move, `will-change: transform` on the two cursor layers only. Risk: low (border thickness scales with `scale`).
7. Window drag and dock: drag uses `mousemove` plus a store write per move and loses events over iframes; dock animates `width` (layout) every frame. Move to motion values and `transform`, disable iframe hit-testing during drag. Risk: medium.
8. Accessibility gates: disable the custom cursor for `forced-colors: active` and `prefers-contrast: more` (derived), give the animated wallpaper a pause control (WCAG 2.2 SC 2.2.2, Level A). Risk: low.
9. Do not use `pointerrawupdate` or `getPredictedEvents` for the ring. Gain is about zero for a DOM-drawn element (derived, section 1). Risk of adding them: jitter and extra listeners.
10. Re-measure with the same recipe and compare traces. Accept only if no red frames on the Frames track at 4x throttle and p95 event-to-frame under 20 ms (derived target).

## Repo observations (from reading the code, not from research)

- `frontend/src/components/os/Cursor.tsx`: ring uses `useSpring(x)` and `useSpring(y)` with `spring.cursor` (`frontend/src/lib/motion.ts`: damping 28, stiffness 420, mass 0.4). Ring `animate` includes `width` and `height`. Dot fades to opacity 0 when hovering an interactive element, so only the lagging ring is visible there. Magnet branch calls `getBoundingClientRect()` on every `pointermove` and moves the ring to `center + (pointer - center) * 0.35`. Initial position is `(-100, -100)`. `(pointer: fine)` is read once. `pointerType` is not checked. No `pointercancel`, no window-leave handling.
- `frontend/src/app/globals.css` (about line 485): `.cursor-none, .cursor-none * { cursor: none !important }`, with `text` re-enabled only for `input`, `textarea`, `[contenteditable='true']`.
- Four other global `pointermove` listeners run: `ParallaxProvider`, `useMagneticField` (also calls `getBoundingClientRect` per move), dock `onMouseMove`, notification idle.
- `Taskbar.tsx`: `useDockMagnification` reads `getBoundingClientRect()` for every icon on every `mouseX` change; the outer icon `div` animates `width` (layout) via `useTransform`.
- `Window.tsx`: drag listens to `document` `mousemove` and calls `updateWindowPosition` (store write) per event. Iframes exist in `BrowserApp.tsx` and `ResumeApp.tsx`.
- Default wallpaper in `frontend/src/store/themeStore.ts` is `dark-signal-grid`, pattern `grid` (`AnimatedBackground.tsx` `GridCanvas`). Grid spacing is 38 px, so dots = (ceil(W/38)+1) x (ceil(H/38)+1): about 975 at 1440x900 and about 1,560 at 1920x1080 (derived), each with a fresh `rgba()` string and `arc/fill`, plus one full-screen `createRadialGradient` fill per blob (3 blobs).
- Backdrop blur radii in use: menu bar 40 px, tray menus 40 px, dock 55 px, app switcher 48 px, launchpad 70 px, glass utilities 20/40/60/80 px (`globals.css` lines 26 to 29, 197 to 217).
- Canvas particle and grid loops advance per frame, not per elapsed time, so on 120 Hz displays they run twice as fast (see section 4).

## 1. Why a software cursor feels laggy next to the OS cursor

Claims:

- The OS cursor can be drawn on its own hardware plane, so moving it does not require repainting the app. In the Linux DRM model there is a dedicated cursor plane type, operated through the cursor ioctls: https://android-kvm.googlesource.com/linux/+/refs/heads/debug/drivers/gpu/drm/drm_plane.c (kernel `drm_plane.c` doc comments, read via a mirror) and https://docs.kernel.org/gpu/drm-kms.html (plane type property: "differentiate CURSOR, PRIMARY and OVERLAY"). (source)
- Compositors treat hardware cursors as a latency win: wlroots "always use hardware cursors if available" says outputs need no re-render on cursor movement (https://git.nixnet.services/blankie/wlroots/commit/225d182765eb69aa7a7647c809c37903ec08519c), and a Mutter merge request exists to cut cursor latency by calling the cursor-move ioctl as soon as input arrives (https://gitlab.gnome.org/GNOME/mutter/-/merge_requests/4249). (tracker)
- Hardware cursors are not free of problems: Weston disabled them by default on some Intel setups because cursor updates waited for vblank, so it is hardware dependent (https://code.tokarch.uk/mainnika/weston/src/commit/6858383d51b12632481370fdc7d886a1e6bb4ebd). (tracker)
- macOS and Windows hardware cursor behavior: UNVERIFIED (no primary source fetched).
- A page-drawn cursor is just another element. It must wait for the browser pipeline: input goes browser process, then renderer, then main thread (https://developer.chrome.com/blog/inside-browser-part4), then style/layout/paint/commit, then compositor and GPU, then display. Chromium's own latency tracing defines these stages (renderer main thread, renderer compositor, Viz compositor in the GPU process, swap, presentation): https://gitcode.com/openharmony-tpc/chromium_src/blob/master/base/tracing/stdlib/chrome/event_latency_description.sql (mirror of Chromium source). (source)
- Chrome delays continuous input. Since Chrome 60 it holds `pointermove`, `mousemove`, `wheel`, `touchmove` and dispatches them "right before the requestAnimationFrame() callback", so handlers run about once per frame. Discrete events (`pointerdown`, `keydown`, `mouseup`) are not delayed. https://developer.chrome.com/blog/aligning-input-events (docs). Same statement: https://developer.chrome.com/blog/inside-browser-part4 (docs).
- The Pointer Events spec lets any browser delay `pointermove` ("MAY delay dispatch... for performance reasons"), and the spec revision history says the animation-frame wording was removed: https://www.w3.org/TR/pointerevents3/ (spec). So rAF alignment is Chromium behavior, not a spec guarantee.
- How many frames a DOM cursor adds: no primary source quantifies it. Chrome's post says only that input latency was driven down and gives no figure. UNVERIFIED. Reasoned floor (derived): input is held until the next frame start (up to 1 frame at 60 Hz = 16.7 ms), the visual update can show no earlier than the following presentation, plus scanout. Expect roughly 1 to 3 frames more than the OS cursor, before any intentional spring lag.
- The intentional spring is the larger term here. Motion's spring uses damping ratio = damping / (2 * sqrt(stiffness * mass)) and undamped angular frequency = sqrt(stiffness / mass): https://github.com/motiondivision/motion/blob/v12.38.0/packages/motion-dom/src/animation/generators/spring.ts (source, lockfile pins framer-motion 12.38.0). For k=420, c=28, m=0.4: zeta = 1.08, omega0 = 32.4 rad/s. For a second-order system following a constant-velocity input, steady-state lag is 2*zeta/omega0 = 67 ms (derived, standard control result). That is about 67 px behind at 1,000 px/s. It settles to 2% in about 0.2 s (derived).
- `getCoalescedEvents()` returns the intermediate samples that were merged into one `pointermove`. It helps drawing and trails, not a follower that only needs the latest point: https://developer.chrome.com/blog/aligning-input-events (docs) and https://www.w3.org/TR/pointerevents3/ (spec).
- `getPredictedEvents()` returns estimated future positions "to draw ahead" and "may reduce perceived latency depending on the application's interpretation"; the algorithm is browser defined; Baseline 2024: https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent/getPredictedEvents (docs). Spec says predictions are valid only until the next pointer event: https://www.w3.org/TR/pointerevents3/ (spec).
- `pointerrawupdate` fires "as soon and as frequently as the browser can", needs a secure context, is not cancelable, is "Limited availability" (not Baseline), and MDN warns it "can affect performance" and an app that cannot keep up "will feel less responsive": https://developer.mozilla.org/en-US/docs/Web/API/Element/pointerrawupdate_event (docs); spec: https://www.w3.org/TR/pointerevents3/#the-pointerrawupdate-event. It is also excluded from Event Timing (section 6). Inference (derived): a DOM element cannot be repainted before the next frame anyway, so earlier delivery gains about nothing for a follower.
- The only web API that bypasses the JS event loop for latency is the Ink API (delegated ink trails). It targets strokes, is experimental, and is not Baseline: https://developer.mozilla.org/en-US/docs/Web/API/Ink_API (docs). It does not apply to a cursor.

Takeaway: the OS cursor will always be at least a frame ahead of anything the page draws. Any intentional smoothing (the spring) is added on top. Remove the smoothing from the element that represents the pointer, or keep the native cursor.

## 2. What the platform offers instead of replacing the cursor

- I found no primary source that "recommends" keeping the native cursor and adding a trailing decoration. That recommendation is my inference from section 1 (the page cannot beat the OS cursor on latency, and hiding it removes OS behaviors). UNVERIFIED as an "expert consensus" claim.
- CSS `cursor` accepts `url()` images with optional hotspot, tried in order, with a mandatory fallback keyword at the end: https://developer.mozilla.org/en-US/docs/Web/CSS/cursor (docs); https://www.w3.org/TR/css-ui-4/#cursor (spec).
  - Hotspot: two numbers after the URL, from the image top-left, clamped into the image. If omitted, read from the file, else `0 0` (docs and spec above).
  - Formats: PNG and SVG (secure static mode, natural size required) are required; `.cur` widely supported on desktop (docs, spec).
  - Size: spec sets no limit, but browsers cap it. MDN: Firefox and Chromium restrict images to 128x128 by default, recommend 32x32 or less, and "cursor changes using images that are larger than the user-agent maximum... will generally just be ignored". Spec: larger cursors "must be shrunk to within the OS-supported size bounds". (docs, spec above). That sentence also shows image cursors become OS cursors, so they get OS-level latency (derived).
  - Chromium drops custom cursors larger than 32x32 unless they fit fully inside the visual viewport, so they revert to the fallback near window edges: https://chromium.googlesource.com/chromium/src.git/+/827f22ba010c3304d0360227a64378ec79645278 (source, bug 1099276). Keep images at or below 32x32 CSS px.
  - Browsers may block cursor changes that intersect browser toolbars (spoofing defense): https://developer.mozilla.org/en-US/docs/Web/CSS/cursor (docs).
  - `image-set()` for cursor: the spec defines `url-set`, a restricted `image-set()` that accepts only URLs (https://www.w3.org/TR/css-ui-4/#cursor). Cross-browser support for retina variants: UNVERIFIED.
  - Over iframes and in fullscreen: UNVERIFIED. The iframe has its own document and its own cascade, so the parent's `cursor` rules should not style content inside it (derived from separate-document model, not from a quoted source).
- `cursor: none` is a first-class keyword ("No cursor is rendered"), so hiding is allowed, but it hides everything, including the resize, text, grab and not-allowed cursors the UA would otherwise show (spec/docs above).
- The UA may also show its own cursor for UI states and over native controls such as scrollbars (spec): https://www.w3.org/TR/css-ui-4/#cursor.

Takeaway: ship a native cursor plus a CSS `cursor: url(...)` image if branding matters. Per-selector overrides (`a, button { cursor: url(pointer.svg) 6 2, pointer }`) keep the fallback keywords. Zero JS, zero frames of page latency.

## 3. Animation mechanics

- `MotionValue` updates the DOM without a React re-render: "Changes to the motion value will update the DOM without triggering a React re-render", and renders are "batched to the next animation frame": https://motion.dev/docs/react-motion-value (docs).
- Source confirms it (framer-motion 12.38.0 tag):
  - `MotionValue.set` notifies subscribers synchronously: https://github.com/motiondivision/motion/blob/v12.38.0/packages/motion-dom/src/value/index.ts (source).
  - A change schedules a render via `frame.render(this.render, false, true)`: https://github.com/motiondivision/motion/blob/v12.38.0/packages/motion-dom/src/render/VisualElement.ts (source).
  - The batcher runs steps in order `setup, read, resolveKeyframes, preUpdate, update, preRender, render, postRender` and schedules itself with `requestAnimationFrame`: https://github.com/motiondivision/motion/blob/v12.38.0/packages/motion-dom/src/frameloop/batcher.ts and https://github.com/motiondivision/motion/blob/v12.38.0/packages/motion-dom/src/frameloop/frame.ts (source).
  - `renderHTML` writes `element.style[key] = value` for each changed style key, then CSS variables via `setProperty`: https://github.com/motiondivision/motion/blob/main/packages/motion-dom/src/render/html/utils/render.ts (source, main branch).
  - Spring steps run in a frame-driver `frame.update(...)` loop: https://github.com/motiondivision/motion/blob/v12.38.0/packages/motion-dom/src/animation/drivers/frame.ts (source).
  - Result: per frame, one JS spring step per axis (cheap) and one `style.transform` string write. The real cost is the browser style/paint/composite work that follows, not Motion's bookkeeping. Per-frame cost in microseconds: UNVERIFIED, measure it.
- These springs run on the main thread. Motion docs: "The JavaScript code will always run on the main JS thread"; only WAAPI/CSS animations can run on the compositor: https://motion.dev/docs/performance (docs). Motion's WAAPI-accelerated value list is only `opacity`, `clipPath`, `filter`, `transform`: https://github.com/motiondivision/motion/blob/v12.38.0/packages/motion-dom/src/animation/waapi/utils/accelerated-values.ts (source). A pointer-driven `useSpring` is not in that path. If the main thread is busy, the ring and dot both stall.
- The ring's `animate` of `width` and `height` is layout work. Motion docs: "Many styles affect layout, like `height`, `border-width`, `padding`, `position`", "Re-renders can easily take upwards of 100ms! This is why animating layout is so often discouraged", and "The best performing styles are those that trigger only the third rendering step, the compositor... `transform` and `opacity` are cheapest": https://motion.dev/docs/performance (docs). Same rule on web.dev: only `transform` and `opacity` qualify as compositor-only: https://web.dev/articles/stick-to-compositor-only-properties-and-manage-layer-count (docs). Layout is "normally scoped to the whole document", so a size change can force broader recalculation: https://web.dev/articles/avoid-large-complex-layouts-and-layout-thrashing (docs). The ring's size animation runs only on hover transitions, but it competes with the pointer path exactly when the user is aiming at a button.
- Alternative: fixed-size ring box, animate `scale` and `opacity`. Both are transform/opacity. Catch: `scale` also scales the 1.5 px border and box-shadow (derived). If that matters, draw the ring as an SVG circle or two stacked elements and cross-fade.
- `getBoundingClientRect()` returns viewport-relative geometry, applies transforms, and returns an all-zero rect when the element has no box (detached, `display: none`): https://www.w3.org/TR/cssom-view-1/#dom-element-getboundingclientrect (spec). Reading geometry after style writes forces synchronous layout; "always batch your style reads and do them first": https://web.dev/articles/avoid-large-complex-layouts-and-layout-thrashing (docs). Motion's own pointer-follow tutorial reads layout inside `frame.read` so it happens once per frame: https://motion.dev/tutorials/react-follow-pointer-with-spring (docs).
- Hand-rolled rAF lerp writing `transform: translate3d(...)`:
  - Same main-thread class as `useSpring`. Same compositor outcome. No React involvement either way.
  - Pros: no library dependency in the hot path, one write per frame by construction, trivial to make frame-rate independent.
  - Cons: you own cleanup, visibility handling and rAF lifecycle.
  - Frame-rate independence matters: MDN warns animation steps must use the timestamp "otherwise, the animation will run faster on high refresh-rate screens": https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame (docs). Use `a = 1 - exp(-dt / tau)`. Steady-state lag of exponential smoothing equals `tau` (derived), so `tau = 16 ms` gives about one frame of lag.
  - Neither approach is meaningfully faster in itself. The gain comes from removing layout, removing the extra listeners' rect reads, and removing intentional lag (derived).
- CSS-only: CSS cannot read the pointer position, so at least one JS write per event or frame is required (derived). A CSS `transition: transform` can move interpolation to the compositor, but retargeting on every event is unmeasured. UNVERIFIED.
- `will-change: transform`: web.dev advises promoting elements you will move with `will-change` or `translateZ`, and warns "every layer you create requires memory and management, and that's not free" (https://web.dev/articles/stick-to-compositor-only-properties-and-manage-layer-count). MDN calls it "a last resort" and warns against permanent use on many elements, but the cursor layers are two elements that move constantly (https://developer.mozilla.org/en-US/docs/Web/CSS/will-change). Two persistent layers are a defensible exception (derived). Whether Chromium repaints a non-promoted element on JS-driven transform changes: UNVERIFIED. Check "Rendering > Layer borders" and the trace after adding it.
- `contain`: `contain: strict` = `size layout paint style`; `paint` clips to the box and `layout`/`paint` make the element a containing block and stacking context: https://developer.mozilla.org/en-US/docs/Web/CSS/contain (docs). `contain: layout paint style` on the ring (not `strict`, which needs an explicit size and clips the glow) limits invalidation to the ring (derived). The 10 px outer glow sits outside the box and would be clipped by `paint`. Drop the glow or keep it inside the box. Benefit is small once the ring is transform-only. Low priority.
- `will-change: backdrop-filter` on `.glass-subtle` and one more rule (`globals.css` lines 199 and 341): MDN says do not apply `will-change` pre-emptively (docs above). Test removing it.

Takeaway: the Motion pipeline is not the bottleneck. The bottlenecks are intentional spring lag (section 1), layout-affecting ring animation, per-move rect reads, and main-thread contention (section 4).

## 4. Frame budget: animating canvas under backdrop-filter

- `backdrop-filter` filters "the pixels painted behind an element, up to the nearest ancestor that is a backdrop root": https://developer.mozilla.org/en-US/docs/Web/CSS/backdrop-filter (docs). The Chromium implementation reads back the destination texture of the render surface, applies the filter, clips to the border radius, then draws the element: https://github.com/mfreed7/backdrop-filter-feature (written by the Chromium implementer). It says the feature "can be very performance-demanding". (source)
- Chromium's effect node carries `backdrop_filters` and a `backdrop_filter_quality` float, so a quality knob exists internally, but it is not exposed to CSS: https://chromium.googlesource.com/chromium/src/+/main/cc/trees/effect_node.h (source).
- WebKit's introduction says the effect "forces the engine to perform more rendering passes, which will have an impact on performance" and to use it "only where it is most necessary": https://webkit.org/blog/3632/introducing-backdrop-filter/ (docs).
- Inference (derived): each blurred panel samples the pixels behind it. The wallpaper canvas changes every frame, so every visible panel's blurred backdrop is invalid every frame. Menu bar, dock, windows and tray menus can each re-blur at display rate. I found no primary source that states this per-frame invalidation explicitly. Prove it with a trace: switch to a static wallpaper (the app has static image wallpapers) and compare GPU and raster time.
- Safari: WebKit tracker has reports of large `blur()` filters causing very slow frames (https://www2.webkit.org/show_bug.cgi?id=240865, https://bugs.webkit.org/show_bug.cgi?id=228312). Those are `filter: blur`, not `backdrop-filter` over a canvas, so they are signals only. Safari-specific cost of this exact stack: UNVERIFIED.
- Documented mitigations:
  - Use blur sparingly (WebKit post above). Reduce the number of panels and radii (derived; scaling of cost with radius: UNVERIFIED).
  - Pause work when hidden: "`requestAnimationFrame()` calls are paused in most browsers when running in background tabs or hidden `<iframe>`s" (https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame). Pausing when the canvas is fully covered (maximized window, Launchpad open) is not automatic. Needs code (derived).
  - Honor `prefers-reduced-motion` (already done: canvases draw one frame when `reduced`). Definition and vestibular note: https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion (docs).
  - Canvas tips from MDN: `getContext('2d', { alpha: false })`, batch calls (one path for many lines), avoid `shadowBlur`, redraw only what changed, "have a smaller canvas and scale up rather than a bigger canvas and scale down": https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas (docs). Current canvases already size to `innerWidth x innerHeight` in CSS px (no devicePixelRatio multiply), then scale by 1.06 for parallax overscan.
  - Frame-rate independence: MDN says steps must be time based or the animation runs faster on high refresh displays (rAF page above). The canvases here use per-frame increments (derived from the code).
- Particles loop cost (derived): 75 points gives 75 x 74 / 2 = 2,775 pair checks per frame. That is a few thousand subtractions and square roots per frame, trivial next to rendering. Expected line draws at 1080p are about 70 (neighbors within 130 px: pi x 130^2 x 75 / (1920 x 1080) = about 1.9 per point, halved for pairs). The O(N^2) loop is not the problem. It also is not the default wallpaper. Exact JS time: UNVERIFIED, measure.
- Grid loop cost (derived): about 1,000 to 1,600 dots per frame, each with `beginPath`, `arc`, string-built `rgba()`, `fill`, and a 3-blob inner loop, plus 3 full-screen gradient fills. This is the default wallpaper and the heaviest of the four canvases. Main-thread cost: UNVERIFIED, measure. Candidate fixes: pre-render the dot grid once to an offscreen canvas and composite; draw glows at quarter resolution; or cap at 30 fps.

Takeaway: the cheapest large win is making the canvas stop invalidating the blurred layers every frame (30 fps cap, pause when covered, or static default), not micro-optimizing the particle math.

## 5. Known bug classes and the right fix

(a) Ring stuck at last position, hidden at (-100, -100) until first move.
- `pointerleave` "is fired when a pointing device is moved out of the hit test boundaries of an element", does not bubble, and pairs with `pointerout`: https://developer.mozilla.org/en-US/docs/Web/API/Element/pointerleave_event (docs). `mouseout`/`pointerout` `relatedTarget` is `null` when there is no secondary target: https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/relatedTarget (docs). MDN does not state that these fire on window exit. Pointer Events 3 text I read does not mention window exit either. UNVERIFIED across Chrome, Safari, Firefox.
- Fix to test: `document.documentElement.addEventListener('pointerleave', hide)` plus `pointerout` with `relatedTarget === null`, and `pointerenter`/`pointermove` to show. Also seed the position from the first event, not `(-100,-100)`. If the native cursor stays visible (item 2) this class disappears.
- Also clear `magnetTarget` and `pressed` on leave and on `blur` (derived).

(b) Pointer events do not reach iframes, ring freezes.
- `document.elementFromPoint` returns the `<iframe>` element itself when the point is inside another document: https://developer.mozilla.org/en-US/docs/Web/API/Document/elementFromPoint (docs). Events inside the iframe fire in the iframe's document. Primary source for "parent gets no `pointermove`": UNVERIFIED. Bug trackers describe it: https://bugs.webkit.org/show_bug.cgi?id=27449 and https://bugzilla.mozilla.org/show_bug.cgi?id=1084121 (tracker, signals only).
- Consequence here (derived): `.cursor-none *` applies in the parent document, but the iframe content uses its own cascade, so the native cursor shows inside `BrowserApp` and the `ResumeApp` PDF while the ring freezes at the iframe edge. Two cursors.
- Fixes: keep native cursor (item 2); or hide the ring on `pointerout` into an iframe (target is the iframe element) and show native `cursor: auto` on iframes; or for same-origin only, relay via `postMessage`. During window drag, set `pointer-events: none` on iframes so `mousemove` keeps reaching the parent (tracker discussion above; reliability caveats there). Pointer capture across iframes: UNVERIFIED.

(c) Touch, pen, hybrid laptops.
- `pointer` reports the primary device, `any-pointer` any device; both `fine` and `coarse` can match on hybrids; `none` only when no pointing device exists: https://developer.mozilla.org/en-US/docs/Web/CSS/@media/any-pointer (docs). The code reads `(pointer: fine)` once at mount.
- Fix: check `event.pointerType === 'mouse'` per event (hide ring for `touch`/`pen`), subscribe to `matchMedia('(any-pointer: fine)')` `change`. Whether the value changes at runtime when a mouse is plugged in: MDN does not say, UNVERIFIED.
- Handle `pointercancel` (touch scroll start, pen) like `pointerup`, or `pressed` can stick (derived; event is in the Pointer Events spec: https://www.w3.org/TR/pointerevents3/).

(d) `cursor: none !important` overrides everything.
- It hides resize, grab, `not-allowed`, I-beam over text and links' pointer, and the browser cannot show UI-state cursors (spec lists UA-chosen cursors: https://www.w3.org/TR/css-ui-4/#cursor). The repo restores only inputs and contenteditable. Repo has `cursor-move` on the window title bar and `cursor-not-allowed` on disabled controls (code read); both are hidden by the global rule. I found no resize-handle cursor classes in `Window.tsx`, so window resize edges may not exist yet (UNVERIFIED, not searched beyond grep).
- Fix: do not use a global `!important` kill. If the ring stays, scope `cursor: none` to the desktop surface only, never to `iframe`, windows' resize edges, text, or disabled controls; or drop `cursor: none` and let the ring be a decoration.

(e) Stale hover from `pointerover`.
- Pointer Events 3 requires boundary events after layout changes: "the user agent MUST fire certain boundary events after a layout change that affected the hit test target for the pointer", but "MAY delay the firing of these boundary events because of performance reasons" (section 4.1.4): https://www.w3.org/TR/pointerevents3/ (spec). So `pointerover` does eventually refresh under a stationary pointer, but late and not guaranteed to be prompt.
- Bug in this code (derived): `magnetTarget` can point at an element that was removed. `getBoundingClientRect()` on it returns an all-zero rect (spec, section 3), so the ring target becomes `0 + pointer * 0.35`, a visible jump to about a third of the pointer position until the next `pointerover`. Same for hidden elements.
- Fixes: cache nothing across frames without validating `isConnected`; recompute hover on `pointermove` (read `e.target`, no layout needed) and refresh with `document.elementFromPoint(lastX, lastY)` only after layout-changing events (window open/close, scroll end) not every frame. MDN notes `elementFromPoint` ignores `pointer-events: none` elements and returns the iframe for iframe content (docs above), and returns `null` out of bounds.
- The magnet also chases a moving target: dock icons carry bare `data-magnetic` and animate their own width and scale (code read), so the ring center keeps moving while you aim (derived).

(f) Accessibility.
- WCAG 2.2 SC 2.2.2 Pause, Stop, Hide (Level A): moving content that "(1) starts automatically, (2) lasts more than five seconds, and (3) is presented in parallel with other content" needs a way to "pause, stop, or hide it" unless essential: https://www.w3.org/TR/WCAG22/#pause-stop-hide; understanding doc: https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html (spec). The animated canvas wallpaper matches all three conditions. The understanding page does not mention `prefers-reduced-motion` as a conforming technique, so honoring it does not by itself prove conformance. Add a pause control (derived).
- SC 2.3.3 Animation from Interactions (Level AAA): "Motion animation triggered by interaction can be disabled, unless the animation is essential": https://www.w3.org/TR/WCAG22/ (spec). Understanding page lists parallax as a common non-essential case and lists C39 (`prefers-reduced-motion` CSS) and SCR40 as sufficient techniques: https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html (spec). Pointer parallax, dock magnification and magnetic buttons fall here. The repo already gates them on `useReducedMotion()`.
- SC 1.4.13 Content on Hover or Focus (Level AA) concerns extra content revealed on hover. It is not about the cursor itself (spec above).
- I found no WCAG 2.2 success criterion that forbids replacing the pointer graphic. Replacing it does remove OS-level pointer customization: large or high-contrast pointer settings apply to the OS cursor, not to a page element (derived; OS vendor docs not fetched, UNVERIFIED).
- `forced-colors: active` (Windows High Contrast): the UA forces colors, sets `box-shadow` and `text-shadow` to `none`, and the MDN page does not discuss the cursor: https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors (docs). The ring's glow and tinted fill would be removed, leaving a thin border (derived). Recommended: do not enable the custom cursor when `forced-colors: active` matches, and consider `prefers-contrast: more` (derived).
- The repo already skips the custom cursor under reduced motion, which is the right default. Note that this ties an unrelated preference (motion) to the pointer; offering a settings toggle is clearer (derived).

## 6. Measurement: baseline and after

What the primary sources give:

- Event Timing excludes continuous events: "`mousemove`, `pointermove`, `pointerrawupdate`, `touchmove`, `wheel`, and `drag`" are not exposed. Entries use `duration` from physical input (estimated via `event.timeStamp`) to next render, rounded to 8 ms, default threshold 104 ms, minimum 16 ms: https://www.w3.org/TR/event-timing/ (spec). INP covers click, tap and key press only; hover and scroll are not observed: https://web.dev/articles/inp (docs). Neither measures cursor lag. Use them only for dock and button click latency.
- Long Animation Frames: `PerformanceObserver` with `type: 'long-animation-frame'`, `buffered: true`, fields `duration`, `blockingDuration`, `renderStart`, `styleAndLayoutStart`, `scripts`; frames over 50 ms; Chrome and Edge 123+, no Firefox or Safari: https://developer.chrome.com/docs/web-platform/long-animation-frames (docs).
- DevTools Performance panel: the Frames track marks green (on time), yellow (partially presented), red (dropped) frames; the Interactions track flags interactions over 200 ms; Screenshots checkbox captures every frame; "Enable advanced paint instrumentation" is in Capture settings; the Frame rendering stats overlay shows FPS: https://developer.chrome.com/docs/devtools/performance/reference (docs).
- CPU throttling: the performance docs name 4x ("DevTools throttles your CPU so that it's 4 times slower") and 20x: https://developer.chrome.com/docs/devtools/performance (docs). A 6x option exists in the UI per a secondary source (https://www.debugbear.com/blog/cpu-throttling-in-chrome-devtools-and-lighthouse), not in the Chrome docs I read. UNVERIFIED in primary docs. Calibrated "low-tier mobile" and "mid-tier mobile" presets shipped in Chrome 134; the post recommends mid-tier as typical: https://developer.chrome.com/blog/devtools-grounded-real-world (docs). Steps: Settings > Throttling > Calibrate > Continue, about 5 s reload: https://developer.chrome.com/docs/devtools/settings/throttling (docs).
- Chromium tracing: `chrome://tracing` with `input` and `viz` flow events for janks; `EventLatency` slices exist in Chromium's trace schema, but their documented use is scroll-centric: https://chromium.googlesource.com/chromium/src/+show/da170c2267b2201954efe1c8fa5d2d89ab09f7bf/docs/speed/debug-janks.md and https://gitcode.com/openharmony-tpc/chromium_src/blob/master/base/tracing/stdlib/chrome/event_latency.sql (source, mirror). For pointer-follow, the DevTools recording below is enough.
- No browser API reports true input-to-photon time for `pointermove`. A camera-based test (240 fps phone filming the OS cursor next to a visible marker) is the usual method, but I have no primary source for it. UNVERIFIED as a documented practice.

Recipe (do this before and after each change):

1. Build and serve production: `next build && next start` (dev mode adds React overhead). Fresh Chrome profile, no extensions, window fixed at 1440x900, same wallpaper (default Signal Grid), battery off power-saver.
2. DevTools > Rendering > enable "Frame Rendering Stats". Close other tabs.
3. Performance panel: enable Screenshots; CPU = 4x slowdown, then repeat with the calibrated mid-tier mobile preset. Network no throttling.
4. Paste this probe into the console before recording (not committed to the repo):
   ```js
   window.__m = { loaf: [], frame: [], lat: [] };
   new PerformanceObserver(l => l.getEntries().forEach(e =>
     __m.loaf.push([Math.round(e.startTime), Math.round(e.duration), Math.round(e.blockingDuration)])))
     .observe({ type: 'long-animation-frame', buffered: true });
   let last = performance.now();
   (function f(t) { __m.frame.push(t - last); last = t; requestAnimationFrame(f); })(last);
   addEventListener('pointermove', e => {
     const t0 = e.timeStamp;
     requestAnimationFrame(() => __m.lat.push(performance.now() - t0));
   }, { passive: true });
   ```
   `lat` is event timestamp to start of the next rAF callbacks: a lower bound on input-to-paint, not photon time (derived). `frame` gives rAF deltas (dropped frames show as 2x or more the display interval).
5. Press Record. Perform the same scripted motion for 10 s: a slow circle over empty desktop, fast horizontal sweeps (about 1,500 px/s), a pass across the dock, hover over 3 buttons, drag a window with a Browser iframe underneath, then stop. A mouse jiggler or a recorded Playwright `page.mouse.move` path makes it repeatable.
6. Read, in this order: (a) Frames track: count red and yellow frames; (b) Main track: tasks over 16.7 ms and their source (Layout, Recalculate Style, Paint, Function Call); (c) Layers/GPU rows: raster and composite time per frame; (d) `__m.loaf.length`, `max(blockingDuration)`; (e) p50/p95/p99 of `__m.frame` and `__m.lat`.
7. Save the trace JSON (Performance panel > Save profile) as `before-<change>.json`. Repeat after each change. Keep one change per trace.
8. A/B toggles that isolate cause: static image wallpaper vs Signal Grid; `.glass-*` blur removed; `Cursor` unmounted. If frame time barely moves with the cursor unmounted, the cursor is not the cost and the canvas/blur is.
9. Acceptance (derived targets): no red frames on the Frames track at 4x, p95 `frame` delta under 20 ms on a 60 Hz display, `lat` p95 under 20 ms, zero LoAFs over 50 ms during pointer motion.

## 7. Prior art: follower techniques

- GSAP `quickTo`: returns a reusable function bound to one property of one target; each call restarts the tween toward the new number; skips unit conversion and other `gsap.to()` conveniences; meant for repeated updates like `mousemove`. Official mouse-follower pattern: one `xTo` and one `yTo` with `duration: 0.4` and `ease: "power3"`, fed from a `mousemove` handler: https://gsap.com/docs/v3/GSAP/gsap.quickTo()/ (docs).
- GSAP `quickSetter`: direct property writes without conveniences, "boost performance 50% - 250%", with the caveat that most projects will not notice a difference. Its mouse demo is a 1:1 follower: https://gsap.com/docs/v3/GSAP/gsap.quickSetter()/ (docs).
- Motion: pass `useSpring` motion values to `style`; Motion drives transforms. Official tutorial puts the `pointermove` handler on `window` and wraps `x.set/y.set` in `frame.read` "to ensure we only update the motion values once per frame": https://motion.dev/tutorials/react-follow-pointer-with-spring (docs). That tutorial uses a loose spring (damping 3, stiffness 50) as a toy effect, which is the opposite of what a pointer replacement needs.
- Motion+ ships a `Cursor` component with spring-following examples (paid). Its page does not say whether it hides the native cursor and makes no performance or accessibility claims: https://motion.dev/examples/react-cursor-floating-target (docs). Not evidence that replacing the pointer is smooth.
- Plain rAF lerp: see section 3. Same cost class as the others.
- Tradeoffs (derived):
  - All three drive the same thing: one transform write per frame on the main thread. None is faster than the others in a way that matters at this scale.
  - `quickSetter` or a bare `style.transform` write is the lowest-latency (no smoothing). Motion `useSpring` and `quickTo` add smoothing lag by design. That lag is the subject of the complaint.
  - The tutorials treat the follower as a toy decoration, not a pointer substitute. I found no official doc that documents a full pointer replacement as smooth.
  - Desktop-OS portfolio sites and their cursor strategies: not found in primary sources. UNVERIFIED. Not surveyed on purpose.

Recommendation: native cursor visible, plus either a CSS `cursor: url()` image or a small trailing ring (transform-only, ring lag at or under about 20 ms if it must read as "attached", for example `stiffness 4000, damping 80, mass 0.4` gives zeta 1.0 and omega0 100 rad/s, lag 20 ms, derived), never replacing the pointer.

## Open / UNVERIFIED

- Hardware cursor plane behavior on macOS and Windows, and whether Chrome on those platforms uses it for CSS image cursors. Only Linux DRM sources read, via kernel source mirrors and compositor trackers.
- Exact number of frames a DOM cursor adds in current Chrome and Safari. No primary quantification found.
- Whether Motion's spring step and render land in the same frame as the `pointermove` that triggered them. Chrome dispatches input right before rAF callbacks and Motion uses `requestAnimationFrame`, so it likely does, but I did not verify against the HTML event loop spec or a trace.
- Per-frame microsecond cost of `useSpring` plus style write. Measure.
- Whether Chromium repaints, rather than only re-composites, a non-promoted element moved by JS-written `transform`, and whether `will-change: transform` changes that.
- `contain` benefit on a fixed cursor layer. Reasoned only.
- Spec text on parent-document events while the pointer is over an iframe. Only tracker reports found.
- Custom CSS cursors over iframes and in fullscreen. Not found.
- `image-set()` / `url-set` cursor support across browsers for retina images.
- Whether `pointerleave` or `mouseleave` on `documentElement`, or `pointerout` with null `relatedTarget`, fires reliably on window exit in Chrome, Safari and Firefox. Pointer Events 3 text read covers roughly the first 200,000 of 248,345 characters; the rest (including section 10 details) was not read. MDN pages did not state it.
- Whether `any-pointer` values update when a mouse is attached at runtime.
- Whether pointer capture redirects events across an iframe boundary.
- How much blur radius reduction and per-frame backdrop invalidation actually cost in Chromium and Safari for this exact stack. Only design docs and unrelated `blur()` bug reports found. A/B in section 6 resolves it.
- 6x CPU throttle in Chrome's own docs (only 4x, 20x and calibration found).
- Camera-based input-to-photon testing as a documented practice.
- OS vendor documentation on large or high-contrast pointer settings not applying to page-drawn cursors. Not fetched.
- Motion source cited from the `v12.38.0` tag, except `html/utils/render.ts` which was read from `main`. The lockfile pins 12.38.0 and `node_modules` was not installed in this worktree.
