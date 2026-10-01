# Tuval design system

## Physical scene

Someone opens a canvas to sketch immediately on a laptop or touchscreen. White paper fills the screen; a small floating toolbar provides the controls without competing with the drawing.

## Color strategy

Use neutral toolbar surfaces with a blue accent for the selected tool and focus. Chrome uses OKLCH; drawing colors remain literal sRGB for predictable PNG output. SVG color samples preserve their actual fills under forced colors. The canvas, samples, and color-selection surface keep their drawing colors while other controls respect system contrast settings.

## Typography

Use the native sans-serif family for dialog content, tooltips, and the small brush-size value. The main drawing surface has no wordmark, document name, headings, labels, or empty-state prose.

## Layout

The canvas fills the viewport with no frame or reserved toolbar space. A pill-shaped toolbar floats at the bottom safe edge. Desktop uses one icon-only row. Smaller screens use a tool row followed by color/brush controls and actions. Scroll arrows keep every drawing tool reachable. Save PNG, Undo, Redo, Clear, Help, and Collapse share the bottom toolbar. Collapsing reveals a draggable round pen button.

## Components

Outlined 24-pixel SVG icons use consistent rounded caps and joins. Every action has an accessible name and tooltip; touch targets are at least 44 pixels. Tool selection uses a blue circle and a visible outline under forced colors. Color samples have accessible names and selection rings. Brush settings, custom colors, clear confirmation, and shortcuts use native dialogs with explicit close controls. Autosave status is announced without permanent visual text; storage errors remain visible.

## Motion

State transitions last 120 milliseconds and use ease-out. No layout animation or introductory sequence. Reduced-motion settings disable transitions.
