# Minimal full-screen canvas

## Direction

The owner explicitly requested the original full-screen workflow after reviewing the studio: remove the header, wordmark, document name, headings, and empty-state copy. Keep one compact floating toolbar at the bottom, including Save PNG. Retain all nine tools, smooth strokes, touch input, color controls, settings, undo, redo, clear, collapse, drag, autosave, and shortcuts. This revision supersedes the studio layout in the earlier approved design.

## Layout and input

The white drawing surface fills the viewport. A pill-shaped toolbar overlays it without reserving page space. Desktop uses a single icon-only row; narrow screens use three compact rows for tools, colors/size, and actions. Tools scroll with explicit arrows when needed. Controls remain at least 44 pixels and inside safe-area bounds. Tooltips and accessible names identify icons. Help remains available from the action row.

The retained drawing document grows when the viewport needs more space and never shrinks. The presentation canvas displays the visible document at its natural logical scale from the top-left. Rotation does not stretch artwork, remove older drawing regions, or disable drawing in newly exposed space. PNG export includes the full retained document. Undo snapshots retain their logical dimensions so earlier strokes remain recoverable after expansion.

## Color visibility

The reported hollow swatches reproduce under forced colors: CSS background fills become the same system background. Paint actual swatch colors with SVG fills and disable forced color adjustment only on color samples and the color-selection surface. Controls and focus outlines keep the system contrast behavior. Existing preset values and storage keys remain intact.

## Verification and publication

Check full-screen bounds, color visibility under forced colors, all tools at 320–1440 pixels, bottom-bar export, rotation, newly exposed drawing regions, undo/redo, persistence, and accessibility. Run the complete production suite and review the focused changes before committing. Push to the existing public repository and update the existing tuvall Netlify project.
