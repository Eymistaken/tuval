# Contributing to Tuval

Keep the drawing surface fast and the controls reachable. Changes should preserve all existing tools and saved artwork.

1. Create a branch from `main` and install dependencies with `npm ci --ignore-scripts`.
2. Keep rendering, input, storage, and UI changes in their owning modules.
3. Add regression coverage for drawing behavior or data-loss fixes. Use a failing reproduction before changing the implementation.
4. Run `npm run check` and `npm audit --audit-level=high`.
5. Check a narrow touchscreen layout and the desktop layout. Make sure every tool is reachable, focus is visible, and canceled input leaves no stuck stroke.
6. Open a pull request explaining the behavior change and verification.

Use American English in identifiers, comments, documentation, and interface text. Never rename serialized storage fields without a migration. Commit the npm lockfile, keep secrets out of source, and use maintained dependencies only when a browser API cannot reasonably do the job.

Report bugs with the browser version, device/input type, viewport or orientation, exact steps, and expected behavior. Include a screenshot when it helps, without private artwork.
