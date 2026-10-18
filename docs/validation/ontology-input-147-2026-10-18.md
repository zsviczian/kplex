# Ontology input commit cadence (PR #147)

All seven relationship-field textareas now retain local drafts and commit after
750 ms idle or confirmed-text field/page exit. Persistence precedes live semantic
publication. Integrated `main@658793f` without rewriting (`183a948`); runtime fix
`af31fc9`, fully verified runtime/tooling `c7cd196`. Final documentation leaves
those inputs unchanged. The maintainer authorized merge and continuation to #179,
#149 and #176 on 2026-10-18. No release, branch deletion or personal-vault access.

## Finding and delivered behavior

The old native control called the settings writer for intermediate input values.
A Small-vault probe delivered 14 trusted inputs / 14 callbacks and observed 12 writes,
12 invalidations/semantic refreshes, 35 acquisitions and 0 parses after blur.
The installed baseline `dbe5317` has the same runtime source as merged main658793f;
main.js SHA-256 `75177091ce58f6e70a214954fb33224767e75208ea8defa32bf8bcc9af48e425`.
The legacy `saveSettings(true)` argument does **not** itself request a full rebuild.

A final trusted 22-character burst produces these functional counts in each actual
session, on a three-note fixture with main, sidepanel and popout views:

| Work | During typing, both modes | Final On-demand commit | Final Eager commit |
| --- | ---: | ---: | ---: |
| Durable writes | 0 | 1 | 1 |
| Policy invalidations / semantic refresh calls | 0 / 0 | 1 / 1 | 1 / 1 |
| Presentation refresh calls | 0 | 1 | 1 |
| Source acquisitions | 0 | 3 | 0 |
| Vault body reads / parses / full builds | 0 / 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 |

The fixtures/burst lengths differ from the earlier probe. This demonstrates a
bounded commit boundary, not matched CPU, memory, storage-total or latency savings.
No comparative performance campaign ran under the competing machine load, and the
reporter's macOS near-freeze has not been reproduced. Genuine final ontology work
remains required and may still be expensive on a large/background-busy vault.

The shared `TextSettingDraft` retains one submitted operation plus the latest
unsubmitted field value. It preserves normal caret/text, suppresses IME preedit,
flushes confirmed text on page replacement, retains failed drafts across Settings
reopen, and distinguishes Retry from saved-but-refresh-pending. Remote-owner and
same-field comparisons reject stale edits. Disposal cancels unsubmitted clocks
and callbacks; accepted writes may finish after a row closes.

`OntologyFieldControl` reuses native Setting/TextArea/Button controls, localized
names/descriptions and explicit document/window cleanup. `updateOntologyField`
uses the existing settings queue, accepted-snapshot reader and durable writer;
other field/style/action/consent edits retain their ownership. Semantic refresh
runs outside the disk queue. No parser/compiler/index scheduler or persisted
format changed; C14 remains intact. All eight locales are maintained.

The first native candidate `3743bfb` exposed an additional Retry failure. Failed-write
read-back normalized unchanged accepted data, sorted a list and manufactured a
remote conflict. A red regression reproduced it. The narrow reconciliation guard
now keeps the validated unchanged predecessor and any genuine incoming candidate;
31 ontology/external-settings tests pass. The failed native trial is retained.

## Verification and limits

