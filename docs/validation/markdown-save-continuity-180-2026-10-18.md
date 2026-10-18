# Markdown-save continuity â€” PR180

Implemented on `2026-10-18-markdown-save-refresh`, integrating merged PR177 at
`4396768` through merge `1160cb2`. No history rewrite, new setting/schema/parser,
scheduler, receipt or startup experiment. Keep draft. The maintainer deferred the
broad validation campaign until PR147; the focused checks below are actual results.

## Confirmed causes and changes

Native On-demand autosaves reproduced the body-defined parent becoming a generic
child while the replacement body was pending. Normal Sidecar and central-editor
cases both lost node DOM and started 126 animations across three ordinary saves.
Those are functional observations, not a CPU, memory or latency benchmark.

GraphIndex now retains the exact native center's prior compiled read presentation
only during its active On-demand replacement, under the same semantic policy and
matching prior body/compiled mtime. Observed same-stat edits are covered by the
existing body-read invalidation. Native replacement, policy changes and completed
work cannot acquire this preference. Source/maintenance stamps, negative proof,
and relationship-write readiness remain unchanged; current prepared scopes win.
Real parent removal is published after its body is reconciled.

Metadata invalidation also deleted the On-demand token containing the prior policy.
The next patch interpreted that missing token as a policy change and forced
compilation, bypassing the existing SourceFingerprint no-op path. A transient dirty
flag now prevents same-stat admission while retaining that compiled policy. A new
native file or policy still forces compilation. Fresh source observation/parsing,
provenance and synchronous per-file publication remain mandatory and unchanged.

The prepared settings facade previously allocated a fresh wrapper on every read,
invalidating the downstream device/profile cache. Its weak cache compares the
prepared generation and shallow live source values, including unknown future keys
and immediate consent revocation. It never traverses saved-theme contents.

Ordinary scene layout now compares bounded consumed inputs: ordered projected
membership, labels, winning non-color styles, node type, relation flags and finite
layout policy. Settings equivalence and source clocks alone cannot rebuild geometry.
Semantic changes retain conservative crosslink invalidation. Current pages are
rebound to reused coordinates, preserving fresh clocks, native identities and lazy
predicate contexts. Sections retain their conservative settings/source path;
animations and genuine navigation are not globally disabled.

## Focused verification

Node22.22.2, installed dependencies and Obsidian types:

- Architecture7/core130, full Obsidian lint and real production build pass.
- The affected On-demand suite passes 111 tests. Eight final held-parser cases
  cover Eager/On-demand, prose/removal and ordinary/same-stat edits. Each verifies
  source catch-up and closed write authority while retaining presentation.
- Removing dirty/policy retention makes both prose no-op controls fail. Removing
  read retention makes all four initial parent-continuity controls fail. Restoring
  old scene invalidation fails the actual React layout work-count regression.
  Every temporary source change was restored byte-for-byte before final build.
- 143 focused presentation, typography, layout, camera, follow, no-op and UI tests
  pass; the final scene regression also passes after the last node-type key addition.
  It executes the actual memo owners and real layout, proving 0 extra layout builds
  for equivalent publications, retained editor DOM/focus/caret, current page clocks,
  and positive invalidation for labels, dimensions, semantics and membership.

Native Windows11 / Obsidian1.14.4 installer1.14.0, Electron43.3.0,
Chrome150.0.7871.212, native Node24.18.1. Authorized `kplex-test-small` only.
The real build was staged and smoked through the existing verifier owner. This
staging run is explicitly build/smoke-only, not the complete verify:obsidian suite.

Strict native autosave receipt1792346311955 passes four scenarios. Both actual
Markdown source editors receive Electron input and save through native autosave.
Mutation observations check intermediate roles and actual DOM; physical typing is
separate acceptance. Each editor also passes real parent removal and restoration.

| Three prose saves | Sidecar | Central editor |
| --- | ---: | ---: |
| Semantic notifications |0|0|
| Graph animation starts |0|0|
| Original graph DOM retained | yes | yes |
| Parent throughout reconciliation | above | above |
| Native editor focus retained | yes | yes |
| Observed neighborhood calls |21|26|
| Vault.read calls |0|0|
| Vault.cachedRead calls |15|20|
| Parser calls |9|10|
| Source acquire calls |6|6|
| Presentation notifications |108|111|

These counts are not all avoidable or attributable solely to geometry; source
freshness still costs work, and unrelated host consumers can share native reads.
Cached reads were not observed in the initial baseline, so no reduction is claimed
for them. The first read-priority candidate had no effect and remains failed
experimental evidence. The accepted correction uses the canonical per-file owner,
not a semantic-scope entry that was absent in this actual On-demand route.

Final installed SHA-256:

| Artifact | SHA-256 |
| --- | --- |
| main.js | `713b17c1316fc12edfdb20f4b8de6af333ee107ae17697323aa783d2d1b064d4` |
| styles.css | `433605d6f9a88b23e4ac35940de23afd2b37faf7102d3e978a077259ff281801` |
| manifest.json | `19d9ecce5557733e0ff0f2e27155e635c30158c3cfa6fbca0f11c16e4dedfd2c` |

Final runtime derives from1160cb2.dirty and the committed implementation. Sanity
1792346396653 verifies matching installed artifacts, original107files/88Markdown,
desktop, no test controllers/dialogs and opening CLI capture off. Native drivers
restore owned files, settings, workspace and window independently of assertions.

## Reproduction and limits

After exact staging, use the three explicit Small-vault name/path/config variables
from CONTRIBUTING.md and a fresh KPLEX_HOST_REPORT_DIR. Run adaptiveFit.mjs with
KPLEX_MARKDOWN_SAVE_ONLY=true. Observation-only mode is not acceptance; leave
KPLEX_MARKDOWN_SAVE_OBSERVE_ONLY false. The same driver without the save flag
retains its genuine-navigation/late-relationship/manual-camera positive controls.
Its source/helper hashes accompany each report. No raw evidence is published.

Full npm run verify / verify:obsidian and the exhaustive dependency/host matrix are
deferred to PR147 as requested. Native actual Eager sessions, property-dependent
Keep/Reflow lenses including hidden admission/center dependencies, provenance
Go to source after paragraph insertion, section expansion, imagery, modified-time
sorting, rapid rename/delete/recreate, hidden/revealed views and independent
popouts require broader combined acceptance. Existing focused tests cover portions;
they do not establish that whole matrix. macOS/minimum-host and physical mobile
remain unavailable. The separate Settings-close freeze belongs to PR179.

The highest-value remaining save-work question is why one edited source still
causes several parser/acquisition passes and many presentation notifications.
Trace those owners during PR147; do not infer a universal resource gain from0
semantic notifications or expand this PR into another indexing campaign.

The unchanged native adaptive-fit lane1792346448185 additionally passes all seven
positive controls on the same exact artifacts: genuine late parents/friends,
new navigation, explicit fit renewal, manual camera/zoom/wheel/resize retention
and disabled-autofit behavior. Cleanup and native error checks pass. No additional
runtime changes followed the strict native run.