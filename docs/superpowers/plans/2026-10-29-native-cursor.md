# Native Cursor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the custom page-drawn cursor with the system cursor, and keep click feedback with a CSS-only press state on the shared Button.

**Architecture:** Delete the `Cursor` component and everything that exists only for it. The OS draws the pointer, so the page can no longer make it late or glitchy. Press feedback is one Tailwind utility on the shared `Button`, so it costs no JavaScript.

**Tech Stack:** Next.js 15, React 19, Tailwind 3.4, Vitest (node env, jsdom per-file), framer-motion (untouched).

**Spec:** Decisions made in chat on 2026-10-28 and 2026-10-29 (Option 3, "Plain native cursor", picked by the owner after a live mockup). Evidence: `docs/research/2026-10-28-cursor-smoothness.md`. The reviewer comment that started this: "the cursor (it was quite slow and a bit buggy for me)".

## Global Constraints

- Scope is the cursor only. No wallpaper, drag, dock, blur, or bundle changes.
- No custom cursor art, no halo, no Preferences toggle.
- Do not rename the current branch (`DevanshuNEU/7afa0`).
- Do not touch `frontend/src/components/os/Window.tsx` or the About Me files (the unmerged `image-uiux-review` branch edits them).
- Leave the bare `data-magnetic` attributes in `Taskbar.tsx` (lines 124 and 215). `useMagneticField` ignores them (it matches `[data-magnetic="button"]` only). Cleanup is a later change.
- Writing rule for every comment, commit message and doc: no em-dashes or en-dashes.
- Commit trailer: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Review Focus

- Touch and coarse-pointer devices: behavior must be unchanged (the old `Cursor` rendered nothing there). Pinned by the existing `desktopContextMenu` test still passing in Task 1.
- Any leftover reference to `Cursor`, `cursor-none` or `spring.cursor` after deletion: build break or silent dead CSS. Pinned by the guard test in Task 1.
- Text fields: the I-beam and caret must come from the browser, with no `!important` override left. Pinned by the guard test and the manual check in Task 3.
- Iframes (Browser app, Resume PDF) and window edges: the native cursor must show, with no second cursor. Manual check in Task 3.
- Reduced motion: the press scale must be off. Moot: Task 2 was dropped.

---

### Task 1: Remove the custom cursor

**Files:**
- Delete: `frontend/src/components/os/Cursor.tsx`
- Modify: `frontend/src/components/os/Desktop.tsx` (remove the `import Cursor` and the `<Cursor />` element)
- Modify: `frontend/src/app/globals.css` (remove the whole `CUSTOM CURSOR` block, about lines 488-503, header comment through the `.cursor-none input...` rule)
- Modify: `frontend/src/lib/motion.ts` (remove `spring.cursor` and its doc comment; reword the `MAGNETIC_PULL` comment that says it "mirrors the cursor ring's 0.35")
- Modify: `frontend/src/hooks/useMagnetic.ts` (reword the scope note that says bare `data-magnetic` is "purely for the cursor-ring snap")
- Modify: `frontend/src/__tests__/os/desktopContextMenu.test.tsx` (remove the `vi.mock('@/components/os/Cursor', ...)` line)
- Create: `frontend/src/__tests__/os/nativeCursor.test.ts`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: no `Cursor` export, no `cursor-none` class, no `spring.cursor`. Task 2 and 3 rely on the system cursor being visible.

- [ ] **Step 1: Commit the research notes on their own.** `git add docs/research docs/superpowers && git commit -m "docs: cursor smoothness research and native cursor plan"` (with the trailer).

- [ ] **Step 2: Write the failing guard test** in `nativeCursor.test.ts`. It reads source files from disk (resolve paths from the test file, not the cwd) and asserts:
  - `it('has no Cursor component file')`: `src/components/os/Cursor.tsx` does not exist.
  - `it('does not import or render Cursor in Desktop')`: `Desktop.tsx` text does not match `/\bCursor\b/`.
  - `it('does not hide the system cursor in globals.css')`: `globals.css` does not contain `cursor: none` and does not contain `cursor-none`.
  - `it('has no spring.cursor token')`: `src/lib/motion.ts` does not match `/\bcursor:\s*\{/`.

- [ ] **Step 3: Run it to verify it fails.**
  Run (from `frontend/`): `npx vitest run src/__tests__/os/nativeCursor.test.ts`
  Expected: 4 failures.

