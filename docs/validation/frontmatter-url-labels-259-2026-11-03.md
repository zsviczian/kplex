# Frontmatter Markdown URL labels (#258 / #259)

Implementation branch: `fix/259-frontmatter-link-labels`, based on main
`190669355396a515cfeb8a72dfa77acc5f263193`. The initial worktree was clean.
The original contributor PR head remains
`6f9d4ff7a6020db8594fdcdf2adbbc4eb094802b`; no commit, push, merge, issue closure,
release or production-vault deployment was part of the implementation return.
After reviewing the residual-risk assessment, the maintainer authorized commit,
publication and merge on 2026-11-03. Publication retains the original contributor
commit as ancestry while replacing its implementation with this tested tree.

## Reproduction and implementation

On current main, real full-graph compilation of frontmatter
`Friends: "[Readable label](https://example.com/path)"` retained the URL as the
node name. A second regression showed that a body label won because the
frontmatter label never reached the compiler. Both failed before implementation.

The original PR added `label` to shared lexical references, which also leaked
into stored candidates rejected by the strict source codec. It omitted cached
replay and treated a label only as a new node's fallback name. Applying that
implementation as-is would not safely cover existing URL nodes or caches.

The replacement leaves persisted lexical facts, parser DTOs, source versions,
IndexedDB schema and URL-owner cache payloads unchanged:

- The existing portable literal property grammar exposes Markdown captions
  separately. Target-only consumers retain their accepted output and avoid
  allocating caption strings. A monotonic scanner retains the old literal
  bracket/parenthesis grammar without repeatedly scanning malformed suffixes.
- The Obsidian metadata collector emits supplemental URL-label operations from
  already available frontmatter. Full compilation, source patches and cached
  replay use that same collector. No Markdown reread or source-head rewrite is
  needed to discover an old property's label.
- The compiler shares the existing first-meaningful-name and ordered alias
  implementation between property and body labels. Supplemental labels add no
  relationship or URL-origin evidence. Existing bare URL nodes can gain a label;
  labels on internal note links do not rename the target note or placeholder.
- The independent URL-owner publisher uses the same frontmatter label collector
  before body labels. Its existing private preparation, synchronous publication,
  contributor order, replacement/removal and cancellation fences remain intact.
  Editing or removing a label retires the corresponding search alias.

Within a note, property labels precede body labels. Across notes, existing
encounter/contributor ordering remains the naming policy. No new network access,
settings, UI strings or release version is introduced. C15–C26 remain paused.

## Automated evidence

Runtime: Node **22.22.2**, actual installed TypeScript/Obsidian dependencies.

- Focused parser, collector, URL-title and URL-alias publication checks passed
  (63 cases before adding the final malformed-input/collector tests).
- The frozen accepted C12c parser oracle is unchanged and passes. Additional
  grammar comparisons include malformed/nested delimiters and deterministic
  generated strings. Two malformed inputs of roughly one million characters
  complete inside their one-second assertion.
- Collector coverage checks 600 supplemental labels, bounded batches, terminal
  cancellation and absence of additional relationship candidates/body evidence.
- All **57 composer tests** pass after adding the newly shared parser dependency
  to their function-extraction harness. The first aggregate run exposed eight
  missing-helper failures in that harness; assertions were preserved.
- The focused real Chromium/IndexedDB URL-title suite passes **21 tests**. The
  new case closes and reopens the actual database, replays both supporting owners
  once, retains the property label and compares source heads/chunks/postings/body
  rows byte-for-byte. It traps reads, parsing, reacquisition, inventory and source
  writes, and preserves database version 10.
- The production build passes against installed Obsidian types. Its initial
  sandboxed bundler failure was resolved by rerunning with filesystem access.
- The unchanged **20,015-owner** real IndexedDB publication regression passes:
  exact metadata/evidence/gates/degrees/search, unchanged source counters, zero
  reads/parses/full builds, one direct canonical pass and cancellation without
  prefix publication. Owner checks: 8,187,369, below its unchanged linear bound.
  Total case: 303,084.7 ms; measured cached publication: 154,602.1 ms. These are
  diagnostic fixture timings, not a before/after performance comparison.
- Final **`npm run verify` passes**, exit code 0: release metadata, architecture,
  portable core, official Obsidian lint, indexing tests, 1,971 main tests,
  466 browser UI tests, 359 portable source tests, **894 real IndexedDB tests**,
  and the actual production build. All reported TAP groups have zero failures,
  skips and cancellations. The final build matches all three native-tested
  artifact hashes below byte-for-byte. `git diff --check` passes.

