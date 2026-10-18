# Ontology input commit cadence (PR #147)

All seven relationship-field textareas now retain local drafts and commit after
750 ms idle or confirmed-text field/page exit. Persistence precedes live semantic
publication. Runtime correction `af31fc9` is integrated with main #183 at
`1137fc1`, with native gate-readiness tooling at `b392d14`. Subsequent integration
`b794bff` adds main #148 release metadata without changing production source. The maintainer authorized merge and continuation to #179,
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
| Settings writes | 0 | 1 | 1 |
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
architecture 7, core 130, main 1069, UI 180, portable sources 334 and source/IndexedDB
browser 632 at clean combined `1137fc1`, plus official Obsidian lint and production
build. After #148 integration, its 58 release-metadata tests, metadata check and
real build pass; both test inventories remain present. Production source is
identical to `1137fc1`; rebuilt JavaScript differs only in its public build ID
(verified byte equality after replacing that one identifier). These group totals
include overlapping coverage. [CI at `c7cd196`](https://github.com/zsviczian/kplex/actions/runs/39165780593)
also passes (19m22s); this is historical CI, not final-head CI. Final-head CI is
not awaited, as requested. Fourteen focused browser regressions cover the
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
| Touch (historical `c7cd196`) | 9 functional cases and preference reload pass; geometry setup fails at 317.5x599.86 instead of 320x600 |
| Hover, combined build | 11 cases pass, including canonical preview orientation/geometry in main and popout; three measured preview intervals show zero reads/parses/acquisitions, semantic events, search work or settings writes |
| Gate/filter | Unchanged source/semantic-revision guard still fails after initial quiet; combined run records 10 incremental-file publications and no completed scenario. Earlier `c7cd196` completed Keep/crosslinks-on before its later guard failed. Cause remains unproven |

The combined matrix is **not wholly green**. Gate and historical touch-geometry
failures remain preserved, without forced source-current stamps or unrelated
runtime patches. Review the publication traces in #179; they do not prove a
whole-renderer freeze. Earlier hover trials lacked native resolved-link fixture
facts. The combined run progressed, then exposed native input arriving after a
previous node's preview was sampled. Two readiness predicates now wait for the
expected canonical set; all independent exact-edge/orientation/geometry/no-work
assertions and deadlines remain unchanged. A private negative trial and successful
control are retained; the repository lane passes 11 cases and tooling tests 20.
This is a test-driver correction, not a production hover change. Native migration
keeps its original oracle; its adapter reuses the completed full run only after
checking identical clean revision and artifact/log hashes.

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
`96ae2f09efce197dfacecf0fa29760f1867bcd719b6714979283752f5e453cee`
(native-tested `1137fc1`). Metadata-integrated build at `b794bff`:
`321f0e227219ba4e1ca67f1ce9a808174963651ba95e0686e84c6b8336344ce8`;
only the public build identifier differs. Installed Small-vault build remains the
exact native-tested artifact.
Full verification log SHA-256:
`1f859e2d204ba0510a2b121a08202d95ea135d33e2cb88da1df6e197db5465df`.

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

The final combined evidence backup is private at
`%LOCALAPPDATA%/KplexValidation/ontology-input-147-combined-20261019-1792362256007`:
256 files, 14,944,140 bytes, verified per-file SHA-256, source ZIP 555 entries with
CRC/member checks. It includes the completed combined trials, failures and exact
source/build references through `b392d14`. Manifest SHA-256:
`e6aeaa7eba1af0bb77159b81c94e8233a59aa847d945fd2c160d75eb8ab5d90a`.
The earlier immutable backup and original raw files remain intact. No evidence is
published; HANDOFF is excluded. The later metadata-only checks have separate
private logs and a normalized-bundle equality receipt.
