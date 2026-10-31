# Canvas image export — native feasibility gate

Investigation on the existing PR #238 branch after merging #237 and refreshing from main (`f99aa39`). No image-export implementation was committed before these native experiments.

## Proven approach

Clone the existing rendered HTML/SVG and its computed styles into a detached, self-contained SVG `foreignObject`, inline loaded bitmap pixels and local font-face resources, then let Chromium rasterize it to PNG. This uses the existing browser renderer and committed geometry, with no second graph projection, node renderer or layout engine. SVG image contexts require resources to be inlined; see [SVG as an image](https://developer.mozilla.org/en-US/docs/Web/SVG/Guides/SVG_as_an_image) and [foreignObject](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/foreignObject).

The native scratch probe ran in Obsidian 1.15.0 / installer1.14.0, Node22.22.2, macOS Darwin23.5.0, disposable `kplex-test-small`, using the exact verified #237 artifact (`main.js` SHA256 `d001afb29c6e949731b6825f90f0ca3bad5168f6152f92d82d41621070345c7e`). It created owned synthetic notes, used real K-Plex canvases and the production wheel zoom handler, then restored settings, views, sessions and files. Cleanup passed.

- Initial native sample: Compass, Mind Map and Facets at50/100/200%, both camera viewport and whole canvas bounds:18 PNGs produced. Fonts, HTML cards, SVG connectors/markers/captions and Facets guides/regions rendered. Cameras were unchanged by capture.
- Extended sample: all three views, light/dark native CSS themes, all three zooms, both scopes:36 PNGs produced, each with a loaded real node thumbnail, three inlined local font rules and no resource warnings. Whole Mind Map includes a deep-branch card outside the camera viewport. Whole Facets includes its off-camera regions and diagnostics.
- Direct native screenshot comparison, normalized from Retina2x to export1x and excluding outer controls:17/18 cases have mean RGB error below1.2/255 and fewer than0.57% pixels above30/255 mean-channel difference. The remaining case sampled the previous2x camera paint before the new0.5x paint, while DOM capture correctly used0.5x. This is not evidence of an export geometry mismatch. Native screenshots must be sampled after paint catches up; animation-frame delivery alone is not paint acceptance.
- A follow-up screenshot-timing probe hit the15-second CLI transport deadline after22 successful captures; cleanup passed and the host remained responsive with zero owned fixtures/controllers left. The original synchronous scratch cloner is not suitable for production. The implementation must yield bounded batches, bound element/string/font/pixel memory, retire image/canvas resources and abort stale captures.

Local experiment receipts and PNGs are in `/private/tmp/kplex-image-native-proof-1`, `...-2`, `...-3`, and `/private/tmp/kplex-image-pixel-comparison`. These prove feasibility, not completed feature acceptance. Final implementation needs its own exact-build UI, lifecycle, zero-source-work and resource-bound validation.

## Scope and limits

Whole canvas means the existing painted canvas beyond the camera viewport. Bounded scrolling areas retain their current visible clip and scroll position; rows hidden inside those areas are not unrolled. Unrolling would require a different layout and recomputed clipped connectors. The UI must disclose this limit and keep viewport scope explicitly separate. Neither scope expands collapsed/filtered branches.

The production service must reuse the existing Compass polygon helper when extending tint to export bounds. It must preserve SVG fragment references, pseudo-elements, fonts, loaded images and actual scroll offsets. Opaque iframe/webview/media content, unavailable fonts and tainted/not-yet-decoded images require explicit warnings. No remote resource fetch is permitted. Only PNG pixels leave the capture service; no hidden HTML or vault metadata is embedded in the output.

Native editor, selection, camera, navigation, all canvas sessions and popout ownership must remain untouched. The feature must remain a reusable internal service for future API work, with no public API implementation here.