Private logs: `%TEMP%/kplex-259-focused.log`, `kplex-259-composer.log`,
`kplex-259-idb.log`, `kplex-259-build.log`, `kplex-259-verify.log` (first failed
aggregate) and `kplex-259-verify-final.log` (clean rerun).

## Exact-build Windows native evidence

Only the existing disposable **kplex-test-small** is used. Deployment, scenarios
and cleanup share the application-user-data lock. The driver verifies the CLI
vault identity and all three installed artifact hashes. The production vault is
untouched. The test owns one note/folder; the observed fixture has 99 Markdown
files including that note.

The maintained command is `npm run verify:obsidian:frontmatter-labels` after
exact-build staging, with the three explicit test-vault variables and a fresh
report directory. It asserts the actual rendered card and search results after
creation, native `processFrontMatter` edits, label removal and restoration. It
waits for the ordinary five-minute snapshot save before actual Eager and
On-demand plugin reloads. Notes, settings, enablement and workspace are restored.

The first pass completed all label/edit/removal checks, restored the cached label
in 830.5 ms (Eager) and 902 ms (On-demand), and restored its fixture/configuration.
These are **early usable-label observations**, preceding independent audit
completion; they do not establish the complete warm background-work outcome.
The final lane additionally waits for Eager source authority and URL discovery
to close before checking source reads/parses, URL-owner reads and full builds.
On-demand closes URL discovery without requiring global source authority: the
intermediate lane incorrectly required an Eager-only gate, timed out, and
restored its fixture. A passive diagnostic showed all 99 URL owners restored,
zero reads, and intentionally absent global source authority. The corrected
final lane passes; no production workaround or runtime change was made.

First private receipt: `%TEMP%/kplex-259-native-HNsDA5/`.
Intermediate failed-gate receipt: `%TEMP%/kplex-259-native-il0Xhb/`.
Final private receipt: `%TEMP%/kplex-259-native-HE3xE9/`.
Raw settings/layout backups stay private.

Final receipt: [native evidence](frontmatter-url-labels-259-2026-11-03.json).
Windows Obsidian **1.14.5** (installer 1.14.5), normal background throttling,
visible/focused renderer. All 99 URL owners are restored and checked in both modes.

| Warm plugin reload | Usable rendered label | Mode-appropriate audit/discovery completion | Markdown reads / parses | URL-owner reads | Full builds |
| --- | ---: | ---: | ---: | ---: | --- |
| Eager | 895.9 ms | 7,565.2 ms | 0 / 0 | 0 | 0 |
| On-demand | 394.7 ms | 900.5 ms | 0 / 0 | 0 | Not asserted |

Creation, alternative-label search, native caption edits, removed-alias retirement,
bare-URL fallback and restored captions pass on the actual canvas. Source authority
closes for Eager; local mode intentionally does not build global source authority.
Fixture inventory, settings/enablement bytes, native layout and owned sessions
restore successfully, including independent outer staging cleanup. Both earlier
runs also restored successfully. The installable candidate remains in Small.

| Artifact | SHA-256 |
| --- | --- |
| `main.js` | `4b83b059af3784801892cf29dddac20b4dde3a7f257b31de55731f71fe7379ed` |
| `styles.css` | `d89188385a224f257da98ca48b41ea1e0fe9dd14f67f45012a51b144fb492ab1` |
| `manifest.json` | `8c65b0d38a506f8fa9fc3311b81ea22bcda48e0209e9190483752c1f20834326` |

## Review and limits

The source review checks canonical grammar/compiler ownership, portable imports,
opaque target identities, strict unchanged cache DTOs, bounded/cancellable
collection, coherent URL alias publication, lifecycle cleanup, documentation and
the absence of new UI strings. No guards, golden outputs or timing bounds are
weakened. This is feature work within accepted architecture, not a refactor step.

Windows native programmatic input does not establish physical Android/iOS,
macOS, popout, fresh application-process or large-vault performance acceptance.
The finite Small timings must not be generalized to production-vault startup.
No physical-input workflow changed; the highest-value remaining platform check
is opening a note with frontmatter web-link captions in the reported Android
environment and confirming its label/search after a plugin/app restart.

The original PR must not receive this as an additive patch while retaining its
unsafe lexical `label` changes. Publication should replace/revert that original
implementation, preserving this main-based final tree. Commit/push and PR-head
updates are authorized by the maintainer's subsequent merge instruction.
