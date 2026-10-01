# ADR-001: Retain Canvas 2D and use browser-native modules

## Status

Accepted

## Date

2026-10-01

## Context

The original application combines markup, styling, drawing tools, pointer handling, and persistence in one HTML file. Its centered overflowing toolbar hides controls; line-to-line pen drawing creates angular strokes; touch-end handling reads an empty touches list. Resize clears and then asynchronously restores the displayed canvas, which can crop artwork and race with new strokes.

## Decision

Keep Canvas 2D and split the app into focused JavaScript modules, built with Vite. Store artwork in a separate retained document canvas. The full-screen presentation canvas displays the visible region at logical scale; the retained document expands when the viewport needs more room and never shrinks. Handle input with one captured pointer and quadratic midpoint curves. Use a preview layer to apply opacity once per committed stroke. Keep synchronous bounded history, and save PNG bytes asynchronously in IndexedDB with logical document dimensions.

Store the PNG as an ArrayBuffer because WebKit can reject Blob preparation in IndexedDB. Reconstruct a Blob when loading artwork and continue accepting earlier Blob records. Capture the image bytes before opening the write transaction, and serialize saves to preserve drawing order.

## Alternatives considered

Extracting the existing inline script and styles would improve file organization but preserve unreliable input and resize behavior. Rewriting the interface with React would add runtime weight and a second state model without benefiting Canvas rendering. Both alternatives were rejected for this scope.

## Consequences

There are no runtime dependencies, and drawing primitives can be tested independently. The complete document survives rotation and viewport changes without stretching. PNG export includes regions outside the current viewport; history snapshots retain logical dimensions for restoration after expansion. Translucent strokes are uniform, and canceled operations do not enter history. Memory bounds reduce the number of undo entries on large documents. A very long freehand stroke still requires preview redraws, batched once per animation frame.

Legacy localStorage migration requires the same browser origin. The new public address cannot read drawings saved by a standalone local HTML file. PNG export provides a portable copy of new drawings.

Liquid glass is a presentation layer owned by `ui/glass.js`. The engine's optional `onRender` callback schedules small local backdrop copies after drawing previews and history changes; it does not signal a saved-document change. Inline SVG displacement filters refract these decorative canvases across Chromium and WebKit. Geometry maps are regenerated only for size/radius changes, with no continuous render loop. Reduced-transparency and forced-color settings disable the effect. Decorative canvases never enter retained artwork, history, or PNG exports.
