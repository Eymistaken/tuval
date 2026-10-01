# Anchored glass toolbar and temporary mouse eraser

The owner explicitly requested the original liquid glass appearance, animated expansion/collapse, and a toolbar that opens at the dragged pen button. The subsequent correction requests **right**, not left, mouse dragging as a temporary eraser. Keep the full-screen canvas, current tools, local artwork, and PNG export.

## Toolbar

Use translucent neutral glass, backdrop blur/saturation, a thin highlight, and a restrained shadow. This deliberately restores the owner's requested glass treatment. Share one anchor between the collapsed pen button and the expanded toolbar. Open horizontally near the top/bottom or center; open vertically near the left/right sides. Clamp both forms to safe viewport bounds without discarding the chosen anchor. Recompute bounds on rotation. The initial toolbar remains open at the bottom.

Morph from the button's actual bounds into the toolbar over roughly 360 milliseconds using transform/opacity animations. Fade tool content independently to avoid stretched icons. Reverse the motion to the same button location when closing. Finish interrupted transitions consistently, prevent hidden content from receiving focus, and open the selected tool for keyboard users. Reduced-motion settings switch immediately.

Horizontal tool overflow keeps its existing arrows. Vertical tools scroll up/down; shorter screens can scroll the whole vertical panel to reach colors, size, and every action. All targets remain at least 44 pixels. Preserve actual drawing-color samples and high-contrast support.

## Right-button eraser

Accept mouse buttons 0 and 2, ignoring the middle button. Button 2 captures a white eraser operation using the existing brush size. Do not change the selected tool or persisted settings. Release commits one undoable stroke; cancellation discards it. Suppress the mouse context menu on the drawing canvas. Touch and stylus input continue using their selected tool and existing extra-pointer/cancellation rules. Releasing the initiating mouse button ends the operation even if another button remains pressed.

## Verification

Reproduce the fixed-bottom behavior and ignored right drag before implementation. Cover anchor/orientation bounds, mouse and touch dragging, every tool/action in vertical layouts, animation interruption, reduced motion, resize, erasing/history, and unchanged finger/stylus drawing. Inspect glass over actual artwork, run the complete production suite, push the existing public repository, and deploy the existing tuvall Netlify project.
