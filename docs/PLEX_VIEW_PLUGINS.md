# Internal Plex view plugins

Prepared by Zsolt's Codex Agent on 2026-10-24.

**Status: implemented foundation under validation in PR #215.** Arbitrary-node editor hosting is a firm requirement but is not implemented by this extraction. The [occurrence-editor prerequisite](PLEX_OCCURRENCE_EDITORS.md) blocks parallel view jobs until its real shared-host proof passes; simultaneous editors remain out of scope. Classic is the only production definition. The original design/research below remains the rationale; section 16 records the actual implementation and capability limits. Mind Map, Ideaverse and Wu Xing remain subsequent features. Acceptance results belong in the linked validation report, not this design status.

Research baseline: K-Plex [`5954951`](https://github.com/zsviczian/kplex/commit/595495105f56ae8d159f71b41706157e9f24c851), after PR #214. Ideaverse reference: [`4cce3f2`](https://github.com/nickmilo/ideaverse-maps/commit/4cce3f267148cc81e2961796e9a8dc7e20ff1aa0). Recheck branch/main before implementation. Follow AGENTS.md, CONTRIBUTING.md, ARCHITECTURE.md and AGENT_WORKFLOW.md. This feature does not resume the paused general refactoring programme.

## 1. Outcome and scope

A Plex view plugin defines how a set of notes, relationships and properties becomes an explorable scene. It owns its interpretation, traversal, grouping partitions, layout, areas and view-specific controls. K-Plex supplies graph/source authority, reusable presentation and interactions, native editing, navigation, search, lenses and workspace integration.

The current parents/children/friends/challengers/siblings arrangement becomes the built-in `classic` definition. Its current name and default experience can remain unchanged in the UI. Selecting another definition must not create another index, change the user's global ontology, replace the Obsidian view, or recreate its Sidecar.

Initial scope is statically bundled internal modules. External registration, downloading code, a marketplace, a public ABI, GQL and arbitrary third-party renderers are deferred. Related public read/navigation discussion: [#132](https://github.com/zsviczian/kplex/issues/132). Do not close that issue through this extraction.

**Completion is more than moving PlexGraph.tsx into a folder.** A test-only definition with different areas, duplicate note occurrences and an off-centre attention node must run through the same shared infrastructure without importing Classic implementation details.

## 2. Research findings and implications

### TheBrain Mind Map

The official [mobile help, Mind Map section](https://help.thebrain.com/ipad/index.html) describes horizontal, symmetrical expansion from any thought, whole-view expansion/collapse and individual branch expansion/collapse. Its [official screenshot](https://help.thebrain.com/ipad/images/0aa2e44a-2fdc-5284-a9cf-35be54aa7803.png) shows branches extending on both sides of the root, with surrounding graph context. This is a different projection from the normal parent-above/child-below Plex, and from a force-directed graph.

Historical staff explanations distinguish focus from the active map root: a [context action sets the active thought](https://forums.thebrain.com/post/discussion-first-impressions-7841783), and [root siblings are not automatically shown in that Mind Map implementation](https://forums.thebrain.com/post/creating-siblings-in-mindmap-view-8245627). These are TheBrain 9 discussions, not verified TheBrain 15 interaction specifications. The [current v15 page](https://thebrain.com/products/thebrain/thebrain15) advertises redesigned Mind Map and Outline views; its separate Tree View should not be mistaken for Mind Map.

Research limits: no installed TheBrain was exercised. The large desktop PDF manuals could not be retrieved successfully. The findings above rely on official HTML, an official visual example and version-labelled staff explanations. Precise v15 shortcuts, drag ordering, cycle handling and persistence remain unverified. Specify K-Plex's choices explicitly instead of claiming desktop parity.

Recommended K-Plex Mind Map MVP:

- Any eligible note can be the layout root. Its child hierarchy expands horizontally to both sides with stable branch ordering and side assignment. Left and right are physical placement, not parent-versus-child semantics.
- Keep root, attention and keyboard selection separate. Inspecting a branch may update the shared document/Sidecar without rebuilding the map around it; an explicit reroot action changes the root. Reuse K-Plex's action system and modifier conventions rather than copying historical TheBrain keys.
- Expand/collapse individual occurrences and a bounded number of generations. Use the shared node, connector, measurement, selection and editor facilities.
- Model the underlying graph faithfully: multiple parents can produce multiple occurrences; an ancestor encountered again terminates that branch with a reference/cycle indicator. A displayed tree must not delete or rewrite non-tree relationships. Optional context/cross-links retain provenance.
- Specify root-parent/lateral context and cross-link visibility separately from child-tree expansion. Do not reproduce all Classic sibling areas automatically.

The API requirements are occurrence identity, bounded traversal, per-occurrence expansion, physical connector ports independent of semantic role, and a layout root independent of attention.

### Maps of the Ideaverse

Read the pinned [README](https://github.com/nickmilo/ideaverse-maps/blob/4cce3f267148cc81e2961796e9a8dc7e20ff1aa0/README.md), [scanner](https://github.com/nickmilo/ideaverse-maps/blob/4cce3f267148cc81e2961796e9a8dc7e20ff1aa0/src/scan.js) and [map implementation](https://github.com/nickmilo/ideaverse-maps/blob/4cce3f267148cc81e2961796e9a8dc7e20ff1aa0/src/mapApp.js).

The README describes four principal maps. Emergence arranges five levels from hubs and maps-of-maps through maps-of-content, linked notes and unlinked notes, with time or folder organization across the map. Gravity uses concentric rings for those levels. Starfield derives hub-centred clusters. Sensemaking uses textual/structural heuristics for a different interpretation. The current source also enables additional experimental layouts; porting the whole application would be much larger than adding one Plex view.

Emergence is an interpretation of a corpus, not simply a new arrangement of the current neighbourhood. The reference scanner distinguishes body links, `up`, `related`, other properties and collections. It suppresses some repetitive navigation links when calculating effective body degrees. With default weights its score is:

```text
bi = ln(1 + effectiveBodyIncoming)
bo = ln(1 + effectiveBodyOutgoing)
score = bi + 0.6*bo + 0.3*ln(1 + upIncoming) + 0.8*sqrt(bi*bo)
```

In that implementation, the `upIncoming` input includes its `up`/`related` handling. The final term rewards combined incoming/outgoing strength; it is not a count of reciprocal pairs. Collections have a configurable weight whose default is zero. Arbitrary property links can establish linked status without contributing to that default score.

Map recognition considers configured map folders, MOC titles, collections, and outgoing-link/linked-line-density criteria. Promotion also uses score thresholds, home notes and a corpus-dependent top-ranked set. Those rules have priority: for example, top-ranked promotion can affect tiny or all-zero-score corpora. Preserve explicit reasons and deterministic tie handling in fixtures rather than paraphrasing the five labels as an exhaustive algorithm.

The reference has deterministic note-position jitter, time/missing-date handling, numeric-property axes, focused neighbourhoods, filtering and host integration. Its README also distinguishes a Bases-filtered display from the larger scoring corpus. This is useful product guidance: filtering a map must not unexpectedly change a note's emergence classification.

**Recommended first view: Emergence, then Gravity using the same derived metrics.** Defer Starfield, Sensemaking body analysis, 3D, tours, timelapse, archive/learning-pack special cases and the experimental layouts. A creation-date replay must not be described as reconstruction of historical vault contents without historical evidence.

Do not import the reference scanner or mount its complete canvas application inside K-Plex. The scanner reads and parses notes through its own rules, and the map application owns a second UI/lifecycle. Reuse its documented behaviour and small, reviewed pure calculations where useful. Its [MIT licence](https://github.com/nickmilo/ideaverse-maps/blob/4cce3f267148cc81e2961796e9a8dc7e20ff1aa0/LICENSE) includes Nick Milo's copyright notice; preserve the applicable notice with any copied substantial source. Do not imply affiliation or exact compatibility for a deliberately reduced scoring profile.

The API requirements are corpus scope and completeness, explicit property/provenance reads, cached derived metrics, explainable classification, time/folder axes, compact rendering, and attention independent of the spatial origin.

### Wu Xing-inspired relational cycle

The maintainer's drawing and description are the specification for this adaptation. Use the five situated positions: attention/self, children, grandchildren, grandparents, parents, with siblings beside attention. Moving to another participant changes the relational perspective. This does not require assigning traditional element names or introducing a universal fixed centre.

A first interpretation can derive children/parents from the configured ontology and grandchildren/grandparents from bounded two-step traversal. Keep that mapping configurable within the view. The connection drawn around the five positions is a navigation/interpretation guide unless actual evidence supports the corresponding note-to-note relationship. In particular, a grandchild-to-grandparent arc must not fabricate an indexed edge.

Distinguish unknown/unrequested relations from known absence. The horizon is deliberately bounded; do not implement the concept by constructing a whole-vault graph and merely hiding most of it. Cycle-order actions and screen-direction keyboard actions are separate navigation policies.

This is a valuable third view and an excellent small contract-test shape. It is less specified than Emergence as a complete product feature, so implement its contract probe now and its real ontology/interaction choices later.

## 3. Current seams and the actual extraction work

The following references are pinned to the research baseline, not an assumed future tree.

| Existing owner | Finding | Extraction implication |
| --- | --- | --- |
| [App.tsx](https://github.com/zsviczian/kplex/blob/595495105f56ae8d159f71b41706157e9f24c851/src/ui/App.tsx) | Host shell, search, filters/lenses, navigation, actions, native sync and Sidecar composition. | Keep this owner stable; compose the selected view definition rather than replacing the shell. |
| [PlexGraph.tsx](https://github.com/zsviczian/kplex/blob/595495105f56ae8d159f71b41706157e9f24c851/src/ui/PlexGraph.tsx) | Shared interactions are mixed with fixed ZONES, area-height keys, grouping, layout calls, central-node assumptions and camera policy. | Separate Classic policy from shared scene lifecycle, input, editor and renderer mechanics. Preserve memoization and asynchronous fences. |
| [layout.ts](https://github.com/zsviczian/kplex/blob/595495105f56ae8d159f71b41706157e9f24c851/src/ui/layout.ts) | Classic geometry, five-zone scene shape, section geometry, node measurement and lazy-count integration. | Extract policy; share measured-node/connector primitives. Do not move host imports into portable core. |
| [GraphIndex.ts](https://github.com/zsviczian/kplex/blob/595495105f56ae8d159f71b41706157e9f24c851/src/index/GraphIndex.ts) | getNeighborhood assembles fixed buckets and derives siblings; relationView/neighbours also own classified, visibility-aware reads and count coverage. | Move the Classic bucket/sibling projection through a narrow adapter. Keep classifier, source authority, sorting and publication owners. Existing compatibility callers can delegate to one implementation. |
| [types.ts](https://github.com/zsviczian/kplex/blob/595495105f56ae8d159f71b41706157e9f24c851/src/types.ts) | ScrollZone and GateSide are closed unions; positioned edges identify endpoints by path. | Keep these as Classic/legacy compatibility types where needed. Introduce view-local area and occurrence identities at the shared scene boundary. |
| [relationGroups.ts](https://github.com/zsviczian/kplex/blob/595495105f56ae8d159f71b41706157e9f24c851/src/ui/relationGroups.ts) | Generic kind/note-type grouping is wrapped in fixed neighbourhood areas; transient groups do not enter GraphIndex. | Share grouping and unfolding mechanics; the view supplies grouping partitions and stable keys. |
| [keyboardNavigation.ts](https://github.com/zsviczian/kplex/blob/595495105f56ae8d159f71b41706157e9f24c851/src/core/plex/keyboardNavigation.ts) and [hook](https://github.com/zsviczian/kplex/blob/595495105f56ae8d159f71b41706157e9f24c851/src/ui/usePlexKeyboardNavigation.ts) | Spatial navigation already accepts string sections and area anchors, but initial selection falls back to a section named center. | Reuse the algorithm/action delivery. Supply an explicit entry occurrence and view navigation metadata. |
| [model.ts](https://github.com/zsviczian/kplex/blob/595495105f56ae8d159f71b41706157e9f24c851/src/core/graph/model.ts) and [read.ts](https://github.com/zsviczian/kplex/blob/595495105f56ae8d159f71b41706157e9f24c851/src/core/graph/read.ts) | Host-free NodeId/GraphNodeView already exist; the read file currently exposes search, not a general corpus API. | Reuse identities and facts. Add only the narrow reads demonstrated necessary by actual consumers. |

Important compatibility detail: Classic currently caps direct areas, combines previous/next into lateral areas, and derives siblings from admitted parents while excluding occupied direct nodes. Defined sibling evidence wins over inferred evidence. Preserve sorting, caps, precedence and the existing position of filters in this pipeline. A new framework must not silently change these results.

The [indexing architecture](INDEXING_ARCHITECTURE.md) distinguishes global search vocabulary from current relationship coverage. A node-only catalogue can have empty neighbour maps without proving that nodes are unlinked. Requested neighbourhood and candidate-degree preparation already exist; neither is automatically a complete Ideaverse metric API.

## 4. Ownership boundary

| Capability | Shared infrastructure | View-specific input/policy |
| --- | --- | --- |
| Graph and properties | Canonical identities, source facts, resolved relationships, coverage, revision consistency, bounded acquisition and explanations. | Requested scope, eligible traversal, selected property/relationship interpretation and derived annotations. |
| Search, Find, lenses | Query/predicate engines, saved lenses, highlighting, styles and controls. | Scope/occurrences to search or reveal, and explicit Keep/Reflow projection policy. |
| Grouping | Kind/note-type grouping, synthetic identity, unfolding and selection mechanics. | Partition keys: Classic area, mind-map branch, or Emergence band/axis segment. |
| Nodes and connectors | Measurement, style/typography, imagery consent, node cards, connector drawing, hit testing, semantic counts and interaction affordances. | Coordinates, physical ports, edge routes and optional compact glyph presentation. |
| Areas | Scrolling, resizing, filtering controls, clipping and accessible navigation mechanics. | IDs, labels, bounds, anchors, tint geometry, limits, resizing policy and drop semantics. |
| Navigation | ActionManager, key ownership, selection/reveal, activation, history and native follow. | Initial occurrence, area topology, root/expansion state, camera framing request and optional cycle order. |
| Editing | Native editor lifecycle, file opening, relationship writers and eligibility checks. | Editor anchor and explicit semantic action intents; no direct vault writes. |
| Workspace | Obsidian leaf, Sidecar, folding, display modes, device/window ownership. | Capability declarations; no ownership of native leaves. |

Area tint belongs with area geometry. The shared renderer may paint a view-provided polygon or rectangle using the existing theme/color resolver; it must not know that a particular polygon means parents. Likewise, shared resizing receives constraints and a view-owned preference target rather than indexing a global five-area table.

Do not globalize every Classic control. A radial view need not expose parent-column settings. Shared controls can render a selected view's small typed setting descriptors, with localization and accessibility retained.

## 5. Interpretation without competing semantic engines

Expose two distinct read concepts where required:

1. Resolved relationships from the existing canonical compiler/resolver, including their provenance and read coverage.
2. Explicit properties and source/evidence facets, obtained through existing source/property owners, for a view's derived interpretation.

For example, Classic groups resolved roles; Mind Map selects a hierarchy from them; Emergence scores particular evidence kinds and properties; Wu Xing maps relation paths to relative positions. A presentation role such as `emergence-level-4` or `grandparent` does not become a persisted relationship declaration.

Do not change global ontology settings when switching views. Do not implement a second YAML/body parser, hidden-link policy or relation resolver in a plugin. If a future view genuinely requires a different semantic resolution policy, design a separately scoped use of the existing canonical compiler over neutral facts; that is beyond this first extraction and requires its own coverage/performance review.

Persisted source evidence, view interpretation and connector editing authority must remain distinguishable. A visible derived edge can be explained without being editable as an ordinary note relationship.

## 6. Internal API v0

Use the smallest concrete contracts needed by Classic and the non-Classic probe. The following are required concepts, not existing exports or a frozen external SDK.

### Definition and registration

A static definition provides a stable namespaced ID, localized label/icon, internal contract version, capabilities, default view state, state validation/migration, and projection/layout policy. Registration is performed once at the application/UI composition root. Definition objects do not contain mutable per-window state.

A thin UI contribution may supply view-specific settings using existing controls and typed commands. It must not receive the entire plugin, App, GraphIndex, mutable settings or native WorkspaceLeaf as a convenience API. The shared shell selects a definition; no per-ID switch statements should appear throughout shared rendering.

### Read scope and lifecycle

A view declares bounded demand. The host/application layer acquires it through existing index owners outside React render, then supplies a revision-scoped read handle. The handle exposes only necessary node, relation, property and evidence reads. It describes completeness, truncation and unsupported capabilities explicitly.

Read coverage is attached to the requested scope and dimensions: complete node vocabulary is different from complete relationship incidence, property availability or exact counts. Prefer existing coverage representations and adapt them rather than inventing a competing readiness flag. A retained result is usable only while its source/policy/publication/lifetime is current.

Use bounded node/edge/depth limits, deterministic continuation or explicit truncation, and cooperative cancellation for material preparation. Core code uses the repository's injected lifetime/yield abstractions; it must not acquire DOM or Obsidian dependencies. No source reads, scheduling, subscriptions or cache warming may start inside a pure layout call.

### Projection and scene

Separate these identities and concepts:

- **NodeId:** canonical semantic identity, reused from the existing model. Do not derive paths or kinds from it.
- **OccurrenceId:** a view-instance-local appearance of that node, stable across ordinary geometry updates. Different branch paths may show the same NodeId. Transient group/heading occurrences remain explicitly synthetic.
- **AreaId:** an arbitrary view-local presentation region. A scene may have zero, one or many areas, and a node need not belong to a scroll box.
- **Semantic relation/evidence identity:** distinct from the visual connector joining two occurrences.
- **Attention node:** the node used by shared activation/document follow. **Layout root:** the reference for a rooted projection, possibly absent. **Selected occurrence:** keyboard/pointer selection without automatic activation. **Editor anchor:** where the existing editor is hosted.

A projection returns bounded occurrences, semantic or derived edge references, grouping/navigation metadata and presentation annotations. Shared measurement then supplies current node/editor sizes. Layout returns geometry, physical ports, optional areas/decorations, scene bounds and framing/editor anchors. Avoid embedding TFile, GraphPage neighbour maps or whole-vault copies in portable scene DTOs.

Edges identify source and target occurrences. Semantic edges retain canonical endpoints and evidence references for shared explanation/write commands. Derived grouping/path edges and decorative guides declare their kind and cannot accidentally invoke relationship mutation. Preserve physical property keys separately from display captions.

For Classic, a narrow host adapter binds existing GraphPages and current count/style helpers. Retain canonical identity and lazy reads. Compatibility exports are allowed when they delegate to the extracted owner; copying the algorithm behind both interfaces is not acceptable.

### Generic navigation and editing

The shared keyboard mechanism consumes displayed selectable occurrences, coordinates and optional area anchors. The definition supplies the initial occurrence instead of relying on the string `center`. Optional parent/child, branch or cycle transitions return occurrence IDs or semantic navigation intents; shared action dispatch retains focus/modifier rules.

The definition supplies physical connector ports and explicit drop/action meanings. A left-hand mind-map branch can still represent a child relationship. Moving a node between emergence bands must not rewrite its ontology or invent a numeric property unless a separately approved editing action defines that behaviour.

Native editing remains host-owned. View switching keeps the current attention/document and editor instance where its supported host is unchanged; geometry can change its anchor without recreating it. If an incompatible view cannot host the current native editor, require an explicit shared transition with dirty/focus handling, never a silent destructive unmount. The initial Classic extraction must preserve every existing editor mode.

### Error and disposal contract

A definition failure is isolated to its scene, with a localized recovery path to Classic. Dispose exact view-instance subscriptions, observers, pointer captures, timers, animation frames, hover leases and demand ownership. Late work from a previous view must never publish into its replacement. A hidden view retains only the state its existing lifecycle permits, not an always-running layout simulation.

## 7. Suggested module shape

These are proposed destinations; align final names with the verified import rules.

```text
src/core/plex/views/
  contracts.ts
  classic/
    projection.ts
    layoutPolicy.ts
    areas.ts
src/application/
  [view session and demand composition, only if existing owners need a helper]
src/ui/plexViews/
  registry.ts
  builtins.ts
  PlexViewHost.tsx
  classic/
    adapter.ts
    controls.tsx
  [shared scene/interaction adapters extracted from PlexGraph as needed]
```

Later pure policies live under `core/plex/views/mindmap`, `ideaverse` and `wuxing`, with host/UI contributions in corresponding UI folders. Each definition has its own folder within each existing architectural layer; forcing all portable and host code into one flat plugin folder would weaken those boundaries.

Keep projection/layout policy portable. Existing host-bound layout helpers must first be separated from GraphIndex, Obsidian styles and TFile dependencies before moving to core. Avoid a broad file renaming campaign. Leave useful compatibility entry points until actual callers migrate, then remove only those made redundant by this feature.

## 8. Filters, grouping and metrics

Share predicate compilation and matching. Do not require each view to reimplement lens rules. Expose the existing common operations to a staged projection pipeline:

```text
admitted facts / resolved reads
  -> view classification and structural occurrences
  -> shared eligibility / predicate matching
  -> view-defined grouping partitions with shared grouping
  -> measurement and layout, or retained geometry for Keep
  -> visible occurrence selection / rendering / lazy presentation demand
```

This diagram is conceptual, not permission to reorder Classic behaviour. Preserve Classic's existing caps and visibility rules, section projection, Keep/Reflow distinction, grouping-after-matching behaviour, gate numerator/denominator semantics and hidden-target restrictions. Characterize those before extraction. Structural context retained by a different view must be explicitly represented and may not reveal content excluded by an authoritative visibility/privacy rule.

Corpus metrics are computed against a named admitted corpus, before ordinary display filters. A view can offer a separate deliberate scoring-scope choice later. Metrics are bounded, versioned derived caches invalidated by relevant source/policy changes, not new authoritative graph indexes. Hover, camera movement, tint and viewport changes do not recalculate them.

## 9. State and selector

The selected view belongs to the existing native Plex session. Two open Plexes can choose different views while sharing the index. Selection must survive the same native-view/React remount transitions that current session state survives. Validate serialization through the established workspace state path; do not store runtime instances or expanded graph payloads in data.json.

Keep global saved pins/history and per-session Footprints exactly as decided in [#31's comments](https://github.com/zsviczian/kplex/issues/31#issuecomment-6262103838) and implemented by #187. Do not resurrect the issue body's superseded proposal for separate persisted pins/history.

Store each view's persistent preferences under a namespaced versioned record when new preferences are introduced. For Classic, retain the existing flat/device/surface settings as the authoritative compatibility storage in this PR; its adapter reads/writes those keys through the existing settings owner. Avoid simultaneous relocation of every legacy setting. Preserve import/theme/external-settings behaviour.

Camera, selection, hover, pending gestures and transient expansion belong to a bounded per-session/view state. Persist only explicit preferences and small workspace restoration state. Retire invalid node/occurrence references on rename, deletion, replacement or new root; do not retain old GraphPages through view-state caches.

Unknown/unavailable view IDs fall back safely to Compass (`classic`) while retaining unrecognized preference payloads for possible restoration. The native **Canvas view** dropdown lives at the top of **Views and lenses** and captures the opening canvas's existing `PlexViewSession`. Compass comes first; the row stays visible and disabled when it is the only production definition. Test probes never enter production registration. The dropdown reflects successful selection, explains rejected editor transitions and retains the mounted lens draft. Selection remains per canvas, independently restored through native workspace state; it is neither a saved lens nor a global default.

A view change is a presentation/session change. It must not alter semantic signatures, trigger a vault rebuild, reload parsed bodies, reset native document sync, append a fake navigation visit or reset global lens definitions.

## 10. Rendering and scale

Reuse node cards, style resolution, selection, hit testing and native-editor overlays. Do not require a DOM ThoughtNode with four visible gates for every point on a vault-wide map. Support a representation capability: detailed thought occurrences and compact points can share semantic identity/actions while exposing different affordances at different zoom levels.

The initial PR only needs the existing detailed renderer plus a contract that does not force detailed DOM nodes everywhere. A production compact layer is a bounded follow-up prerequisite for large Emergence maps. Evaluate a batched Canvas/SVG layer using actual counts and profiles; do not replace the Classic renderer or introduce a general renderer-backend framework speculatively.

Visibility/culling, labels, images, gates and evidence must stay demand-driven. No force simulation, corpus scan or global classification on every animation frame. New geometry/interpretation caches use explicit input revisions, view settings and viewport dependencies, not arbitrary serialization of plugin.settings or the entire graph.

## 11. Initial implementation checkpoints

### P0 — Characterize the existing view

Trace the actual callers and preserve fixture outputs for Classic membership/order, sibling derivation, caps, section/group occurrences, gates/cross-links, geometry, density and device profiles. Record the before-state and relevant performance/work counters with equal input fixtures. Inspect current branch changes; do not assume the research baseline remains latest.

### P1 — Establish the narrow definition boundary

Add internal contracts, static registration and a per-surface selected-definition seam through the existing shell. Implement only the capabilities exercised by Classic and the probe. Keep native session, ActionManager, search/filter/lens and Sidecar owners intact. Add import-boundary tests; no raw GraphIndex/plugin escape hatch in the new definition interface.

### P2 — Extract Classic projection and policy

Move fixed neighbourhood assembly, sibling projection, area definitions, layout decisions, tint geometry, area sizing and Classic control definitions behind `classic`. Keep semantic resolution and index preparation unchanged. Adapt existing getNeighborhood callers through one projection implementation. Split measurement/renderer mechanics from layout policy rather than moving the entire host component into core.

### P3 — Parameterize shared scene infrastructure

Replace fixed area maps at the shared boundary with descriptors; introduce occurrence endpoint identity, explicit default selection and editor/framing anchors. The current editor anchor positions the attention document only; it does not establish an independently bound editor document. Complete the occurrence-editor prerequisite before claiming that capability. Reuse shared grouping, navigation, node, connector, drag, hover and editor mechanisms. Preserve all Classic interaction semantics, including normal/expanded/section/editor modes and one-sided arrangement.

### P4 — Finish lifecycle and preference compatibility

Implement view-instance retirement, unknown-ID fallback, bounded per-view session state and selector registration. Preserve Classic storage and device/surface precedence. Ensure switching does not remount the shell/Sidecar, duplicate listeners or begin unrelated semantic work. Add fault/stale-result/unload tests.

### P5 — Prove the boundary and hand it off

Run a test-only definition with three arbitrary areas, two occurrences of one canonical note, an off-centre attention/editor anchor, a layout root different from attention, and a decorative non-semantic edge. It must use the same search/filter/group/keyboard/activation lifecycle without Classic imports. Test a capability-unavailable corpus request; do not pretend a fake data provider proves a production corpus reader.

Complete required checks, update durable architecture references only with actually implemented decisions, and record pending native/device evidence honestly. Publish a specific validated foundation commit for both feature agents. Do not mark the whole extraction complete after P1's registry alone.

## 12. Shared data gate before parallel feature development

Mind Map needs bounded multihop expansion beyond the present first-level projection. Ideaverse needs a corpus and evidence-specific metrics. These are different demands on shared reads.

Before handing out independent feature branches, complete the mandatory [occurrence-editor hosting prerequisite](PLEX_OCCURRENCE_EDITORS.md) and its R/A/B native proof. The preparation owner must also deliver a **capability matrix** against the actual index/source interfaces:

| Need | Baseline finding | Required decision/delivery |
| --- | --- | --- |
| Canonical identity, labels, basic file facets | Existing GraphNodeView and presentation/search adapters. | Reuse through bounded view reads. |
| Local resolved roles, evidence and coverage | Existing index/requested-neighbourhood owners. | Narrow adapter preserving revision and demand lifetime. |
| Mind-map expansion | Existing local neighbourhood mechanisms, not a demonstrated general traversal port. | Bounded frontier expansion through those owners; limits, cycle handling and cancellation tests. |
| Corpus membership and numeric/date properties | Search vocabulary/property sources exist; no demonstrated general view corpus port. | Explicit revision-scoped paged/read capability, with scope and unavailable states. |
| Exact body/up/related degrees and navigation suppression | Generic candidate degrees are not these metrics. | Reuse canonical source/evidence facts; verify required provenance is available without re-parsing. |
| Linked-line density and other text features | Not established as a reusable current metric. | Separate reviewed neutral-fact extension if needed, or explicitly agree a reduced scoring profile before implementation. |
| Large-map rendering | Current renderer is detailed-node oriented. | Bounded shared compact layer before promising full-vault Emergence scale. |

**These gaps are not authorization for an index rewrite in the Classic extraction.** P5 may complete with unsupported advanced capabilities reported truthfully. Before both product agents start, resolve the necessary minimal read/metric/compact-rendering gaps in a small shared follow-up, using the same owners and independent validation. Alternatively the Ideaverse agent can start pure scoring/layout tests against fixtures while the shared owner completes that prerequisite; it must not ship a private scanner as a workaround.

Do not call an approximation reference-compatible. If exact Emergence classification needs a new canonical derived fact, that dependency must remain visible in the plan and acceptance criteria. Incomplete corpus coverage cannot certify global top-N, percentile placement or the absence of links.

## 13. Parallel assignments

After the validated shared boundary and required capability decisions:

**Agent A — Mind Map:** own the mindmap policy/UI folder, fixtures and tests. Deliver two-sided child hierarchy, deterministic branch placement, bounded expansion, repeated occurrences/cycle termination, explicit reroot, optional real cross-links and shared editor/Sidecar/search/actions. Characterize selection versus reroot and native follow. No parser/index/host lifecycle forks.

**Agent B — Ideaverse Emergence:** own the ideaverse policy/UI folder, pure score/level explanations, corpus-metric adapter consumer, five-band geometry, folder/time axes and tests. Pin reference behaviour to 4cce3f2. Cover body versus property links, duplicates, navigation blocks, missing dates, equal scores, tiny corpora, partial coverage and unchanged classification under display filters. Start Gravity only after Emergence acceptance. No embedded copy of mapApp.js, scanner or separate UI settings infrastructure.

Both branch from the same accepted commit. Each PR adds its own built-in registration entry; shared contracts and shared renderer/read capability changes stay with one preparation/integration owner. Resolve requirements through a small shared prerequisite rather than each agent editing PlexGraph, GraphIndex, settings and ActionManager independently. Keep localization changes namespaced and review both implementations together for duplicated infrastructure before merging.

The Mac/Windows split is useful for host validation but does not replace tests on both platforms. Do not copy platform-specific input assumptions into portable policies.

Wu Xing follows as a third real consumer. Its contract probe already guards against a permanent geometric centre and a universal tree/area model.

## 14. Acceptance and validation

Use existing tests rather than replacing their expectations wholesale. Relevant current suites include layout-density, relation-groups, filtered-gate-counts, node-partial-counts, internal-hotkeys/action integration, viewport-fit, plex-session, structural-node-drops, node-link-drag, compass-background, localization and the source-requested-neighbourhood/publication tests. Confirm actual names/scripts in package.json at implementation time.

Required acceptance:

- Classic membership, order, caps, relation precedence, grouping, sections, labels/styles, geometry, gates, cross-link behaviour and semantic edit intent match the characterised baseline.
- A non-Classic probe runs through the common renderer/interaction path; shared code contains no hidden fixed-role/five-area routing required by every definition.
- Duplicate occurrences select/reveal independently and write only to explicit canonical endpoints; a derived/decorative edge never becomes a writable relationship.
- Pure projection/layout and module registration produce zero vault reads, parser calls or semantic publications. Switching a same-scope view adds no acquisition beyond the existing live-demand policy. A genuinely new scope requests only its explicit bounded demand.
- Keep/Reflow, matching before grouping, filtered counts, hidden evidence, partial counts and unavailable corpus metrics remain truthful.
- Same-view paint/hover/camera changes retain relevant geometry/metric caches. Closing or replacing a definition retires demand and late continuations; no listeners, native leaves or running animations leak.
- Native editor, supported embeds, Sidecar ownership/follow/folding, saved global pins/history and per-session Footprints survive. Two native Plex sessions can use different definitions independently.
- Unknown/malformed state falls back safely, legacy Classic settings and device profiles round-trip unchanged, and unsupported capabilities produce a clear localized result.
- New code follows TSDoc, architecture/import, component-reuse, localization, owning-document and accessibility rules.

Run `npm run verify` on the required Node 22.22.2 with real dependencies. Run relevant browser tests and exact-build native scenarios using the guarded disposable Obsidian vault and repository workflow. Existing `verify:obsidian:plex-sessions`, `verify:obsidian:groups`, action/workflow, sections, editor and Sidecar lanes are starting points; select those affected by the actual diff. Do not treat browser DOM tests as proof of native host behaviour.

Highest-value manual/device checks after automation: (1) Mac and Windows modifiers plus embedded-editor focus while navigating/switching; (2) independent main/popout Plex/Sidecar pairs across switch, close and reopen; (3) tablet/phone touch, overflow and cancellation under a dense scene. Record unsupported or unrun cases, not assumed passes.

No runtime implementation, build, automated tests or Obsidian validation were performed when preparing this document. Source review and research are design evidence only. Documentation changes require content/link/whitespace review; runtime gates above apply to the agent's implementation.

## 15. Later public API

Validate the internal boundary with Classic, Mind Map and at least one non-tree view before committing to a public contract. External registration can then add version/capability negotiation, namespaced settings migration, bounded work, explicit disposal, safe fallback and documented read/action privileges. Keep read, derived presentation, navigation and writes distinct, consistent with #132.

Third-party JavaScript in the Obsidian process should not be advertised as a security sandbox merely because it uses a narrow API. Distribution, trust/consent, dependency compatibility and update handling need their own design. Loading/downloading external code is outside this PR.


## 16. Implemented boundary and capability matrix

The runtime baseline is accepted main `659697a686f341497725dfb31e94a8bc2bcf2b25`.
`src/core/plex/views/` owns the finite internal definition/registry contracts and
Classic projection/geometry. `GraphIndex.getNeighborhood()` delegates to the same
`projectClassicNeighborhood()` policy used by Classic's portable projection;
classification, visibility, provenance and canonical publication remain index/core-owned.
The host Classic adapter premeasures existing thoughts, calls the definition's
layout and binds canonical pages/styles, sibling edges, sections and cross-links.
Existing `ui/layout.ts` and `ui/relationGroups.ts` exports remain delegates.

`ui/plexViews/` supplies bounded cache-only reads, measurement, occurrence/edge
binding, grouping and area repacking. The Classic contribution owns fixed areas,
legacy heights, grouping partitions, labels, compass tint geometry and layout
controls. The shared renderer consumes arbitrary area descriptors and explicit
entry/editor/frame occurrence IDs. Attention and layout root stay distinct.
Canonical semantic edges retain exact occurrence and node endpoints; derived or
decorative edges cannot use relationship writers. Gate write intents and count
placement follow explicitly declared physical ports.

`PlexViewSession` belongs to each existing native document session. It owns static
view selection, bounded JSON preferences and namespaced area heights through the
native workspace writer. Camera/selection/unfolded groups stay transient in that
session and retire on attention change. Global pins/history, Footprints, Sidecars,
native editors, the shared shell and Classic flat/device/surface settings retain
their existing owners. A live editor prevents selecting an incompatible view;
compatible changes and a failed/unavailable policy retain its native host. The first host anchors the existing attention document to an admitted occurrence of that document; changing the edited canonical document is not a layout operation. Scene recovery
uses only the current canonical attention and offers Classic locally. Prepared
actions and delayed destructive work must match both native and view lifetimes.

| Capability | Actual first implementation | Limit / prerequisite for another view |
| --- | --- | --- |
| Canonical nodes and local resolved relations | Revision-scoped cache-only `PlexViewRead`; bounded calls and returned incidence, visibility preserved. | Coverage is conservatively cached. Missing/budget-exhausted node reads are unavailable, never proof of absence. |
| Evidence | Cached canonical relationship explanation DTO, preserving decisions and source provenance. | No new corpus-wide evidence/metric scan or exact global degree API. |
| Scope preparation | Existing shared attention demand stays acquired across compatible changes; presentation demand is view-owned. | Additional multihop/frontier demand needs a separately reviewed bounded application adapter. Pure definitions cannot acquire sources. |
| Geometry and identity | Measured thought occurrences, repeated NodeIds, arbitrary areas, physical ports and distinct anchor IDs/positions. | Editor document identity still follows attention. Synthetic groups are created by the shared grouping owner; initial policy-created synthetic nodes are rejected. |
| Occurrence editor hosting | **Unsupported.** One live attention-following native editor per Plex; existing probe places it off-centre but edits attention. | Firm prerequisite: explicit admitted occurrence/document bindings, shared actions, per-occurrence dimensions and stable native hosting. Initial dependent task enforces capacity one and must pass R/A/B plus attention C, duplicate, resize/filter/collapse/switch/teardown cases. Multiple simultaneous editors are not claimed. |
| Rooted state across attention changes | A pure definition can supply a different layout root. Current transient camera/selection/unfold state is attention-scoped. | Mind Map requires independently retained root/branch/editor state through M0. Existing attention-following definitions, including Wu Xing, may use the accepted host without adopting M0. |
| Filtering/grouping/Find/actions | Existing matching and grouping owners; explicit grouping partitions; occurrence selection/reveal; canonical activation/writes. | A connector without semantic evidence is presentation-only. No implicit ontology write from an arbitrary area. |
| Preferences/lifetime | Per-native-session selection, small unknown-state preservation/fallback, finite area heights, synchronous disposal and epoch fences. | Static bundled registration only; no public plugin loading or ABI. |
| Type configuration and Settings | Version1 bounded schema/effective values, native declarative contributions under Canvas behavior → Views, existing queued persistence and explicit incoming field ownership. Compass (`classic`) retains legacy flat/profile/appearance storage. | Type settings are shared by canvases of that type; selected view/root/expansion/editor state remain session-owned. Unknown/future payloads are inert and preserved. |
| Canvas selector | Native Canvas view dropdown in Views and lenses, capturing the opening session and reflecting successful guarded selection while retaining the panel/draft. Compass alone remains visible/disabled. | Only registered production definitions ship; test definitions prove independent owners without exposing unfinished views. No new source acquisition for same-scope selection. |
| Corpus/property scoring | Explicit `corpus: {available:false, reason:"unsupported"}`. | Add paged revision-scoped membership/properties and provenance-specific metrics before promising Ideaverse parity. No zero substitution. |
| Compact large-map layer | Explicitly unsupported. Point occurrences fail locally. | Shared compact rendering must be reviewed before full-vault Emergence. Detailed DOM thoughts are not a scale claim. |

The test-only situated definition has three arbitrary areas, two independently
selectable occurrences of one canonical note, an off-centre attention/editor,
a different layout root and a decorative guide. It imports no Classic policy and
is never registered in the production selector. Its browser/native fixtures are
architectural proofs, not implementations of Mind Map, Ideaverse or Wu Xing.

See [PR215 validation](validation/plex-view-plugins-215-2026-10-24.md) for actual
commands, frozen baseline, failures, native evidence and remaining device limits.
The C15–C26 structural programme remains paused.


## 17. Maintainer steer: occurrence editor hosting

Arbitrary-node editing is required for Mind Map: root R and attention A must coexist
with an editor bound to occurrence B, and changing attention to C must not retarget
B. Current #215 does not support this. The one-editor size, native overlay/document
selection, camera/framing and native focus/navigation seams make safe runtime
decoupling a separate host checkpoint rather than a guard removal.

Following the maintainer's permitted closeout path, finish the verified extraction
and complete [the bounded dependent task](PLEX_OCCURRENCE_EDITORS.md) for
Mind Map's arbitrary-node editing. Wu Xing is independent after #218 and may
implement and validate its complete view with the existing attention-following
native editor. M0 must extend that host compatibly, without requiring Compass
or Wu Xing to adopt its new API simultaneously. It specifies an occurrence-keyed binding collection with
capacity one, Classic compatibility policy, real native-host reuse, independent
root/attention/selection/editor/focus state and the five required proof cases.
It does not implement Mind Map, simultaneous editors or new indexing machinery.
Do not describe arbitrary-node editing as supported until that proof passes.
