# Tuval design system

## Physical scene

Someone opens a canvas to sketch immediately on a laptop or touchscreen. White paper fills the screen; a small floating toolbar provides the controls without competing with the drawing.

## Color strategy

Use translucent neutral glass with a fine highlight, backdrop blur, and a blue accent for the selected tool and focus. Reduced-transparency and forced-color settings use solid surfaces. Chrome uses OKLCH; drawing colors remain literal sRGB for predictable PNG output. SVG color samples preserve their actual fills under forced colors. The canvas, samples, and color-selection surface keep their drawing colors while other controls respect system contrast settings.

## Typography

Use the native sans-serif family for dialog content, tooltips, and the small brush-size value. The main drawing surface has no wordmark, document name, headings, labels, or empty-state prose.

## Layout

The canvas fills the viewport with no frame or reserved toolbar space. The glass toolbar starts at the bottom safe edge. Collapsing reveals a draggable round pen button; the toolbar shares its anchor and opens there. Near side edges it uses a narrow vertical layout; near the top or bottom it uses horizontal rows. Placement stays inside safe viewport bounds during resizing. Scroll arrows keep every drawing tool reachable; short vertical panels also scroll their controls. Save PNG, Undo, Redo, Clear, Help, and Collapse stay in the toolbar.

## Components

Outlined 24-pixel SVG icons use consistent rounded caps and joins. Every action has an accessible name and tooltip; touch targets are at least 44 pixels. Tool selection uses a blue circle and a visible outline under forced colors. Color samples have accessible names and selection rings. Brush settings, custom colors, clear confirmation, and shortcuts use native dialogs with explicit close controls. Autosave status is announced without permanent visual text; storage errors remain visible.

## Motion

Hover transitions last 120 milliseconds. Expanding and collapsing morph between button and panel bounds over 360 milliseconds with transform and opacity; tool content fades separately. Interrupted transitions cancel cleanly. Reduced-motion settings switch immediately.
