# Ontology consolidation API — PR267

Status: implementation, independent review, full verification and exact-build Windows native
acceptance complete. PR267 remains draft and unmerged for maintainer review.

Branch: `2026-11-03-ontology-consolidation-api`. Specification `7a6dd608` is retained;
accepted main `116f7f8a` (including shared completion PR268) was merged normally at
`bd8a2e78`. No reset, history rewrite, release bump, publication, personal-vault deployment
or note consolidation is part of this assignment. The approved earlier companion PRs were
merged separately: Excalidraw3033 into master `4827c6a7`, K-Plex268 into main `116f7f8a`.

## Delivered behavior and review

- `ontologyDocuments`: explicit cached posting traversal, finite resumable pages and metadata
  authentication. Durable sequence and in-process mask/activation guards cover metadata awaits
  and pending-only continuations. Posting exhaustion never certifies a whole-vault negative.
- `inspectOntologyOccurrences`: one selected saved read for all fields, canonical cooperative
  parser projection, exact original UTF-16 body key spans and logical YAML key locators.
  Ordinary/worker records and historical evidence coordinates remain unchanged. Malformed,
  duplicate, indirect/complex or non-mapping YAML stays unsupported rather than fabricated.
- Reviewed configuration: bounded detached previews, whole-batch validation, exact diffs,
  confirmation, expiry/single-use and owner/endpoint fences through the canonical queue.
  Normalized spelling edits retain descriptions; saved status survives unavailable readback.
- Shared name/partner/own-description tiers retain canonical insertion and real consumers.
  Root skill and worked guide retain explicit audit/write authorization and coverage safeguards.

Independent review hardened source work limits before decoding, raw-posting step accounting,
cursor retirement and post-await storage guards. It also bounded preview DTOs before retaining
tokens and readback after durable success. Native usage keeps its existing large-family/legacy
compatibility; only the new API opts into extra family budgets.

Guide review fixed CLI module-resolution assumptions, required explicit closed-source ownership
including embedded editors, refused stale no-op receipts, and bounded YAML comparison before
enqueueing values. A rare formatting case exposed the established second field-name trim pass;
its regression failed before correction and now preserves worker/cooperative parity without
adding normal-parser work.

## Portable evidence

Required Node: **22.22.2**, installed `obsidian@1.13.0` declarations and real production bundler.
The first complete `npm run verify` finished successfully:

| Lane | Passing tests |
| --- | ---: |
| Architecture | 9 |
| Restricted core | 132 |
| Main | 1961 |
| Browser | 466 |
| Source | 357 |
| Real Chromium IndexedDB | 893 |

Scanner/lint, release consistency, type checking and production build passed. That run includes
the 20,015-source persistence/publication fixture; this source-owner change warranted the expensive
indexing/persistence lanes. Subsequent review changes received affected tests, installed types
and lint, followed by the final strict run below. Counts from different runs are not summed.

Focused coverage includes 450 documents/450 fields, bounded pages and empty continuations,
135 durable posting sources and independent-writer races, CRLF/BOM/Unicode tokens, YAML shapes,
dirty/stale/cancelled/disposed inputs, full batches and real queued-writer reconciliation,
description tiers/native canonical insertion and executable migration examples. The original
safe-key projection and three description regressions fail against their baselines. The parser
formatting review regression also failed before its correction; failed logs remain retained.

Local evidence lives under ignored `.test-work/ontology-consolidation/`: `verify.log`,
`focused-final.log`, `parser-review-baseline.log`, `parser-final.log`, `usage-final.log`,
`yaml-root-types.log`, `native-stage.log`, and final native reports. Root skill frontmatter and
guidance are tested with installed js-yaml; the optional Python skill validator was unavailable
because PyYAML is not installed. No stub build is used as production evidence.

## Final strict/native result

The strict `verify:obsidian` driver passed on Node22.22.2, Windows10.0.26200 and
Obsidian1.14.5: architecture9, restricted core132, main1968, browser466, source357 and
real Chromium IndexedDB893 tests; zero failures/skips. Scanner, release consistency, installed
types and production build passed. It then staged and hash-verified all three artifacts in
the explicitly selected disposable `C:\Obsidian\kplex-test-small`, opened the real K-Plex
surface and checked captured JavaScript errors. Reports: `native-stage-final/report.json`
and `native-stage.log`, completed at2026-11-03T12:10:15Z.

