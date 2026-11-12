# Standing instructions ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in the issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.






---

# PR #302: implementation and validation return

Implemented locally on branch `2026-11-12-authoring-workspace-bundle`.
HEAD remains `e78cd1a60968d1f20a39358c8c18e8eb571cc120`; accepted base is
`a560655902d00ed0ac23462d7c8d464ab0e165fd`. The starting tree was clean.
The maintainer has authorized a local branch commit. No PR/issue writes, push, merge or release are authorized by that request.
Earlier PR #301 publication authority was completed and does not extend to #302.
Keep #302 draft and issues #290, #184, #124, #118, #33 and #252 open.
The temporary `docs/agent-handoffs/authoring-workspace-bundle.md` scaffold is removed.

## Delivered behavior

| Issue | Implementation |
| --- | --- |
| #290 | An explicit canonical semantic-fingerprint map is the sole proof that an owner's semantics were already applied. A prewarmed body cache cannot suppress restored/new-owner reconciliation. All production GraphBuilder callers pass the map; historical omitted-map standalone behavior remains. |
| #184 | Explicit singleton connector captions include generic role words. Inferred/topology captions remain suppressed. Ordinary, expanded, export and Find readers retain the defined tier and pairing/showLabel rules. |
| #124 | The existing explicit palette command opens a real workspace tab on phones. Generic Open retains the phone sidebar default. Desktop/tablet split policy, command IDs and mobile popout restrictions remain. |
| #118 | Pinned Sidecar release through Off/Recent/unpin preserves the same native leaf, editor, history, selection and group. Recent does not immediately overwrite the released document with the canvas center. Late work cannot restore retired ownership. |
| #33 | Default-off "Also write inverse ontology" uses configured inverse fields and the shared writer for explicit Markdown authoring. Exact-file consent and per-file outcomes support retry of only the missing approved write/publication. Existing declarations and created notes survive partial failure. Relink retains independent reverse evidence. |
| #252 | One searchable Template combobox serves related-note, folder and placeholder creation. Optional bounded Markdown-folder discovery joins existing Excalidraw choices. Core substitutions, actual Templater completion/precedence, creation-kind restrictions, blank choices and remembered drawing selections are handled without browse-time execution. Daily Notes remains separate. |

