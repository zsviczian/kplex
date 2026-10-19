# Label sharpness investigation (#149 / #115)

## Follow-up: scrolling and expanded outlines

The maintainer supplied adjacent blurry/sharp scroll-position screenshots, then reported the
same delayed sharpness in long expanded heading trees without scrollbars. The previous no-go
below covered navigation/idle timing with three notes, not this overflow/zoom discriminator.
Main including #162 (`76224fb`) is integrated normally at `d0a7c73`; no history is rewritten.

Actual Windows native controls now reproduce retained low-resolution text at graph zoom 1.25.
At the same scroll offset and camera matrix, temporarily changing the camera's permanent
`will-change: transform` to `auto` visibly sharpens the text. This does not change fonts, layout,
scroll position or graph state. Subsequent position/layer controls run after rerasterization and
are **not independent causal evidence**; they do not justify scroll snapping or per-node layers.
Chrome documents this [transform-scale raster policy](https://developer.chrome.com/blog/re-rastering-composite).
The source documentation supports the mechanism; the native captures establish its relevance here.

The candidate removes only that permanent hint from `.kplex-camera`. The existing 2D transform,
frame coalescing, native scrolling, animation lifetimes, pointer coordinates and untransformed
embedded surfaces remain owned by their existing code. No font smoothing, forced GPU layers,
CSS zoom replacement, offset rounding, scheduler, source or indexing change is introduced.
The existing touch-specific `will-change:auto` remains compatible.

The real-CSS camera regression fails on the original hint and passes after removal. It also
checks unrounded native scroll, section geometry, zoom and idle motion at scales 1/1.25/.83/2/1;
it is geometry/state coverage, not a GPU sharpness test. The full focused motion/fit/typography/
Wander/native-theme group passes **47 cases**, Node 22.22.3.

Native candidate captures show sharper scroll labels at offsets 100–105 and cover a long
eight-heading expanded outline with **no native scroll area**, zoom, actual middle-button pan
and delayed idle samples. The first immediate-after-stage run captured all 25 samples but failed
the shared driver's enablement-byte guard; it is **excluded from acceptance**. The earlier first
fixture also failed to overflow because the saved device profile overrode its column count;
the fixture now sets its own cloned profile explicitly. Failed runs and originals are retained.
The unchanged-runtime retry and the separate owning-popout replay each complete **25 samples**,
including the unscrolled outline, with settings/enablement cleanup passing.

Final full verification and exact-artifact main/popout replay are pending. No merge recommendation
or universal sharpness/performance claim follows until those checks finish. Fractional pixel
antialiasing and temporary motion interpolation remain normal; macOS, other physical display
scaling/GPU configurations and physical mobile need separate observation.
The quality trade-off is allowing raster work during scale changes. No comparative CPU/GPU,
memory, frame-time or indexing-performance benefit is claimed.

## Earlier bounded investigation (preserved)

### Decision at that checkpoint

**No runtime fix justified on this host. Keep #149 draft and #115 open.** The
reported persistent blur is not reproduced; normal temporary softness during
intentional scale animation is visible. Removing motion globally, forcing raster
layers or changing fonts would be speculative and risks navigation/mobile behavior.

Existing branch integrated main `b4c144a` normally at `44e6103`. Source/runtime is
identical to that main; only the old plan marker existed before this investigation.
No rendering, indexing, settings, dependency or note-format change is delivered.

## Actual native observations

Two bounded probes in authorized `kplex-test-small`, with three owned linked
Markdown fixtures each: **24 main-window samples and 26 popout samples**, each
paired with a native screenshot. No personal vault or comparative performance run.

- Windows, Obsidian **1.14.4 / installer 1.14.0**, Electron **43.3.0**,
  Chromium **150.0.7871.212**, hardware acceleration enabled.
- Display **2560 × 1440**, OS scaling **100%**, device pixel ratio **1**, host zoom
  **1**. Main content **1560 × 1195**, popout **1024 × 800**, same display/DPI.
- Plex zoom **1** and **0.83**, animation speed **1** and **0** independently.
  Navigation samples at nominal **0, 100, 600, 1500 and 5000 ms**; capture/IPC
  add overhead, so these are observation points, not exact paint deadlines.
- At speed 1, the center has an interpolated transform initially and at 100 ms.
  At every 600 ms and later sample, its computed transform is `none`, camera
  matrix stays constant, and no running graph animation remains. Idle screenshots
  are readable and show no delayed sharpening between 1.5 and 5 seconds.
- Speed 0 has no center animation transform at the initial sample. An idle-only,
  reversible `will-change:auto` discrimination does not establish an improvement
  over the normal retained `will-change:transform` camera on either view.
- Eight interrupted popout navigations at 50 ms intervals, then settlement, and
  a resize both leave no running animation or center transform. The camera
  remains at the intended fractional scale. This does not cover another GPU/DPI.

The camera's intentional CSS opacity animation has finite transition ownership.
`ElementMotion` already uses `fill:none`, replacement cancellation and exact
completion ownership. Two finished non-running effects elsewhere in the main
surface do not establish a stale center transform or persistent text defect.

Fresh-source read/parse counters stay zero during the sampled visual controls;
fixture repairs remain constant across navigation/zoom samples (3 main, 6 popout).
Fixture creation/cleanup itself changes the disposable index. No whole-trial
zero-work or speedup claim follows from this cosmetic investigation.

## Checks and evidence

Node **22.22.2**, actual dependencies; existing `element-motion`, `viewport-fit`,
`typography-preferences` and `wander` suites: **44 pass / 0 fail / 0 skip**.
No full verification repeated for documentation-only changes. The native artifact
is the previously full-verified and staged runtime, main.js SHA-256
`2c6dce74c2930ec435ff23caa88de9fd8e231f4cc98f4d967dbe52a7990eeaea`.

Private raw roots: `%TEMP%/kplex-149-native-1792368414132` and
`%TEMP%/kplex-149-popout-1792368519691`. Each retains its actual driver source,
artifact identities, scalar observations and PNGs. Focused log:
`%TEMP%/kplex-149-focused.log`. Verified private durable-copy receipt:
`%TEMP%/kplex-149-private-receipt.json`. Durable directory:
`%LOCALAPPDATA%/KplexValidation/label-sharpness-149-1792368625870`,
**61 files / 3,485,875 bytes**, manifest SHA-256
`96103479422aa74dee078abf41b4764a7cc33d7890a867c19a881e7a41e26e5f`;
originals retained, nothing published.
Screenshots are visual evidence, not universal sharpness hashes or performance
tests. All owned fixture files, popout and test globals are removed; configuration
bytes/workspace/follow owners restored. Vault returns to **107 files / 88 Markdown**.

## Required discriminator before a fix

Obtain the affected OS/device, Obsidian/K-Plex version, display scaling/DPR,
Plex zoom, duration and a recording distinguishing active navigation from idle
blur. Repeat the same label at 100% and fractional zoom, animation off/on, while
capturing center/camera transforms and active effects. A second-DPI display,
macOS and physical phone/tablet remain untested. No additional user workaround
or global GPU change is prescribed. Continue #176 independently; do not claim
this investigation closes #115.
