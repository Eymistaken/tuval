# Tuval production design

## Outcome
Turn the existing personal drawing canvas into a maintained public project and publish it at exactly https://tuvall.netlify.app. Preserve all nine tools and existing workflows while fixing inaccessible toolbar controls, angular freehand strokes, and unreliable touch input.

## Architecture
Use Vite with browser-native JavaScript modules and Canvas 2D. Separate canvas rendering, pointer input, tools, history, persistence, color conversion, and interface controls. Keep the original single-file application in a legacy folder as a reference. Avoid a framework migration because rendering already belongs to Canvas rather than a component tree.

## Interface
A quiet drawing studio with a large white drawing surface, warm neutral chrome, dark ink, and a restrained green selection accent. A consistent set of outlined SVG icons has explicit accessible names and visible tool names. Desktop and tablet controls adapt to available width; mobile tools use a bounded scrolling row with edge navigation. No centered overflowing flex content or controls outside the viewport. Minimum 44-pixel targets, safe-area spacing, keyboard focus, and reduced-motion support. A collapsible, movable tool dock remains available.

## Feature preservation
Preserve pen, marker, spray, rectangle, circle, line, text, fill, and eraser; preset and custom colors; HEX and RGB input; alpha selection; brush sizes from 1 through 50; undo, redo, clear confirmation; and local autosave. Preserve the legacy smartCanvas_img storage key through migration rather than renaming it silently. Add PNG export so a completed drawing can be saved outside the browser.

## Drawing and touch
Use Pointer Events and pointer capture for mouse, touch, and stylus. Track the active pointer, process coalesced samples, and safely finalize canceled input. Smooth freehand samples through midpoint quadratic curves, round caps, and a final endpoint segment. Render translucent strokes on a preview layer to avoid opacity buildup at segment overlaps. Stylus pressure can be enabled; finger drawing can be disabled for pen-only use. Ignore additional pointers during a stroke. Canvas resolution accounts for display density. Resizing and device rotation preserve the complete drawing rather than permanently cropping it.

## State and persistence
History changes only after committed operations, including text and fill. Undo and redo restore synchronously to prevent async ordering races. Bound history memory and handle storage failure with visible status. Use IndexedDB for asynchronous image persistence and read the legacy localStorage snapshot when no newer drawing exists. Keep image dimensions with saved content. All artwork stays on the device.

## Validation
Unit-test stroke geometry, color parsing, flood fill, and history transitions. Browser tests cover all nine tools, drawing and undo/redo, custom color and alpha, export, clear, reload persistence, narrow viewport reachability, real touch events, pointer cancellation, stylus/multitouch behavior, and rotation. Run a production build and test its preview. Inspect desktop and mobile screenshots and run accessibility checks. Verify the public repository and production URL after publishing.

## Publishing
Create the public Eymistaken/tuval repository with source, lockfile, README, contribution instructions, CI, and deployment configuration. Use the connected Netlify Optimsors team, create or locate the tuvall project, deploy the verified production assets, and confirm the exact URL. If the requested name is unavailable, report the conflict without silently substituting a different address.
