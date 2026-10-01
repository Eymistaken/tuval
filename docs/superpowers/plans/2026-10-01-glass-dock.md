# Glass Dock Implementation Plan

> **For agentic workers:** Execute this focused update inline with regression checks and a final source review. Steps use checkbox syntax.

**Goal:** Restore animated liquid glass controls at the dragged button location and add mouse-only right-button erasing.

**Architecture:** Keep rendering/storage contracts. Move toolbar positioning, dragging, and motion into `src/ui/dock.js`, with pure geometry in `src/ui/dock-geometry.js`. Tool selection remains in `toolbar.js`. Pointer input accepts and owns the initiating mouse button; the engine overrides only that operation's tool.

**Tech Stack:** Native JavaScript, Canvas 2D, Pointer Events, CSS backdrop filters, Web Animations API, Node tests, Playwright, axe.

- [x] Reproduce opening at the wrong location and ignored right-button erasing with failing browser cases before implementing the fix.
- [x] Add geometry tests for side/top/bottom orientation, boundary clamping; verify button/panel transforms in browser motion tests.
- [x] Implement `dock.js`: shared anchor, safe bounds, pointer capture, canceled-drag handling, bounded placement, transition cancellation, focus/inert management, and reduced-motion handling. Use `dock-geometry.js` for placement and transform calculations.
- [x] Integrate the controller into `toolbar.js`; adapt scroll offsets, overflow measurement, accessible orientation, and keyboard navigation to the panel orientation. Keep every drawing tool and canvas action.
- [x] Update `studio.css` with translucent glass, readable controls, a bounded vertical layout, short-screen scrolling, and forced-color/reduced-transparency fallbacks. Keep the full-screen canvas and existing palette fix.
- [x] Update `input.js` and `canvas.js`: accept right-button mouse starts, stop on initiating-button release, suppress only mouse context menus, and use an operation-local eraser with a temporary cursor. Keep touch and stylus branches intact.
- [x] Verify physical mouse/right-button sequences, CDP touch dragging/drawing, stylus cancellation, vertical tool/action reachability, morph reversal, rotation, reduced motion, and old feature tests. Run `FONTCONFIG_FILE=/tmp/tuval-fonts.conf npm run check`, audit, and `git diff --check`.
- [x] Inspect desktop/mobile glass screenshots, review the source, and update `DESIGN.md`, `PRODUCT.md`, and `README.md` for the restored interaction.
- [ ] Commit verified changes, push `Eymistaken/tuval`, deploy site `8a72e6a5-d667-493d-9e25-626298bd5bfc`, and check the exact live URL plus browser tests and GitHub CI.

## Local verification

`FONTCONFIG_FILE=/tmp/tuval-fonts.conf npm run check` passed: syntax/spelling checks, 17 unit tests, production build, and 59 desktop/phone/iPad Safari browser tests. `npm audit --audit-level=high` reported zero vulnerabilities. Desktop and phone screenshots confirmed readable glass over artwork. Source review covered correctness, module boundaries, input ownership, animation cancellation, accessibility, dependencies, and bounded rendering.
