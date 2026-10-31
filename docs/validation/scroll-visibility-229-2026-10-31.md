# Scroll connector visibility and bounded canvas painting — #229 / PR #243

## Problem and change

Ordinary connectors were admitted for every constructed row and painted from a visible hub to clamped boundaries even when the other card was entirely outside its scrolling aperture. A large list therefore retained a fan of hidden-row links. The shared endpoint painter now requires both ordinary cards to intersect their apertures. Partially clipped cards remain eligible. A constructed tree parent can retain a boundary continuation for its visible child; the explicit occurrence-parent IDs grant this exception, independently of ontology, arrow reversal or canonical relationship direction. Hidden leaves and two wholly hidden cards paint no route. Stroke, markers, caption and hit path retire together. Canonical scene edges remain admitted for navigation, filtering and export.

The reported missing-card view had valid card geometry and hit tests, and exposing the native window repainted it without data/navigation changes. Its exact stale-frame trigger was not reproduced deterministically. The presentation correction bounds compositing work: scene opacity animates the real canvas clip rather than the zero-sized camera’s potentially very large overflow, and per-card motion only acquires animations for cards intersecting both the canvas and their scroll aperture. Hidden documents acquire no per-card motion. All constructed DOM rows and layout records remain available; this is not virtualization or a graph/index change. Native pixel acceptance below verifies the candidate paints real cards, but is not proof of every original stale-frame trigger.

No new UI controls, components, user copy, settings or persisted schema are introduced. Existing shared geometry and scene owners remain in use.

## Risk assessment

Changes are presentation-only in `PlexGraph`, `areaVisibility` and the existing fade CSS. Indexing, source acquisition, graph semantics, storage, startup scheduling, camera/navigation and editor ownership are unchanged. Focused geometry, actual-view browser, build/lint/architecture and synthetic native scrolling/pixels are appropriate. No full indexing suite or aggregate verification was run. The commit uses `[skip ci]` because the aggregate CI workflow always runs that expensive suite; no workflow, assertion or production deadline is disabled.

## Validation

- Node 22.22.2 production build against installed Obsidian typings: passed.
- `npm run lint:obsidian`: passed after CSS/presentation changes.
- `node --test tests/viewport-fit.test.mjs`: 30 passed. Covers ordinary hidden-row suppression, explicit ancestor continuations, partial cards, fixed forests, visible-endpoint policy, unchanged geometry, clipping and hidden-document/per-aperture animation admission.
- `node --test --test-concurrency=1 tests/view-interactions-browser.test.mjs tests/wuxing-browser.test.mjs`: 33 passed. A 300-row Compass retains its complete constructed content while routes match exact intersecting-row identities through top/middle/bottom scroll. Friends and Facets diagnostics follow the same policy. The bounded hierarchy keeps visible children linked to its scrolled-offscreen parent. Dense navigation has no camera-wide opacity animation and does not animate every clipped row; the canvas still uses the shared fade.
- `npm run check:architecture`: nine checks passed; 220 migrated roots, 409 reachable files, zero violations; numeric controls remain shared.

The initial browser run passed 32/33: one old Compass assertion still demanded all hidden-friend links. Its expected behavior was explicitly updated to the requested #229 policy, including exact visible route identities and restoration on scrolling; the full focused rerun passed.

The exact package passed three native cases with cleanup on macOS Obsidian 1.15.0 (installer 1.14.0), Node 22.22.2:

- 60 constructed rows, with only ten visible rows acquiring motion.
- Exact route/card identity at top, middle, bottom and top again: ten intersecting rows/routes each time, preserving camera and center.
- Three native card pixel samples matched the computed magenta color exactly: expected and actual `[255, 0, 255]`.

The explicit occluded diagnostic was used; original background throttling was `true` and was restored in cleanup. It supplies functional native pixel evidence without a foreground/performance claim. [Exact artifact/module hashes and native receipt](scroll-visibility-229-2026-10-31.json) retain those qualifications.

## Native probe and limits

`scripts/testing/obsidian/scrollVisibility229.mjs` owns 60 empty synthetic notes in one disposable folder and one native view. It compares actual intersecting cards against native route identities at four scroll positions, checks bounded animation ownership and compares fresh native bitmap card pixels with computed colors. It restores settings/workspace/native sessions, removes all fixture notes/folder, and checks configuration bytes through the shared controlled-probe owner.

The selected native renderer can remain occluded even when its window reports focused. Normal foreground attempts refused pixel acceptance and passed cleanup. The explicit `KPLEX_229_OCCLUDED_DIAGNOSTIC=true` lane capability-checks Electron’s background-throttling getter/setter, retains the original boolean, disables throttling only for capture and restores it independently in cleanup. Its pixels are functional native-rendering evidence, not foreground/performance evidence. No such capability is added to production. An early color sample was outside the outer canvas clip over the sidebar; sampling now requires a full card inside both the canvas and scroll aperture, retaining the same pixel tolerance. Failed attempts are not counted as passes.

Remaining risks: the precise original stale-frame trigger remains unproven; native popout, physical mobile and other desktop operating systems were not newly exercised. Existing source/camera/editor behavior is covered by the focused regressions. Repeated dense-list navigation/Wander plus window hide/reveal on the affected host is the priority follow-up before merge.
