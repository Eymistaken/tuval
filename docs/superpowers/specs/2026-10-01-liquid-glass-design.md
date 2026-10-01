# Liquid glass refinement

The owner requested a stronger glassmorphism and liquid glass treatment after finding the first glass toolbar merely translucent. Their instruction to continue authorizes this focused visual refinement and the existing GitHub/Netlify publication workflow.

Keep the full-screen canvas, draggable anchor, horizontal/vertical toolbar, animations, readable SVG color samples, right-mouse eraser, and touch/stylus behavior. Use a clearer glass surface, rounded refractive edges, layered specular highlights, and a fine dark lower rim. Neutral white paper stays unchanged.

Render only the visible toolbar or pen button's local canvas backdrop into a noninteractive decorative canvas. An inline SVG displacement filter bends this backdrop along the rounded glass edge. This uses ordinary SVG image filtering rather than browser-dependent SVG backdrop filters. Generate the lens map only when geometry changes; update the small backdrop on drawing renders and placement changes, coalesced by animation frames. No continuous animation or full-screen image encoding. Decorative layers do not enter drawings, history, persistence, or PNG exports.

Use CSS backdrop blur and a restrained translucent tint behind the refracted layer. Keep dialogs more opaque for reading. Reduced transparency and forced colors use the existing solid surfaces and disable the extra rendering; reduced motion retains immediate toolbar toggles. Every glass layer ignores pointer events and is hidden from assistive technology.

Verify lens symmetry and neutral center values, actual displaced image output in Chromium and iPad WebKit, update after drawing/undo/moving, unchanged exported pixels, readable controls over dark artwork, and all existing input, accessibility, layout, and storage tests. Review desktop and phone screenshots before publishing.
