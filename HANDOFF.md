# Standing instructions ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in the issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.




---


# PR #270 implementation handoff

Status: implementation complete on `2026-11-03-pins-preview-obsidian-uri`; maintainer explicitly authorized commits, push and PR updates. Keep PR #270 draft. Do not merge, release or close issues.

Preceding PR #272 was merged as requested (merge `f9d7acb3cdb4444ede180e1ee72666ba13772405`), then main was switched/fetched and merged into this existing branch. The accepted #267 ontology work is preserved. No other repository was changed, and production vaults were untouched.

## Delivered

- #266: canonical saved-order reordering, stable identities including missing entries, six-pixel handle threshold, insertion feedback, keyboard menu, stale-order refusal and document-owned cancellation.
- #265: opt-in Today/This Week/This Month, one fresh resolver for toolbar/picker/slots, optional existing Daily Notes configuration, exact lookups, local ISO/locale anchors, bounded cleaned refresh timer and truthful missing-note guidance. No automatic creation.
- #262: one primary hover-source registration; native IDs and existing preference/hover behavior retained.
- #263: canonical parser/worker/cooperative URI discovery, exact labels/identities, explicit native activation, web-only preview/Sidecar capability guards and bounded existing cache-family refresh. Known historical retired headers no longer stall the upgrade audit; incompatible facts cannot grant semantic authority.
- Added ontology typing fix: detached structural validation is reused during wording input; structural edits and Save still validate. Regression coverage includes 2,000 configured fields and reciprocal textarea value/caret preservation.

Code is split into reviewable commits. Ontology typing: `7f7e421`; URI/cache: `ab01d23`; final URI Sidecar controls: `d0d8dd0`. Documentation/validation/scaffold cleanup follows those checkpoints. The temporary PR scaffold is removed.

## Actual validation

`npm run verify` passed with Node 22.22.2: release consistency, architecture (9), portable core (133), Obsidian lint, main regression group (2,008), UI group (479), source repository (360), Chromium persistence (896), and the final installed-types production build. Reported failures/cancellations/skips were zero. All three final build hashes matched the binary used by the five final native lanes.

Focused recovery: 39 ontology/relationship checks, 240 grouping/image/drop/on-demand checks, and 78 final Sidecar/passive-follow checks passed. The final presentation-only Sidecar delta landed during the aggregate and additionally passed App lint, the installed-types production build and all five native lanes. Source/compiler/cache owners were unchanged throughout that aggregate.

All five native lanes passed serially on Windows Obsidian 1.14.5 with Node 22.22.2 in the existing disposable `C:/Obsidian/kplex-test-small` vault (117 files / 98 Markdown baseline), with the shared application lock. Configuration bytes, enablement, workspace and owned-file inventories were restored.

Batch-checkpoint native `main.js` SHA-256: `dc35387cd5c12b824e42f69dc749efc00724548792a96c4b5a321c8897b3f3b0`. CSS: `66114919b8771a5d6bb5e183c2c23e39a874d943fe23e5291640de80ed4168b5`. Manifest: `8c65b0d38a506f8fa9fc3311b81ea22bcda48e0209e9190483752c1f20834326`.

The native lanes cover pointer/keyboard reorder; zero-write cancellation including native close/migration; shared canvases; History grab scroll; controlled rollover/fresh picker/slots; actual settings dependencies; missing targets; one actual Page Preview row and contents in tab/sidebar/popout after reload; URI discovery/rendering/explicit opening with Web Viewer on/off; unavailable URI Sidecar opening with existing-close support; warm-cache reuse; and trusted Add/Edit/reciprocal description input.

Final warm URI reload: 8.29 s during portable verification, zero vault reads/parses/URL reads/full builds (earlier 2.96 s). Final maximum input DOM receipts: 71.5/40.2/24.3 ms during portable verification (earlier 24.9/10.6/9.3 ms). These are functional observations under varying load, not isolated paint or production-scale performance claims.

## Settings layout follow-up

The added scoped CSS fixes the cramped native Pins page: full-width period headings, left-aligned labels, compact toggles, responsive text/select fields, wrapping previews and removal of duplicate nested dividers. Native styling classes are the only runtime markup change; settings behavior and indexing owners are unchanged.

The old native build reproduced horizontal overflow. The final Settings lane passed 320/480/700-pixel widths in light/dark modes, with full headings, bounded fields, long-path wrapping, no render-time writes and zero source reads. Native toggles/opt-in and complete restoration passed. The actual native appearance was visually checked. Production build and focused settings lint passed; the earlier complete aggregate was not repeated for this isolated layout change.

Current artifacts: main `b58f67da43ca6f374d5c146aee24de58d953f170f1966282d519ade2ecd2ebd9`, CSS `4826da18f4c1abac6ce3aa85257b64c0c0e620e2531f861efe5716a6f29f72e8`; manifest unchanged. Final local receipt: `%TEMP%/kplex-270-native-Wb3UAa/pins-preview-uri-settings-270.json`. See the validation record for checkpoint separation and actual results.

## Evidence and review

Durable evidence/limits: [validation record](docs/validation/pins-preview-uri-270-2026-11-03.md). User behavior: [Pins](docs/PINS.md) and README. Reproduction/commands are documented in CONTRIBUTING; `npm run verify:obsidian:pins-preview-uri` selects `pins`, `settings`, `preview`, `uri` or `ontology` through `KPLEX_270_NATIVE_LANE`.

Local full log: `%TEMP%/kplex-270-verify-green.log`.
Batch-checkpoint native receipt directories under `%TEMP%`: `kplex-270-native-jCow1B` (URI), `kplex-270-native-ElcZTG` (pins), `kplex-270-native-e0Brzu` (settings), `kplex-270-native-id6RdZ` (preview), `kplex-270-native-yjvlZB` (typing). Earlier native reproduction/failed attempts remain separate from passing receipts.

Remaining platform/scale checks are the three prioritized checks in the validation record: physical touch; macOS modifier/URI/native dragging including OS-native menus; and a large disposable historical-cache upgrade followed by warm hydration. No whole-app restart or production-vault performance run was performed.