Node 22.22.2, real dependencies and installed Obsidian types: `npm run verify` passes
architecture 7, core 130, main 1061, UI 177, portable sources 334 and source/IndexedDB
browser 623, plus official Obsidian lint and production build. These group totals
include overlapping coverage. [CI at `c7cd196`](https://github.com/zsviczian/kplex/actions/runs/39165780593)
also passes (19m22s); the final documentation-head CI is not awaited. Fourteen focused browser regressions cover the
production controls/writer, concurrency, no-view saves, storage/supersession,
composition and teardown. Removing idle submission or the field guard makes its
negative-control test fail; source bytes restore exactly.

Exact Windows 11 / Obsidian 1.14.4 (installer 1.14.0), Electron 43.3.0 native acceptance:

| Lane | Actual outcome |
| --- | --- |
| Exact staging/smoke | Pass; completed full-verification receipt reused at identical clean source/artifacts |
| Ontology Settings, actual On-demand and Eager | 7 cases each pass: trusted typing/caret, stationary Parent in three views, page exit/reopen, storage Retry, synthetic composition, refresh-pending, no-view save and plugin reload |
| External settings / style operations / migration | 6 / 15 / 6 cases pass |
| Markdown autosave and Parent removal | 4 normal/embedded-editor cases pass |
| Touch | 9 functional cases and preference reload pass; geometry setup fails at 317.5x599.86 instead of 320x600 |
| Hover | Stops before assertions: parsed synthetic wikilink/physical target exist, native resolved-link records and rendered relation absent; fresh identities, native opening and foreground controls also fail |
| Gate/filter | Keep/crosslinks-on case passes; later unchanged-revision guard fails (semantic 51 to 60, source 31 unchanged), with incremental-file publication traces after a genuine pre-filter quiet interval |

The combined matrix is **not wholly green**. Its hover, geometry and gate failures
are preserved without relaxed assertions/deadlines, forced source-current stamps
or unrelated runtime patches. They do not exercise the new ontology writer;
their causes remain unproven. Review the publication traces with #179's separate
post-save liveness investigation; do not equate them with a reproduced renderer
freeze. Native migration keeps its original oracle; a private adapter reuses the
completed full run after checking revision, clean tree and artifact/log hashes.

Original 107 files / 88 Markdown notes, configuration bytes, workspace and follow owners are
restored. Final sanity confirms exact installed artifacts, no owned controllers
or dialogs, desktop mode and the original detached CLI debugger. The initial
sanity correctly rejected the idle CLI capture left by verification; it was
released and the final check passes.

Remaining acceptance: (1) the reporter's macOS/French/large-vault workflow with
background contention; (2) physical phone/tablet IME and touch, since composition
and paste were synthetic; (3) minimum-host/native Settings window migration.
Windows evidence does not establish those results. #179 owns shared post-save
liveness; no further optimization or blanket freeze-resolution claim is included.

## Reproduction and private evidence

Run `npm run verify`, stage the exact build using CONTRIBUTING's disposable-vault
workflow, then `npm run verify:obsidian:ontology-input` with all three explicit
Small-vault variables and a fresh report directory. Repeat with
`KPLEX_ONTOLOGY_INPUT_MODE=on-demand` and `eager`; the reusable lane restores the
original session/configuration. Fixture source and injected faults are in the
script; no manual cache stamping or extra build is needed. Plugin reload is not
whole-process restart; synthetic events are not physical IME/clipboard acceptance.

Tested main.js SHA-256:
`615f388c2156369d0f3d1a44a7960d5422e562535d735a0a1a22b31d05056eed`.
Full verification log SHA-256:
`467e3b42a20bf8552e494f9a02d9d018e6ddbd620b92ce44f658db15a56cef34`.

All raw runs, failures, negative controls, exact source/build references, fixture
instructions and configuration backups remain private at
`%LOCALAPPDATA%/KplexValidation/ontology-input-147-20261018-1792359600964`.
Its 169-file immutable base and 6-file append-only supplement are reverified by
per-file SHA-256; source ZIPs also pass CRC/per-entry checksum checks. HANDOFF and
scripts containing its body are excluded. Originals remain in Temp; nothing was
published or deleted. `MANIFEST.json` SHA-256:
`ed1b5a7af03d6ba7956c15c4f5ad1bb69f2a74e72fa887cbe1472b3993aa4dd1`;
`FINAL_RECEIPT.json` SHA-256:
`862499ae790484bbe733e419067d5ac01b769bb776f88e51ca4c0d79c3c867d0`.