Final focused `npm run test:ontology-consolidation` passed57/57 with zero skips. This includes
the late inspection-only YAML scalar-root guard added after aggregate main tests had loaded;
the final production build includes that guard. Its installed-type/scanner and29 selected
inspection/recipe cases also passed. Parser/source/settings owners received both full runs;
this isolated guard did not justify a third expensive indexing run. The actual React
related-note composer browser case additionally passed with own-description search, role
eligibility, ArrowDown/Enter canonical selection and no accidental relationship submission.

Frozen runtime/build-input identity:458 files, aggregate SHA-256
`66ed3c6a1e80b5c3ba50e524e91d86437ea71cba0c8e6b53e15e71c17aaf4863`.
The capture was reverified after validation; documentation/native-driver-only changes do not
alter this identity. Built and installed artifacts:

| Artifact | SHA-256 |
| --- | --- |
| main.js | `692984e462829b95fa2e663fe286d09d41af6371453ac7b068c8b047f0c10ecc` |
| manifest.json | `8c65b0d38a506f8fa9fc3311b81ea22bcda48e0209e9190483752c1f20834326` |
| styles.css | `d89188385a224f257da98ca48b41ea1e0fe9dd14f67f45012a51b144fb492ab1` |

The maintained `verify:obsidian:ontology-consolidation` scenario passed all five groups:

1. Exactly one selected saved read, CRLF/Unicode body slices, truthful logical YAML and native
   duplicate-key refusal.
2. The guide's extracted `processFrontMatter`/`Vault.process` helpers: collision preservation,
   reinspection after YAML, stale pre-YAML offsets, interruption/resume, readback and idempotence.
3. Stale/dirty source refusal, reviewed confirmation/durable endpoint readback, description-only
   persistence, canonical matching and cache-only usage without source acquisition.
4. Visible actual Markdown suggestions, Enter insertion of the canonical bold field, saved-file
   readback and independent popout API access.
5. Actual plugin disable/enable, persisted description readback and retired old API handles.

Final report `native-consolidation-final-2/ontology-consolidation-267.json` passed at
2026-11-03T12:13:27Z on Electron43.8.3/Chromium150.0.7871.250/win32. Measured intervals:
Vault.read1, cachedRead0, graph source acquisition0, graph parse0, rebuild0, semantic
invalidation0. The one read belongs to explicit inspection; matching/usage add none. These
counts exclude setup, actual note writes and normal event reconciliation. Four nonce-owned
notes were removed, the original98 Markdown paths restored, settings/enablement bytes restored,
workspace restored, temporary observers/controller/debugger released, and no native runtime
error/unhandled rejection was captured. The shared application-user-data lock was released.

The staged artifact manifest is0.4.1; Obsidian's cached plugin-manager manifest still reports
0.3.1. The report labels that value `hostManifestVersion`, not loaded-code identity. Exact
installed hashes, the new API behavior and reacquired provider after reload establish the tested
runtime; no release/version bump or whole-app restart was performed.

Earlier failed native attempts remain recorded: `native-consolidation-1` used an unsupported
multiword trigger fixture; correcting it to a unique description token passed the entire
scenario (`native-consolidation-2`). An additional inventory-assertion run encountered an
honest STALE_REVISION while its own YAML write published an ordinary index revision. The
maintained controller now permits at most eight fresh read-only inspections, never retries a
mutation or expected-snapshot rejection, and retains all stale-write assertions. The final
passing run used zero such retries. Cleanup passed in every attempt. These are retained
fixture/race findings, not excluded failures or relaxed product guards.

Human review covered canonical ownership/reuse, dependency direction, new/changed TSDoc,
bounded input/work/output, cancellation and lifecycle resources, source/endpoint freshness,
unknown-setting preservation, native UI insertion and unchanged catalog copy. No unresolved
architecture or scanner violation remains. Automated checks complement this review rather
than establishing its completeness. No further manual Windows check is required for the
covered flows; other platforms/input environments below remain unverified.

## Scope limits

Usage coverage is deliberately conservative; an approved bounded saved-source audit is required
for exhaustive retirement evidence. API configuration changes never migrate note properties.
Ordinary note writes remain public Obsidian operations with explicit ownership, review, backup,
collision and stale-content guards. Unsupported YAML must be reviewed separately.
Windows native evidence does not establish macOS, physical mobile/WebView, touch or OS-IME
acceptance. No personal notes were migrated and no Help-repository files were changed.
