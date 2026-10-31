# Ontology descriptions: refreshed test deployment, 31 October 2026

The existing `2026-10-30-ontology-descriptions` branch now merges `main@a73545f`
through `acafbab`. This includes the merged Markdown/PNG export work and clipped-row/dense-motion
fix. The sole conflict was the package command list; both native command sets were retained.
Ontology runtime implementation remains the previously validated #239 implementation.

## Risk-based validation

No indexing, storage, source-acquisition or graph-semantic owner changed from the accepted
ontology implementation. In accordance with the current AGENTS.md risk assessment, the aggregate
run was stopped before indexing tests and replaced with focused checks. This refresh is **not**
reported as another full-suite pass. Prior full acceptance remains recorded in
[the original validation report](ontology-descriptions-239-2026-10-30.md).

- Node 22.22.2, Windows, Obsidian 1.14.5 / installer 1.14.5.
- Architecture/numeric checks (9) and core checks (130) passed before the aggregate was stopped.
- Official Obsidian scanner and actual installed-type production build passed.
- 187 focused tests passed, zero failures/skips: ontology configuration, presentation, usage,
  suggesters, directional captions, localization, actual editor/pair browser controls, shared
  Markdown export, PNG export and PNG browser ownership.
- Exact-build native description probe passed: independent paired descriptions, Cancel, Save,
  manager display and clearing. Three accepted edits produced three writes; reads, parses,
  acquisitions, rebuilds and semantic invalidations were zero; semantic revision stayed unchanged.
- Actual plugin-reload probe passed with both descriptions, inverse captions and physical YAML
  evidence preserved. Disposable-vault configuration/workspace/fixture cleanup passed.

The first native description interval overlapped a queued startup rebuild. Aggregate diagnostics
identified `startup:initial-index` / `startup:partial-restore-incomplete` work. After ready/clean
startup was confirmed, the unchanged probe passed with zero rebuilds. No assertion or deadline
was relaxed, and no production change was needed.

## Authorized reference-vault deployment

The maintainer explicitly requested personal-vault deployment. Existing artifacts, plugin data,
enablement and workspace metadata were backed up privately outside the vault. Complete sibling
files were staged and hash-verified while the plugin was loaded, then atomically renamed over
changed artifacts during a short volatile disable/enable. The unchanged manifest was skipped.
Only K-Plex's pane was restored; unrelated note/drawing panes were not recreated.

The loaded instance exposes description settings and the description-aware writer. Its existing
pane rendered successfully. Final deployment preserves plugin settings and enablement bytes
exactly. The maintenance verifier first needed the public `WorkspaceLeaf.loadIfDeferred()`
operation, then correctly classified the pane's normal `lastActivePath` update separately from
preferences. Those unsuccessful attempts restored the previous artifacts; no preferences or
ontology values were lost. The final attempt passed every preservation check.

| Deployed artifact | SHA-256 |
| --- | --- |
| `main.js` | `2271b3a54994d72434ea25031a6e5e4da44dfabe5a5907ad5c36fe3eb0c68794` |
| `styles.css` | `10376221de8c8a4f6ea10dc1a6e5e5beb0485fca39adf43b90352a139287b401` |
| `manifest.json` | `2822c38463c03ace4f017453679572d462534ce2a9c9558fd7593f259b01bfa1` |

Private receipts: `kplex-pr239-refresh-20261031-native-r2`,
`kplex-pr239-refresh-20261031-reload` and the deployment backup under the user's temporary
directory. No private settings, pane contents or workspace metadata are committed here.

## Prioritized manual acceptance

1. Edit distinct descriptions for an existing inverse pair; save, reopen and reload K-Plex.
   Both values must persist independently with names, roles and relationships unchanged.
2. Cancel an edit, then clear one description using keyboard-accessible controls. Cancel must
   preserve the saved value; clearing one side must preserve its partner.
3. Check descriptions in inline-property completion and relationship pickers, including a popout.
   Wording and pair names must remain readable; description-only saves must not restart indexing
   after the index is ready. Physical mobile and actual two-device Sync remain separate checks.

PR #239 remains draft and unmerged. Test #240 afterward against the same accepted main baseline.
