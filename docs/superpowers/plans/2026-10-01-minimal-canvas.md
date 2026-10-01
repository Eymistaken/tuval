# Minimal Canvas Implementation Plan

> **For agentic workers:** Execute this focused revision inline, task by task. Use checkbox syntax to record completion; independently inspect the final diff before publishing.

**Goal:** Restore the original fast full-screen workflow, fix hidden color fills, and keep PNG export in the floating bottom toolbar.

**Architecture:** Keep native JavaScript modules and existing drawing/storage APIs. Replace studio chrome with an overlay toolbar. Retain the document at logical scale and expand it without shrinking saved content; snapshot metadata preserves undo coordinates.

**Tech Stack:** Canvas 2D, SVG, Pointer Events, Vite, Node tests, Playwright, axe.

## Task 1: Reproduce the reported issues

- [x] Add browser assertions that the canvas starts at `(0, 0)` and fills the viewport, no header/name/hint is rendered, and all actions including PNG export belong to the bottom dock.
- [x] Add forced-colors regression coverage for distinct literal swatch fills. Verify the existing version fails these cases with `TUVAL_BASE_URL=http://127.0.0.1:5173 npx playwright test --project=desktop --grep 'full-screen|literal palette'`.

## Task 2: Implement the minimal surface

- [x] Modify `index.html`: delete the header and workspace decoration, move history/clear/export/help into the dock, remove section headings and tool-name text, and retain status/dimensions for assistive feedback. Keep IDs used by wiring and dialogs.
- [x] Modify `src/styles/studio.css`: make the workspace and viewport fill `100dvh`, float the pill dock at the safe bottom edge, use a single desktop row and three mobile rows, preserve focus and 44-pixel hit targets, and remove orphaned studio styles.
- [x] Modify `src/ui/toolbar.js`: render literal SVG color circles, keep named icon-only tools, move collapse to the actions group, and calculate tool overflow from navigation width without assuming collapse shares that row.
- [x] Modify `src/main.js`: remove hint wiring, keep dimensions updated after document growth, and show autosave failures as a small overlay while ordinary status remains visually hidden.
- [x] Modify `src/engine/canvas.js` and `src/engine/history.js`: expand the retained document when required, render the visible viewport at logical scale, record snapshot dimensions, and clear/pad before restoring older snapshots. Keep expansion outside undo history and preserve all previous pixels.

## Task 3: Verify and publish

- [x] Update browser rotation assertions for a document that can grow. Check drawing at viewport edges, expansion, restoration of older history, complete PNG exports, and literal color fills under forced colors. Run `FONTCONFIG_FILE=/tmp/tuval-fonts.conf npm run check` and `npm audit --audit-level=high`.
- [x] Inspect desktop/mobile screenshots and review correctness, accessibility, security, simplicity, and performance in the final diff. Update `DESIGN.md`, `PRODUCT.md`, `README.md`, the architecture decision, and the repository screenshot to describe the minimal surface.
- [ ] Run `git diff --check`, commit with American English, push to `main`, and deploy the existing Netlify site `8a72e6a5-d667-493d-9e25-626298bd5bfc`.
- [ ] Check the exact live URL, deployment readiness, production browser tests, and GitHub CI before returning the published result.

## Local verification

The complete production check passed: 13 unit tests and 43 browser tests across desktop Chromium, phone Chromium, and iPad WebKit. The color and full-screen regressions failed before the implementation. Coverage includes forced colors, every tool at 320–1440 pixels, viewport expansion with a device-pixel-ratio change, undo/redo after expansion, and a deliberately delayed PNG encoding during resize. Axe found no WCAG AA violations in the main interface or dialogs. Dependency audit reported zero vulnerabilities. Desktop, phone, small-phone, and forced-color screenshots were inspected. The final source review found no required correctness, security, or architecture issues after the narrow-tablet layout adjustment.
