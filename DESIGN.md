# Tuval design system

## Physical scene

Someone sketching at a desk or holding a tablet near a window in daylight, moving between ideas and notes. Light paper and calm, warm studio chrome keep drawings readable without competing with them.

## Color strategy

Restrained warm neutrals with a forest-green accent for selection and primary actions. CSS uses OKLCH for chrome; literal drawing colors remain sRGB for predictable PNG output.

- Paper: white drawing background.
- Studio: warm off-white, oklch(0.96 0.006 85).
- Ink: oklch(0.24 0.018 155).
- Muted text: oklch(0.48 0.012 155).
- Accent: oklch(0.4 0.07 160).
- Selected surface: oklch(0.92 0.025 155).
- Destructive actions: dark brick red.

## Typography

A native sans-serif family for compact tool labels, controls, and document metadata. The lowercase Tuval wordmark has tight letter spacing and a strong weight. Use fixed rem sizes with clear weight contrast.

## Layout

A compact studio header, large bounded drawing workspace, and a bottom dock. Tool names are visible. Drawing tools, color controls, and brush settings form three clear groups. On narrow screens, the tool row scrolls with explicit previous/next controls and starts at the first tool. Settings wrap into a second row, never beyond the viewport. Safe-area insets apply to fixed controls. The dock collapses to a draggable button that stays inside the viewport.

## Components

Outlined 24-pixel SVG icons use consistent rounded caps and joins. Tool targets are at least 44 pixels in each direction. Selected tools use a tinted background and forest-green stroke. Focus has a distinct outline. Inputs use native keyboard behavior and 16-pixel text on mobile. Color swatches have accessible names and a selection ring. Dialogs use native focus containment and explicit close controls.

## Motion

State transitions last 160 milliseconds and use ease-out. No layout animations. Reduced-motion settings disable transitions.