Shared native fields, keyboard/ARIA/focus behavior, all eight locales, README, UI rules,
ontology documentation and template execution documentation are updated. No version bump,
classifier, index scheduler, cache schema, section authoring, background reciprocal mirroring,
provider framework or excluded issue (#299 etc.) was added.

### Templater reload correction

Native testing reproduced a real cross-bundle race on the earlier candidate: an old automatic
parse held across K-Plex disable/enable could overlap a new explicit parse in the same Templater
engine, corrupt the old output context and fail to restore the original handler.

The final implementation shares transient native-owner receipts via the versioned
`Symbol.for("k-plex:templater-creation-receipts")` registration. New bundles join draining
work; final release restores the true original handler and removes its own marker.
Third-party replacements, unsupported markers, locked slots and transactional installation
failure are handled conservatively. The persistent hook retains no first-plugin callback
factory. This remains scoped to K-Plex creation receipts.

## Validation outcome

Runtime: Node **22.22.2**, actual installed Obsidian typings, Windows Obsidian **1.15.0**
(installer **1.14.5**). Native writes used only the approved
`C:/Obsidian/kplex-test-small` vault, serialized under the shared host lock.

| Gate | Actual evidence |
| --- | --- |
| Released/base/candidate reproduction | Official 0.4.3 reproduces explicit relationship loss through materialization/reload; candidate preserves it. Base/release GraphBuilder fallback is identical. Full singleton/two-field/remove-second, both-center, Markdown/drawing and caption override matrix passes. Run: `302-release-candidate-native-final-iA2XGm`. |
| Focused source checks | Final receipt/template/reciprocal group **83/83**, lint/type/syntax/whitespace checks pass. Independently evaluated module copies cover native-owner queue/lifetime boundaries. Run: `302-template-reload-real-final-EjFL1N`. |
| Native template/reciprocal behavior | Actual Templater 2.27.0 and official Excalidraw 2.29.2; properties/body/core, automatic exactly once, explicit precedence, rename/move, concurrent creation, retained errors and reciprocal partial retry pass. Earlier-candidate reload race reproduced in `302-native-template-reload-baseline-UR4BBZ`; final artifact passes reload and full template matrices in `302-shared-receipt-native-final-ZkxTLl`. |
| Native forms | Main/popout, light/dark, 440/1160 widths, native field heights, focus/keyboard, disclosure and no overflow pass; representative PNGs inspected. Run: `302-final-native-forms-rNagqf`. UI source is unchanged by the later receipt-only fix. |
| Sidecar | 18 native cases cover main/popout, Off/Recent/unpin, folded/new/attached groups, late opens and same editor/history/selection/tab identity. Ordinary split-close controls distinguish native geometry behavior. Run: `302-native-sessions-comparative-n0pc0y`. |
| Cache mutations / pending / retry | Genuine edit/rename/delete/property removal/restore/policy changes pass. Pending-save close/reopen and plugin reload activate a new generation without full build/body reads/parses. A real save error retains the old pointer; a later real edit and unchanged five-minute timer activate the replacement. Run: `302-native-cache-corrected-9SRn2C`. |
| Application restart | Two unchanged **Reload app without saving** cycles reuse the generation with zero inventory/full-build/body-read/parse/replay/save admissions. Pending-save added-owner reload repairs and activates the new generation without a full build/body read/parse; final unchanged cycle reuses it. Electron process remained running. Run: `302-isolated-restart-phone-r7uvlI/restart`. |
| Phone environment | Desktop mobile emulation in portrait 390x844 and landscape 844x390 passes actual palette tab opening, generic sidebar, independent canvases, tab switching, serialized restoration and close/reopen. Explicit local on-demand readiness is distinguished from global coverage. Run: `302-phone-deferred-final-srA8Mi`. |
| Source recovery / events | Native startup recovery and three real event writes/two coalesced acquisitions pass with exact final facts. Runs: `302-native-final-gates-xUWmnI`, `302-native-event-foreground-final-E4QDuc`. |
| Foreground / cleanup | Original six timed operations and first-flush assertion pass. Cleanup now independently restores native layout, root MRU, active sidebar, independently targeted File Properties, settings, inventory and exact config bytes. Native public state restoration declining the unbound Properties target uses the existing guarded native loader contract. Maintained runner **68/68**. Runs: `302-foreground-properties-loader-final-moC6BQ`, `302-foreground-mru-restored-final-qBdfH5`. |
| Large vault | Full final pipeline passes the **20,015-owner** cached incidence/evidence/gates/degrees/no-I/O case in ~298 seconds and the independent skew/cancellation case with original bounds. |
| Final native state | Final scoped plugin reload retires transient test owners naturally. Settled global coverage is complete; 98/98 Markdown notes ready, no active work or pending cache save. All 117 physical files, full layout/settings, original active/MRU and exact data/enabled/workspace bytes match. No fixture files/folders/nodes/dialogs/controllers remain. Run: `302-final-settled-native-audit-abEnAF`. |

### Final aggregate and failed-check accounting

The final **`npm run verify` invocation did not pass**:
`302-full-verify-shared-receipts-jn7r4T`.
Release metadata, architecture (9), core (135), lint, initial tests (2346/2346),
UI browser (566/566), source units (362/362), and **1031/1032** final source-browser
tests passed. One presentation test failed before its production bundle loaded:
Chromium remained `ready: loading`, resource list empty, bundle error null.
The rest of the batch completed; the npm failure chain skipped the build.
Runtime sources remained unchanged throughout.

Unchanged recovery: the entire `tests/graph-presentation-indexeddb.test.mjs` file
passes **25/25**, and the actual **`npm run build` release command passes separately.
No source, assertion or deadline was changed for this retry.
Both are retained in **`302-final-unchanged-recovery-release-HSLmkF`**.

Earlier failed aggregates remain recorded:
- `302-full-verify-TOJoky`: obsolete browser selector/lease/port fixtures; focused corrections pass.
- `302-full-verify-corrected-zaJMH9`: extracted keyboard fixture lacked new combobox dependencies; corrected composer 63/63.
- `302-full-verify-final-GiobI2`: retry-count fixture combined mandatory retries with optional sibling work, plus a Chromium bundle-admission timeout. Three diagnostics prove mandatory publication epochs [0,1] plus one optional B acquisition. The corrected test retains siblings, asserts both exact counts and actual optional ownership/idle completion under the original bound. The unchanged admission case passes separately. The final aggregate passes both those cases.

A prior native foreground first-flush failure had insufficient evidence to attribute a cause;
it remains retained. Passive bounded diagnostics and subsequent unchanged checks pass.
Do not claim a production repair caused those reruns to pass.

### Independent cleanup classification

The pre-reload audit `302-final-independent-ghost-audit-uqAeed` found six intentionally
retained unresolved identities: null native file/mtime, no canonical declarations, cached
incomplete coverage and no physical/visible fixtures. Map presence alone was not a leak.
A normal scoped plugin reload (`302-final-scoped-runtime-cleanup-25FR9r`) retired these
test-derived owners without direct private-map/cache edits. Final settled audit:
**`302-final-settled-native-audit-abEnAF`**.

## Exact artifacts and source identity

Final runtime input hash:
`0cc02a8dcddf46d3d8b6280a10a4a31d8e9aa97589df41069f1c11c2e019ac4f`.
Full input list is in the final recovery run. Runtime inputs remained unchanged through
the aggregate, unchanged recovery and release build.

Native-tested identified candidate remains byte-identical in `dist/` and Small:

- main.js: `b156d0f9783a590ca34f4bea66ad0903f9e51f4ef320f53cf49ba51a289701a9`
- styles.css: `64bc3673605884e465e76bc880a71e5b6667395110c54e8a642a813fab56a444`
- manifest.json: `dd5c24bca596d39dcfeda4adaac6649fdaa3d2a3cfd905b315c63c64f28b2efb`

Actual deterministic release main.js:
`0ab17ce798871a72a2c0c0b9f643a361f50405095dfe7f25bd41fa9aadd536c5`;
styles/manifest hashes match above. Frozen release artifacts are in the recovery run's
`release-build/` directory. The identified candidate was restored after hashing; do not
publish it as a release or mistake earlier native artifact 337b... for the final candidate.

## Authorized local deployment

The maintainer subsequently requested deployment to Zsolt's Brain. The exact native-tested candidate above was atomically installed there while the vault was closed; unchanged manifest was skipped. Installed hashes match, and data.json, community-plugin enablement and workspace.json remain byte-identical. K-Plex is enabled and will load this build on the next vault open. Build ID: `0.4.3+e78cd1a60968.dirty.local.20261112T172143017Z`. Receipt: `302-brain-deployment-a6jcZ1`. Previous artifacts are preserved in `.test-work/deployment-backups/zsolts-brain/2026-11-12T20-03-30.500Z-fc73a11e`. This deployment does not expand Git/PR/merge authority.

## Remaining limits and next authority

- Physical phone/touch and macOS acceptance were unavailable. Desktop mobile emulation and Windows native results do not replace those lanes. Highest-value remaining checks are real-phone palette/tab restoration and macOS popout Sidecar/template lifecycle.
- Commit the validated changes locally on this branch as requested. Keep PR #302 draft pending maintainer review/platform acceptance; no push, issue closure, merge or release authority is implied.
- Raw evidence remains in managed ignored `.test-work/validation/2026-11-12-*` runs with normal retention. No committed validation report was added.
- Final validation pruning, validation gate, whitespace and source/artifact identity checks pass; receipts are in `302-finalization-D7EHFL`.
