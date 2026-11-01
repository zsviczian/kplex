# Editor clipping compatibility — 2026-11-01

The three CSS clip-path declarations reported by CodeScanner are replaced with legacy rectangular
clip values on the already absolutely positioned native document and frame pseudo-element.
The shared editorOverlayClip helper converts the same viewport-area aperture to rect coordinates;
there is no editor reparenting, source/index work, shape change or toolbar clipping. Native-view
fullscreen resets clipping to auto. CSS custom property names remain internal and unchanged.

Focused checks only, as requested: 18 area/geometry tests passed, including full, cropped and empty
apertures. A real Chromium test then verified visible document hit testing, excluded document input
outside the area, reachable recovery controls outside the aperture, and fullscreen clip reset.
Touched-module lint, production build and whitespace checks pass. No clip-path declarations remain
in styles.css. No full regression or physical mobile acceptance is claimed.
