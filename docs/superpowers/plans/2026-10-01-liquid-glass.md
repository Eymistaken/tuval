# Liquid Glass Implementation Plan

> **For agentic workers:** Execute this focused refinement inline; reuse the existing verification and publication workflow.

**Goal:** Give the toolbar and collapsed button visible glassmorphism and real rounded-edge refraction.

**Architecture:** `src/ui/glass-lens.js` computes a bounded displacement map. `src/ui/glass.js` owns decorative backdrop canvases, SVG filters, geometry invalidation, and render scheduling. An optional engine `onRender` callback refreshes presentation independently from saved document state. CSS supplies tint, highlights, rim, and accessibility fallbacks.

**Tech Stack:** Native Canvas 2D, inline SVG filters, CSS gradients, existing Node/Playwright tests. No added dependencies.

- [x] Implement `createLensMap(width, height, radius, padding)` with a neutral center and a smooth inward edge lens; verify mirrored channels and bounded displacements in `tests/unit/glass.test.js`.
- [x] Implement `createGlass(canvas)` for `#dock` and `#dock-orb`. Append decorative canvases and inline filter definitions, crop only the local visible canvas region, cache maps by dimensions/radius, and coalesce updates. Observe size/placement/visibility; disable rendering under forced colors or reduced transparency.
- [x] Add an optional `onRender` callback to `src/engine/canvas.js`; connect it in `src/main.js` without changing save/export callbacks.
- [x] Refine `src/styles/studio.css` with a clear tint, layered edge highlights, clipped noninteractive refraction, subtle pointer-lit sheen, and stable contrast. Preserve layouts and control dimensions.
- [x] Extend browser checks in `tests/e2e/dock.spec.js` and `tests/e2e/safari.spec.js`: render a high-contrast backdrop fixture, confirm displacement/update and no artwork mutation, and check fallback visibility.
- [x] Inspect desktop/phone screenshots over light and dark artwork. Run `FONTCONFIG_FILE=/tmp/tuval-fonts.conf npm run check`, `npm audit --audit-level=high`, and `git diff --check`; review changes and update `DESIGN.md`/README.
- [ ] Commit, push the public repository, deploy the existing tuvall site, and verify the exact live assets, browser checks, and GitHub CI.

## Local verification

The complete source checks, 19 unit tests, production build, and 63 browser tests passed. Chromium and iPad WebKit screenshot comparisons confirmed displacement with the lens enabled versus zero displacement while keeping blur/saturation unchanged. Drawing/history updates, unmodified export pixels, forced colors, and reduced transparency passed. Desktop/phone visual review verified readable controls over artwork; a repeated-update check reused lens maps with zero PNG encoding. Dependency audit reported zero vulnerabilities. Source review covered input isolation, bounded geometry, presentation/document separation, accessibility, and render scheduling.
