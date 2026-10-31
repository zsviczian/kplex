# All-view Markdown export, ontology and preview follow-up — PR #238

## User-visible changes

Markdown preview retains its accessible name through the existing shared visually hidden label and `aria-labelledby`. It has neither an `aria-label` tooltip nor an HTML title.

PNG resolution changes retain the old decoded preview until its replacement is decoded. Native image dimensions use logical scene bounds rather than output resolution. Pending changes use `aria-busy` without temporarily inserting a loading line. No modal-specific CSS is introduced.

Markdown export now accepts any constructed canvas, including Compass, Mind Map and Facets. Central-node menus and the published command reuse the same service. Explicit branch/section parents remain intact. Other connections form a bounded rooted outline; non-tree connections use Builder crosslinks. Existing Compass depth-two descendant strips and repeated occurrences are captured without another graph query or projection. Filters and collapsed branches still constrain content. Disconnected rendered components remain outline entries; decorative point anchors do not become invented notes.

The ontology dropdown defaults to visible labels and offers none, visible only, or all including non-displayed labels. Choices project the same immutable snapshot. Driving ontology comes from the resolved relationship definition and the canonical active Connection details decisions. It does not come from whichever field happens to be first. Joint drivers keep their existing combined label; additional active ontologies become separate labelled crosslinks without subtree duplication. Overridden evidence remains excluded. Unlabelled crosslinks never borrow a target's unrelated parent ontology.

`activeOntologyFields` is shared with Connection details. No evidence classification or precedence algorithm is changed. The Markdown command uses its current canvas center rather than requiring shared/global note attention; explicit menu occurrences and selected-branch behavior remain supported.

All new/changed copy is localized in all eight supported languages. Native Obsidian Setting controls, the shared modal shell and existing preview styling remain in use.

## Risk assessment and validation

This changes export projection/formatting, cached-label presentation, command targeting and preview publication. It does not change indexing, source acquisition, persistence, cache schemas, scheduling or graph classification. Focused formatter/importer, action, localization, core, architecture and actual native checks are appropriate; no full indexing suite was run.

- 152 focused export/browser, action, relationship and localization tests passed before the final isolated unlabelled-crosslink correction.
- The final formatter/localization rerun passed 37 checks, including that correction. The actual pinned Builder importer reconstructs primary labels and additional labelled arrows without adding duplicate nodes. It also covers hidden/visible/none choices, joint drivers, cycles, repeated notes, section parents, disconnected components and field ordering independent of the driving definition.
- 41 action-foundation checks pass after canvas-owned command targeting, including a rendered canvas with no shared attention note and explicit node-menu targets.
- 130 host-free core checks, nine architecture checks, numeric-control ownership checks, production build and Obsidian lint passed. The final changed command/export modules passed targeted lint again.
- Native detailed PNG acceptance passed 28 cases, including all view/theme/zoom combinations, save/copy, popout ownership, cancellation and editor preservation. Five geometry samples across 3× → 1× → 2× retained the same native dialog rectangle within the existing one-pixel assertion. Preview naming without tooltip attributes was checked. PNG implementation files remain unchanged in the final command-targeting correction.

The final package passed nine native Markdown cases with cleanup on macOS Obsidian 1.15.0 (installer 1.14.0), Node 22.22.2. These include menu/palette execution, native save bytes, successful copy/close/Notice, folds, filters, independent popout ownership and all three ontology choices in all three views. Compass depth-two descendant strips and repeated occurrences were present. Each guarded export interval observed zero body reads, parses, acquisitions, rebuilds or semantic refreshes.

A final PNG recheck rejected an unfinished capture with “This canvas changed”; cleanup passed. Earlier final-package attempts also encountered fixture settling or capture time limits. These are failed checks, not passes. The successful 28-case PNG matrix predates the final Markdown-only corrections. Its recorded PNG module hashes and stylesheet still match the deployed package exactly. We retain that evidence and the focused browser pixel checks, without claiming an exact-final-bundle native PNG pass or relaxing capture consistency/deadline guards. A changing-canvas capture can require reopening the dialog.

The authorized live vault deployment atomically replaced only `main.js`, without backups. Settings and enablement bytes were unchanged; one existing K-Plex view was restored and both export commands were registered. A read-only follow-up confirmed startup completed and the deployment controller was removed; the retained background leaf remains deferred, without forcing it to render. Final artifact SHA256:

- `main.js`: `48ea4e4b6a9f19163940b045240ae8a61ae47a73b4cba37b366bc9053c288bfe`
- `styles.css`: `283377bded131545f57adf5f4730a4697203bf2fca66d6f17eb066d9bf32d65a`
- `manifest.json`: `2822c38463c03ace4f017453679572d462534ce2a9c9558fd7593f259b01bfa1`

[Sanitized native receipts](markdown-all-views-ontology-238-2026-10-31.json) distinguish successful runs from the final rejected PNG capture. Raw development logs/images remain in `/private/tmp/kplex-export-ontology-*`. The follow-up commit uses `[skip ci]` because the aggregate workflow always runs the full indexing suite; focused checks above cover this export-only risk assessment, and no workflow or assertion is disabled.

## Fixture findings

An early all-mode assertion incorrectly compared the saved `Child` spelling against K-Plex's normalized `child` identity; the comparison now uses the same case-insensitive identity. Several disposable-fixture setup attempts did not settle; one failed its settings-byte cleanup check. Those attempts are not counted as passing. Subsequent settled runs passed cleanup.

The extended command test also exposed a fixture-only task-order race: it programmatically closed a command-opened modal before asynchronous dispatch had transferred its session guard. The probe now yields one browser task before that synthetic Cancel, matching real user input. Production session guards and deadlines are unchanged.

## Remaining limits

The original Markdown escaping/resource limits and image fidelity/scroll-clipping limits remain. Non-tree views export an outline of constructed content, not a new semantic hierarchy. Physical mobile, minimum-host, other desktop operating systems and native destination/overwrite-picker interaction remain separate environments. Pinned-importer compatibility is an actual importer run with finite drawing-operation observers; it is not a new full native Builder UI/layout acceptance run.
