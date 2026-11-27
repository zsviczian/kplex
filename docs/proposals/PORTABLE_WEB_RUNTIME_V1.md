# K-Plex Web — PR 1: regression-first portable Compass runtime

**Status:** specification-only draft; no production changes or validation results.
**Author:** Zsolt's Codex Agent. Initial accepted main: `270c2da3a0bd62f05815426cf4cd0a65ee82b160`.
The maintainer wants an independent visual knowledge navigation engine; Obsidian is its first authoring environment. This PR is a feasibility and regression-safety gate, not a publisher. Read the companion [overall proposal](KPLEX_WEB_PUBLISH_PROPOSAL.md) for accepted product scope.

## 1. Non-negotiable workflow

- [ ] Refresh and normally integrate latest accepted main into this draft branch; inspect open PRs, AGENTS.md, CONTRIBUTING.md, CODING_STANDARDS.md, UI_RULES.md, docs/ARCHITECTURE.md, docs/VALIDATION_ARTIFACTS.md and docs/AGENT_WORKFLOW.md. Follow the exact Node, native disposable-vault, validation-retention, architecture and scanner contracts.
- [ ] Inventory actual rendering, graph reads, styling, geometry, measurement, hit testing, camera, action dispatch, editor/Sidecar, focus, lifecycle and export owners. Map every proposed dependency to its current owner and affected caller/test. Trace imports transitively, including type-only imports.
- [ ] **Before any production code changes**, implement and run the missing characterization tests and benchmark harness against unchanged production source on the refreshed main baseline. Test-only files, fixture additions, test tooling and documentation are allowed. No production instrumentation changes to obtain the baseline: use existing diagnostics, public scene/API and externally installed test observers. If these cannot provide adequate evidence, stop and propose the narrowest separately reviewed instrumentation.
- [ ] Save the test-only checkpoint (including executable fixtures, harness and documented commands); pin the exact baseline source and artifact hashes, retain actual baseline evidence under the managed validation directory, and summarize it in this PR. Both behavior AND performance must be measured before extraction. If a critical baseline is failing, unstable, incomplete, or unavailable, **stop before editing the renderer** and report the blocker. Do not use candidate output to define the baseline.
- [ ] Perform the smallest behavior-preserving extractions in individually testable steps. Re-run focused gates after each; keep native composition and effects native. If the extraction requires a wide rewrite or changes graph/index ownership, stop and propose a narrower alternative.
- [ ] Deliver a separate browser build with a standalone read-only Compass consuming synthetic publication fixtures through narrow data/presentation capabilities. Run the same fixture against desktop and browser on shared projection/layout/paint contracts; retain existing native behavior. Execute all mandatory end-to-end gates against final exact artifacts.
- [ ] Keep draft until evidence is reviewed and accepted. Do not merge, publish packages, deploy personal vaults, or initiate unrelated C15–C26 work.

The main validation agent needs actual installed Node/dependencies, Obsidian desktop CLI and real Chromium; an offline agent cannot satisfy native or performance acceptance by itself. Missing Windows/macOS or physical-device evidence is explicitly pending, not assumed; the maintainer alone can waive required gates.

## 2. Risk inventory and seams

