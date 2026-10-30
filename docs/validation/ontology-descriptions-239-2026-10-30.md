# Ontology descriptions: PR #239 validation

Validated on 30 October 2026, Windows, Node 22.22.2, Obsidian 1.14.5
(installer 1.14.5), disposable `kplex-test-small`: 117 files, 98 Markdown sources.
Existing branch `2026-10-30-ontology-descriptions` incorporates `main@909343a`;
implementation started from `f526c1548ce45e4cc8cbc69b63eea30bba819adf`.

## Ownership and compatibility

Descriptions are optional settings-owned plain text, bounded to 1,000 UTF-16
code units and keyed by exact configured physical names. Existing normalized
identities resolve context-menu and typed-partner aliases before saving. Inverse
fields retain independent text. The existing ontology writer owns atomic writes,
conflict checks, incoming settings and durable-before-presentation publication.
No note grammar, index/cache schema, semantic signature or field ranking changed.

The pure `core/contracts/ontologyReadModel` supplies configured names, roles,
inverse partners, descriptions and caller-supplied discovery facts. It performs
no discovery, source acquisition or index work. The existing editor, manager and
suggesters render literal descriptions; all eight presentation catalogs changed.

## Automated acceptance

`scripts/testing/obsidian/verify.mjs` ran the complete `npm run verify` using
Node 22.22.2, then staged the exact build and passed the native command/render/error
smoke. Release metadata, architecture, host-free core, official Obsidian ESLint,
actual installed types and production build passed. Regression batches passed:

| Batch | Passed | Failed |
| --- | ---: | ---: |
| Main portable/regression batch | 1,698 | 0 |
| Browser/UI batch | 425 | 0 |
| Source tests | 357 | 0 |
| IndexedDB/browser source tests, including nested cases | 855 | 0 |

The unchanged 20,015-owner case passed exact metadata/evidence/gates/degrees and
cancellation assertions with no I/O during cached publication. This is functional
scale evidence, not an actual-paint or before/after performance comparison.

New regressions cover migration/JSON reload, literal text, exact/prototype-shaped
names, independent inverse text, Save/Cancel/clear, storage retry, stale local and
incoming drafts, zero graph refresh on receipt, caret preservation, partner
draft isolation and context/typed-partner capitalization.

## Exact-build native acceptance

- `ontologyDescriptions.mjs`: new paired descriptions, Cancel, manager display,
  independent inverse edits and clearing passed. Three accepted edits produced
  exactly three settings writes; Markdown reads, parses, source acquisitions,
  rebuilds and semantic invalidations were all **zero**. Semantic revision stayed
  unchanged. Repeated successfully after cold cache regeneration.
- `ontologyManager.mjs`, `KPLEX_ONTOLOGY_MANAGER_NARROW=true`: all 12 scenarios
  passed, including the actual narrow native Settings window, bounded list,
  long names, native controls, role/pair changes, storage
  rejection/retry, saved/pending publication and no-Plex configuration. Its mixed
  role-edit workflow is separate from the zero-work description interval.
- `ontologyPairReload.mjs`: both independent descriptions survived actual plugin
  disable/enable, with unchanged semantic revision at the description save,
  recovered inverse caption, original physical YAML evidence and raw pairing.

All native scenarios restored configuration/workspace bytes and owned resources.
The description probe creates no notes; the reload lane removes its own fixtures.

| Staged artifact | SHA-256 |
| --- | --- |
| `main.js` | `09f8a30e031afe07c50df26c8ccba247afe217817b3e4f6a1948ddf2ec5feaca` |
| `manifest.json` | `2822c38463c03ace4f017453679572d462534ce2a9c9558fd7593f259b01bfa1` |
| `styles.css` | `79bcd8ec38fdc0dd629f2cf52416094a97b958e8d558fa8c8ac1eef5869758ca` |

## Earlier failures and fixture repair

The first complete run exposed a missing new module in the indexing harness's
explicit emitted-module inventory; the inventory was corrected. The second run
passed 1,698 regressions and 424/425 browser checks; one browser failed to load its
bundle before assertions. A full rerun passed with unchanged limits.

The first two broad native-manager attempts stopped before UI assertions because
Small's derived source dependency cache reported `dependency-invalid`. Both
cleanups passed. An ordinary explicit rebuild restored graph readiness but did
not repair that cache; existing source reconciliation returned false. The existing
`purgePersistentIndexCache()` owner then regenerated only disposable index data
through plugin reload: 98 source heads activated, zero unsaved records/read failures.
Notes, settings, trust state and workspace were preserved. The unchanged manager
lane and final description/reload probes subsequently passed. No production
indexing behavior or test assertion was changed to accommodate this fixture.

## Remaining acceptance

1. Physical mobile: enter/edit multiline descriptions, select suggestions and
   verify native touch/keyboard activation. Desktop automation cannot prove it.
2. macOS: exercise native Settings/popout editing and reload with the same saved
   descriptions. Windows evidence does not establish its lifecycle behavior.
3. Real two-device Sync: receive wording while an editor draft is dirty; the draft
   must remain local and a stale Save must conflict. Browser receipt tests cover
   the implementation, not an actual two-device transport.

PR #239 remains draft and unmerged. PR #240 may consume this read model on its
existing branch under the maintainer's unattended progression instruction.