- [ ] **Step 4: Make the deletions and edits listed under Files.** Delete the file and remove the references. Keep the reworded comments to one short sentence each. Do not change any other CSS or motion token.

- [ ] **Step 5: Run the guard test, the context-menu test, and a text search.**
  Run: `npx vitest run src/__tests__/os` then `grep -rn "os/Cursor\|cursor-none\|spring\.cursor" src`
  Expected: all tests pass, and grep prints nothing.

- [ ] **Step 6: Commit.** `git add -A frontend && git commit -m "Remove the custom cursor and use the system pointer"` (with the trailer).

---

### Task 2: Press feedback on the shared Button (DROPPED during execution)

> **Dropped:** the shared `Button` is imported only by `ui/sidebar.tsx`, which nothing imports, so this change reached no real control (the site uses about 100 hand-built `<button>` elements). It was removed instead of shipped as dead code. A press state for those buttons would need a global CSS rule and is an owner decision.

**Files:**
- Modify: `frontend/src/components/ui/button.tsx` (the base class string inside `buttonVariants`)
- Test: `frontend/src/__tests__/ui/button.test.ts` (create)

**Interfaces:**
- Consumes: `buttonVariants` exported from `@/components/ui/button` (existing, unchanged signature).
- Produces: nothing for later tasks.

- [ ] **Step 1: Write the failing test** `button.test.ts`:
  - `it('scales down while pressed')`: `buttonVariants()` contains `active:scale-[0.97]`.
  - `it('turns the press scale off under reduced motion')`: `buttonVariants()` contains `motion-reduce:active:scale-100`.
  - `it('animates transform and colors, nothing that affects layout')`: `buttonVariants()` contains `transition-[color,background-color,box-shadow,transform]` and does not contain `transition-all`.
  - `it('keeps every variant working')`: for each of `default, destructive, outline, secondary, ghost, link`, `buttonVariants({ variant })` still contains the base `inline-flex`.

- [ ] **Step 2: Run it to verify it fails.**
  Run: `npx vitest run src/__tests__/ui/button.test.ts`
  Expected: the first three tests fail, the fourth passes.

- [ ] **Step 3: Edit the base string in `buttonVariants`.** Replace `transition-colors` with `transition-[color,background-color,box-shadow,transform] duration-100`, and add `active:scale-[0.97] motion-reduce:active:scale-100`. Change nothing else in the file.

- [ ] **Step 4: Run the test to verify it passes.**
  Run: `npx vitest run src/__tests__/ui/button.test.ts`
  Expected: 4 passed.

- [ ] **Step 5: Commit.** `git add -A frontend && git commit -m "Add a CSS press state to the shared Button"` (with the trailer).

---

### Task 3: Verify in a real browser

**Files:** none changed. Screenshots go in `.context/` (gitignored).

**Interfaces:**
- Consumes: Tasks 1 and 2 merged on the branch.
- Produces: pass/fail evidence for the PR description.

- [ ] **Step 1: Install and run the automated checks.**
  Run (from `frontend/`): `npm install && npm test && npm run lint && npx tsc --noEmit && npm run build`
  Expected: every command exits 0. Report any pre-existing failure separately and do not fix it here.

- [ ] **Step 2: Start the dev server and open the site.** Run `npm run dev`, load the desktop, skip the boot animation.

- [ ] **Step 3: Check each of these by hand and record pass/fail:**
  - The system arrow is visible on the desktop and over the dock, menu bar and windows.
  - The hand cursor shows over buttons and links.
  - The I-beam shows over a text field, and the caret is visible.
  - Open Browser or Resume (PDF): one cursor only, no ring or dot, no freeze at the iframe edge.
  - Move the pointer out of the browser window and back in: no leftover element on screen.
  - Press and hold a shared `Button` (for example in Contact): it shrinks slightly, then returns on release.
  - Turn on "Reduce motion" in the OS: the same press no longer shrinks.

- [ ] **Step 4: Take two screenshots** (desktop idle, a window open over the dock) into `.context/` and list the results in the final message. If any check fails, stop and report it. Do not patch around it.

---

## Self-review

- **Spec coverage:** removal (Task 1), CSS-only feedback (Task 2), real-browser proof (Task 3). Non-goals are in Global Constraints.
- **Type consistency:** `buttonVariants` is the only interface used, with its existing signature.
- **Proportion:** the plan is longer than the diff it describes, which is expected for a deletion plus one class string, so each step is kept to one action.