Baseline references (inspect current accepted versions after refreshing):
- [PlexGraph.tsx](https://github.com/zsviczian/kplex/blob/270c2da3a0bd62f05815426cf4cd0a65ee82b160/src/ui/PlexGraph.tsx) (~6,390 lines): host-bound scene orchestration, native editing, gestures, relation writes, camera, visibility and resource lifetimes. Very high functional and performance risk.
- [ThoughtNode.tsx](https://github.com/zsviczian/kplex/blob/270c2da3a0bd62f05815426cf4cd0a65ee82b160/src/ui/ThoughtNode.tsx): node painting, measurements, gates, properties, image/icon handling. High risk; inspect transitively imported style/layout and native icon modules.
- [App.tsx](https://github.com/zsviczian/kplex/blob/270c2da3a0bd62f05815426cf4cd0a65ee82b160/src/ui/App.tsx): native workspace/Sidecar, history, actions, focus, subscriptions. Leave as native composition; do not transplant it.
- [PlexViewRead and layout contracts](https://github.com/zsviczian/kplex/blob/270c2da3a0bd62f05815426cf4cd0a65ee82b160/src/core/plex/views/contracts.ts): existing host-free projection/layout, opaque NodeId, scoped coverage and optional properties/evidence. Prefer adapting these, not inventing a second layout engine.
- [HostPlexScene](https://github.com/zsviczian/kplex/blob/270c2da3a0bd62f05815426cf4cd0a65ee82b160/src/ui/plexViews/scene.ts) and [GraphPage](https://github.com/zsviczian/kplex/blob/270c2da3a0bd62f05815426cf4cd0a65ee82b160/src/types.ts): current presentation still includes native-shaped data and editor ownership; keep host effects outside the portable contract.
- [publicCanvasScene](https://github.com/zsviczian/kplex/blob/270c2da3a0bd62f05815426cf4cd0a65ee82b160/src/ui/publicCanvasScene.ts) and [public API](https://github.com/zsviczian/kplex/blob/270c2da3a0bd62f05815426cf4cd0a65ee82b160/docs/PUBLIC_API.md): useful passive observation and parity evidence; bounded current-frame DTOs are NOT a complete export format, and API reads do not grant source acquisition.
- [SearchBox](https://github.com/zsviczian/kplex/blob/270c2da3a0bd62f05815426cf4cd0a65ee82b160/src/ui/features/SearchBox.tsx) already takes GraphSearchRead and activation capabilities. Reuse if a minimal search is helpful to exercise fixture navigation.

Existing C14 boundaries and view registry are assets, not permission to reorganize the rest of the application. Preserve the shared renderer for desktop Compass, Mind Map and Facets. Browser MVP is Compass only.

| Current owner | Callers and baseline evidence | Boundary for extraction |
| --- | --- | --- |
| `classic/definition` and `classic/geometry` in [`core/plex/views`](../../src/core/plex/views) | Legacy Classic layout delegates to the same geometry. Existing Classic goldens and the 5,000-node fixture check order, ports and bounded reads. | Reuse the `PlexViewRead` and measurement contracts. A browser fixture supplies only local incidence and explicitly unavailable capabilities. |
| [`ui/plexViews/scene`](../../src/ui/plexViews/scene.ts) and [`measurement`](../../src/ui/plexViews/measurement.ts) | All views bind measured quantities back to exact occurrences. Node-property browser tests compare actual font boxes, and Compass Chromium tests check SVG endpoints against the physical gates. | Supply measurements from the owning document. Keep native file/graph binding and presentation reads with the Obsidian caller. |
| [`ThoughtNode`](../../src/ui/ThoughtNode.tsx), [`index/style`](../../src/index/style.ts), and `Edge` in [`PlexGraph`](../../src/ui/PlexGraph.tsx) | Shared cards, gates and connectors in the three native views. Facets combinations, native orientation and the Chromium controls exercise paint and hit geometry. | Pass resolved styles, labels and visual slots to portable paint components. Obsidian icon, image consent and drag handling stay with their existing owners. |
| [`PlexGraph`](../../src/ui/PlexGraph.tsx), [`App`](../../src/ui/App.tsx), and [`KplexDocumentSession`](../../src/ui/KplexDocumentSession.ts) | Native camera, selection, history, search and action registration. Native Compass and Mind Map navigation, public scene and editor lanes each use real view sessions. | Keep native effects and action preflight in place. Browser recentering and camera state are independent per browser mount. |
| [`CentralNodeEditor`](../../src/ui/CentralNodeEditor.tsx) and [`embeddedMarkdownLeaf`](../../src/adapters/obsidian/embeddedMarkdownLeaf.ts) | Compass, Mind Map and Facets native file editors. The Facets test keeps a dirty editor open through Sidecar condensation and verifies native save. | Keep the native leaf and buffer entirely in Obsidian. Presentation changes may update focus routing while the leaf remains mounted. |
| [`publicCanvasScene`](../../src/ui/publicCanvasScene.ts) and [`ui/export`](../../src/ui/export) | Current native canvas observation and export. Public API, image export and gate geometry checks cover existing callers. | Use the bounded scene DTO for test observation. Publication and native export remain outside the browser prototype. |

### Extraction design

Prefer leaf-first extraction of presentational node/gate/connector primitives and measurement/paint helpers into host-free React feature modules; supply a finite presentation DTO (resolved style, icon/media presentation, measured geometry, accessibility labels, occurrence and canonical identity). Keep interaction controllers, native editor/save preflight, settings writes, source scheduling, menus, drag transport, Obsidian link resolution and plugin lifecycle outside. A browser shell composes the same portable primitives and pure layout, with an immutable fixture-backed graph read adapter and browser camera/navigation actions. Reuse existing generic interaction helpers where proven host-free. No duplicate semantic relationship classifier, graph repository, layout algorithm, or second native editor implementation. No Obsidian runtime shim, fake TFile or empty implementation claiming authoritative absence. Explicitly represent unavailable evidence/properties and graph scope.

Do not add deep DTO clones, full graph scans, per-render index requests, repeated style normalization, additional subscriptions, or another measurement pass to bridge hosts. Preserve existing revision, identity, viewport clipping, caching and ownership fences. No changes to native keyboard/mouse behavior, styling, command IDs, persisted settings, or graph semantics. Browser-only behavior is feature-scoped; desktop must not activate or load it.

Architecture check: verify the browser dependency closure cannot import Obsidian/Electron/Node builtins or legacy host modules, including type-only edges where applicable; use the existing checker without weakening guards. Use separate browser entry and output, not a new runtime loader in the plugin. A narrow extraction may be smaller than porting PlexGraph wholesale; if parity cannot be attained without a risky rewrite, document and halt for maintainer review (not an authorization to fork the renderer).

## 3. Gate A — functional characterization before extraction

Inspect existing executed inventory in package.json and reuse fixtures/drivers. Extend unit/contract and real Chromium tests with deterministic scene/presentation assertions and CLI end-to-end tests with actual trusted pointer/key input where relevant; synthetic DOM-only snapshots are insufficient. Use the shared desktop CLI and browser helpers, exact deployed hashes, verified disposable vault identity and serial native drivers. No private vault data, new test vault destination or broad resets without explicit consent.

| Surface | Baseline and candidate must demonstrate |
| --- | --- |
| Canonical scene | Exact canonical/occurrence identity, node and relation roles/direction/labels, inverse and inferred relationships, hidden/suppressed edges, crosslinks, sibling/group order, gates/counts, clipping, same-name notes, tags/folders/URLs/unresolved; dense and sparse neighborhoods. |
| Geometry and paint | Node text wrapping, badges/properties, images/icons, node and connector endpoints, roughness/dash/arrowheads, gate hit areas, font measurement, scrolling and overflow, light/dark, custom style/zoom, narrow and wide viewports. Capture deterministic geometry and screenshot comparisons; isolate platform/font/DPR/animation variance without masking real regressions. |
| Navigation and input | Center change, history, pins, search/Find, activation and focus, pan/zoom/pinch/scroll, fit and manual camera preservation, hover, tooltips, click/keyboard, drag and drop gates/files, relinking and creation in disposable fixtures, cancellation/rejected transitions. |
| Native lifecycle | Sidecar open/close, follow and synchronization, embedded Markdown/Excalidraw/PDF editor admission/save/close/focus, failed save guard, native menu/commands, popout and multiple simultaneous view sessions, reload/disposal. |
| Other views | Mind Map root/attention, folds/branch expansion, independent editor; Facets predicates/areas/decorations and read-only assignment paths; lens Keep/Reflow, filters and exports. No visual or interaction regression just because web uses Compass only. |
| Index interaction | Settled eager and on-demand local coverage, partial/unavailable and later hydration, prose-only update continuity, relationship change, stable counts and no unexpected source work; do not claim full authority from cached preview. |

Use existing native commands as applicable, e.g. `verify:obsidian:authoring-compass`, `adaptive-fit`, `interaction-gates`, `interaction-touch`, `interaction-updates`, `arrow-direction`, `color-styling`, `label-sharpness`, `hover-highlight`, `plex-views`, `mindmap`, `wuxing`, `plex-sessions`, `occurrence-editors`, `editor-mobile-navigation`, `sidecar-latency`, `sidecar-folding`, `canvas-image`, `public-api`, `prose-scene`, `stable-gates`, `action-devices` and `foreground` (all have the `verify:obsidian:` prefix). Verify actual scripts and test scope before selecting them; don't just run a list without coverage mapping. Extend the gaps; ensure added tests are in the executed inventory. Include positive and negative controls that demonstrate assertions detect missing links, misplaced gates, incorrect navigation, and added work.

Record baseline reference SHA, executable test-only commit, expected observable values and actual outcomes. No relaxed goldens, deadlines or hidden test omissions. Baseline and candidate use the same fixture/settings and assertions. Any intentional visible change requires separate approval; this PR has none.

With the three disposable Small vault variables from [Desktop CLI setup](../../CONTRIBUTING.md#desktop-cli-setup-windows-and-macos), run
`npm run verify:obsidian:web-runtime -- compass mindmap facets`. It builds a fresh
identified local artifact, serializes staging under the shared application lock,
verifies installed hashes, and restores the prior artifact and configuration.
For an already frozen unchanged artifact, add `--artifacts <directory> --reference <full-git-sha>`.
The same launcher accepts `mindmap-editor` and `occurrence-editors` for bound
editor transitions, `editor-mobile-navigation` for native document surfaces,
`canvas-image` and `label-sharpness` for paint, `public-api` for committed
scene inspection, and `stable-gates` for retained counts across source work.

## 4. Gate B — performance benchmark before extraction

Build the harness so the local agent can run both variants end-to-end without interactive intervention using the existing configured disposable vault, exact builds and CLI. Document one reproducible command sequence, flags, fixture counts, cleanup and machine-readable comparisons; integrate a focused repeatable comparison lane and fail exit status on regression or missing required data. Keep raw samples, screenshots and traces in managed .test-work/validation; no routine report files committed.

**Workloads:** small deterministic help-like graph, dense neighborhood with crosslinks/gates, long labels and images, representative thousands-node publication-scale fixture, and a large native prepared vault (measure actual inventory, use existing approved fixture; do not assume a vault is large). Run settled warm eager and on-demand cases; separate cold startup, cache hydration and ongoing acquisition from steady-state measurements. Include repeated center transitions, history, search activation, pan/zoom, scrolling, lens/view switches, Sidecar transitions, resize and main/popout simultaneous views. Use the same action sequence, viewport dimensions, theme, fonts, pixel ratio, hardware/OS, Obsidian/Chromium/Node, power/visibility conditions, settings, cache state and production-equivalent deterministic artifact; record exact hashes. Never change global Electron throttling.

Measure:
- User-facing input-to-committed-scene latency and actual visual frame/paint observation where available; label paint proxy vs true paint, never treat a callback as paint. Input-to-settled/interactive latency, frame interval distribution/dropped frames/long tasks, pan and zoom responsiveness.
- Per-action projection/layout/measurement/render counts and durations; React commits, node/edge counts, visible clipping, repeated render/measure passes.
- CPU/wall time, heap/retained memory where supported, DOM/handler/observer counts after repeated navigation, open/close and disposal; ensure no growing resources.
- Native index work: graph/evidence/source/metadata queries, reads/parses/acquisition, full builds, search invalidations, demand leases, notification counts, persistence and settings writes. Presentation-only settled workloads must not admit new source work or change semantic state; compare existing legitimate activity separately. No new startup work or timers when web functionality is unused.
- Release artifact sizes (raw byte counts of main.js, styles.css, manifest.json and total installable artifacts, plus optional web bundle separately), build/scanner/lint status and deterministic release reproducibility.

**Comparison discipline:** warm-up excluded; repeated independent paired runs, at least three independent sessions/build runs and a sufficient number of samples per workload (target 30+ actions per session for tail statistics; increase for noisy workloads). Preserve raw data, p50/p95 and p99 only when adequately sampled, max, dispersion and run-level results. First measure baseline-vs-baseline variability (A/A); compare A/B/A or interleaved equivalent to distinguish thermal/caching drift. Record actual scene/content sizes. No single lucky run, averaging away a tail regression, or substituting a synthetic browser microbenchmark for native evidence.

The native navigation and zoom lane runs with
`npm run verify:obsidian:web-runtime -- performance --mode eager`. Repeat in
`on-demand` mode and set `KPLEX_WEB_BENCH_DENSITY` to `6`, `18` or `72` for the
different owned fixture sizes. The lane accepts both prepared disposable vaults and records
their actual Markdown inventory. It excludes warm-up and waits for quiet source
and cache work before sampling. Its PNGs come from the native compositor. The
two-frame duration is a settle proxy. Increase `KPLEX_WEB_BENCH_SAMPLES` to
100–120 when checking tail variability. `KPLEX_WEB_BENCH_FRAME_ALIGNED=true`
starts input at the same point in the frame cycle to investigate scheduling
noise. `KPLEX_WEB_BENCH_CADENCE_MS` can fix the interval between inputs for a
separate pacing experiment. Keep paced and frame-aligned receipts distinct
from free-running inputs. With three independent receipts for a
single workload, repeat `--baseline <report.json>` with
`npm run compare:web-runtime` to inspect A/A dispersion. The maintainer approved
matched A/B/A after the identical-build measurements showed scheduler noise.
Build the candidate once. Alternate `--artifacts <baseline-directory> --reference <baseline-sha>`
and `--built` using the same `performance --mode eager` command and environment.
Start and end with A. Pass the consecutive A and B report paths with repeated
`--baseline` and `--candidate` arguments and add `--inspect-paired` after five
candidate sessions. The comparator reports a one-sided confidence bound on
median slowdown, alongside raw percentiles, dispersion, and added source work.
An inconclusive interval retains both the observations and the original limit.
Use `KPLEX_WEB_BENCH_EXTENDED=true` with density
`72` in Small to add History, pan and scrolling. The scale vault uses established
help notes so that fixture creation does not start an unrelated 20,000-file
source pass. Add `--warm-scale` with the scale vault when native URL discovery
is still running. It retains the application lock until the actual background
owners settle, records that time separately, and then runs the timed lane with
the same installed artifact. These lanes cover part of Gate B.

**Acceptance:** zero functional differences, zero new unexpected reads/parses/acquisition or rebuilds, no new leaked resources/extra work on identical operations, and no reproducible regression in responsiveness/CPU/memory. Preserve all existing strict timing gates. Provisional quantitative ceiling (a proposed safety gate, not an allowance to degrade): p50/p95 candidate no more than 5% slower than comparable baseline, with a documented absolute noise floor for very short operations established from A/A before extraction; no repeatable tail or memory degradation. If A/A noise is larger, improve harness/environment or ask maintainer to approve a specific alternative **before production edits**. If a repeatable smaller slowdown is measurable, investigate it; do not waive it just because it is inside 5%. Baseline thresholds and acceptance script are frozen at the test-only checkpoint. Report any failed measurement, rerun and remaining limit; never change thresholds/goldens to fit the result. If a candidate fails, fix or revert the extraction; stop if parity is infeasible.

Any change affecting index/source/scheduling/storage or startup triggers AGENTS/CODING_STANDARDS mandatory full indexing and persistence gates, including two unchanged warm restarts, actual cache activation and comparable workload counts. Native evidence for current machine does not establish all hosts; record missing macOS/Windows and physical iOS/Android validation explicitly.

## 5. Gate C — implementation after A/B

- [ ] Separate build entry and scoped styles for browser artifact; no Obsidian/Electron/Node runtime dependency, no native stubs, and no additional desktop startup work. Keep current deterministic scanner build and installed outputs unchanged in contract.
- [ ] Share actual Compass projection/layout AND visual node/gate/connector components with desktop. Include read-only recentering, pan/zoom, history, keyboard/touch navigation as applicable; simple browser shell may use static fixtures and placeholder content. Demonstrate same data fixture, viewport and appearance yields equivalent scene roles/order/geometry/paint; do not hardcode screenshot or prepositioned scene as the runtime.
- [ ] Minimal, versioned fixture contract and narrow read provider only. Use opaque publication-local IDs, complete scoped adjacency, explicitly unavailable capabilities. Do not change existing graph NodeId or add YAML UUIDs yet. Do not consume current cache files or dump an entire live index. No source work in browser.
- [ ] Keep native writes, authoring, editors, indexing, workspace lifecycle and plugin menus in Obsidian. Browser never exposes native writes or inactive authoring controls.
- [ ] Responsive browser demo served over plain HTTP including non-root base path. Same bundle mounts in standalone page; no CDN required for prototype. Automated real-browser tests exercise navigation and rendering after the source fixture changes, multiple instances/disposal, missing nodes and invalid fixture version. No server component.
- [ ] Add bundle-size report to baseline and candidate. Use the maintainer's 5 MiB (5,242,880-byte) ceiling for the installable set; track each file separately, don't worsen baseline or approach ceiling without explicit review. Verify real current artifact before selecting packaging. Use esbuild metafile analysis, tree shaking, dead-code/duplicate dependency removal and ordinary minification; separate browser artifacts from installed plugin. Do not bundle web runtime twice, compress/decompress executable code (pako or otherwise), use eval or remote executable loading to evade scanner, or change deterministic release output identity. Normal HTTP compression of separately hosted web assets is unrelated. Later publisher distribution is a decision gate, not solved by forcing a second runtime into main.js.
- [ ] Run focused tests per extraction; final check:architecture, check:core, lint:obsidian, check:release, real deterministic build and applicable repository verification/CLI lanes. Given shared renderer risk, plan full verify at final handoff per repo rules; run full native indexing acceptance when affected/required. Document actual commands, test results, baseline vs candidate and unresolved risks in PR; preserve raw evidence per retention contract.

After `npm run build`, use `npm run check:web-runtime:artifacts` to record the
release baseline. Preserve its built files in the managed validation run. After
building the candidate, use `npm run check:web-runtime:artifacts -- dist <baseline-directory>`
to report per-file byte counts and SHA-256 hashes and enforce the total budget and
no-growth comparison. The command excludes the separate browser output.

### Run the standalone Compass

```sh
npm run build:web
python -m http.server 8000 --bind 127.0.0.1 --directory dist-web
```

Open `http://127.0.0.1:8000/`. Serve the whole `dist-web/` directory together
to place it below a different HTTP path. The generation step ships the
synthetic `publication.json` with the page, a stylesheet, and local ES modules.
`compass.js` exports `mountCompass(element, fixture)`. A mount's `update`
method validates a replacement fixture before resetting its navigation, and
`dispose` releases that mount's DOM and event handlers. `npm run test:web-browser`
builds the site and verifies both HTTP paths, shared geometry, independent
mounts, keyboard and pointer navigation, and malformed fixtures in Chromium.

## 6. Explicit exclusions

No publishing configuration/UI, file selection/export, real vault graph export, YAML changes/UUID resolver, Markdown conversion, Excalidraw export, search index/full-text, theme extraction UI, user-facing site upload, hosting, WordPress widget, npm/CDN release, authenticated server, broader structural refactor or web Mind Map/Facets. No separate plugin decision until bundle feasibility measured. No user-visible desktop feature changes, unrelated fixes, new dependencies without justification, or automatic merge.

## 7. Completion criteria

A test-only baseline commit and evidence precede production renderer commits; exact-build desktop baseline/candidate checks pass, current render semantics and functionality are preserved in **all** native views, benchmark gate passes with no unexplained regression, independent static Compass demo uses the shared renderer without a host dependency, and size/scanner/architecture checks pass. If this cannot be shown, keep draft and deliver the concrete blocker and smallest next experiment. The local agent must not report a successful extraction based solely on a build, snapshot, or browser demo.

### Windows comparison

- The same publication fixture produces identical Compass card order, roles,
  bounds, gate diameters and routed connector paths in the desktop and browser
  render paths. Chromium also exercised the standalone page at `/` and a
  nested HTTP path, including touch, fixture updates and independent mounts.
- Native Compass, Mind Map, Facets, Mind Map editor, public API, stable gates
  and label sharpness passed on the candidate. The focused follow-up compared
  accepted main `270c2da3` with the byte-identical candidate artifacts from
  `fc89f565` on Windows Obsidian.
- The original scroll assertion read an obsolete `clip-path`. The corrected
  probe confirmed on both artifacts that the frame and native document clip
  against the actual scroll viewport. The same native editor, dirty text and
  selection survived resizing, reflow and scrolling. The selector guard also
  retained the editor and reported the reason when its requested save failed.
- The occurrence-editor probe then exposed a distinct dirty-popout failure
  on both artifacts. Its test-only rooted view reopened the correct note, but
  the dirty text was missing from the recreated editor and disk. With the
  shipped Mind Map, both the root and an off-center child recreated the canvas
  and native editor, retained the draft, and saved it on close on both
  artifacts. The test-only failure remains a separate occurrence-editor
  investigation.
- The broader PNG driver encountered a snapshot rejection on both artifacts
  after changing presentation. With a settled canvas, both artifacts produced
  the same 15 PNG previews byte for byte across Compass, Mind Map and Facets,
  verified native Copy and Save once per view, and preserved canvas state on
  every capture. The test uses an owned download destination.
- With the same Excalidraw 2.29.0 binary, both artifacts opened and maximized
  the drawing without replacing its native API. The drawing closed, its
  embedded leaf detached, and the canvas unlocked both in isolation and after
  the original Markdown and PDF sequence.
- Both artifacts completed the dense history, pan and scroll scenario and
  the on-demand navigation and zoom scenario in the 20,088-note vault.
  Eager scale preparation reached its warm-up deadline, then the runner
  restored the disposable vault before the on-demand run.
- Six reference and five candidate sessions used the same foreground Obsidian
  workspace, source-recovery startup route, 98-note inventory and 60 trusted
  actions each for navigation and zoom. All timed samples displayed eight
  cards, thirteen edges and thirty-two gates. The candidate admitted no
  additional measured source work. The largest upper confidence bound for
  the two-frame settle proxy was 3.84%. The shorter DOM-commit measurements
  showed no repeated slowdown, with confidence bounds crossing 5%.
- The full `npm run verify` passed, including 4,877 runtime and persistence
  tests, the standalone browser checks, and the production build.
- The installable set is 5,131,561 bytes, 111,319 bytes below the 5 MiB
  ceiling. It is 784 bytes larger than the accepted main artifact. The
  comparison retains this difference while the desktop build stays separate
  from the browser assets.

The managed native runner replays these checks in the disposable Small vault.
Use its `canvas-image` lane with `KPLEX_IMAGE_SETTLED=true` for PNG, and
`occurrence-editors` for scroll and the test-only popout reproduction. Use
`editor-mobile-navigation` with `KPLEX_EDITOR_DRAWING_CLOSE_ONLY=true` for
isolated Excalidraw close, or `KPLEX_EDITOR_MARKDOWN_MIGRATION_ONLY=true` for
the shipped Mind Map root and `KPLEX_EDITOR_MARKDOWN_MIGRATION_ONLY=occurrence`
for its off-center child.
