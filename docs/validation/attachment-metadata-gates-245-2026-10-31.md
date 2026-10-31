# Attachment metadata and numeric gates — PR245 follow-up

Baseline: `77a136d`, branch `2026-10-31-editor-mobile-navigation-fixes`.

## Diagnosis and change

Obsidian 1.15.0 returns a fresh empty object for every non-Markdown
`MetadataCache.getFileCache()` lookup. Host preview compilation incorrectly required
that object to retain its identity across awaits. A PDF center therefore lost its
incoming relations; a Markdown center with PDF/image contributors also rejected its
local gate-count cover. The existing unavailable marker then replaced numeric labels
with ellipses. The tooltip also mentions size limits, although the observed rejection
did not trip a size guard.

Read-only inspection confirmed the native behavior. Two isolated previews of the same
Markdown center rejected native attachment cache identities and succeeded when only
those identities were stabilized. No live index, settings, personal-vault files or
installed artifacts were changed during that inspection.

`HostMetadataPreview` now captures metadata identity only for Markdown, and calls its
optional Markdown-body provider only for Markdown. `GraphIndex`'s existing warm visible
recovery applies the same distinction. Attachments retain native file identity, path,
mtime/size and event fences; source, host, policy, demand and Markdown metadata guards
remain in place. No parser, schema, persisted cache, relationship classifier, indexing
scheduler or UI component changes are included.

## Focused and native evidence

- Node 22.22.2: all 57 host-preview tests pass, including 15 new attachment regressions.
  PDF/image incoming links, Markdown centers linking attachments, repeated numeric
  publication in Eager/On-demand, no binary-body requests, and stat/replacement/rename/
  deletion/Markdown-metadata freshness are covered.
- The new real Chromium/IndexedDB warm-PDF recovery regression passes. Selected Markdown
  ontology recovers while broad source authority is unavailable, without granting pair
  editing authority.
- Installed Obsidian typings, official scanner and production build pass.
- Actual macOS Obsidian 1.15.0 (installer 1.14.0), existing disposable `kplex-test-small`:
  native fresh attachment cache identities, 18 resolved PDF backlink owners, three host
  count recalculations and visible numeric gates for both PDF and Markdown centers pass.
  Settings/enablement bytes and workspace owners are restored; fixture files and the
  controller are removed. File count returns to 76; `dev:errors` reports no captured errors.
  Exact source/artifact hashes: [receipt](attachment-metadata-gates-245-receipt.json).

Run the native driver after staging the exact build, with the three explicit Small-vault
identity variables and a fresh `KPLEX_HOST_REPORT_DIR`:

```text
node scripts/testing/obsidian/attachmentGateCounts.mjs
```

The first native attempt refused an unstaged artifact before running the scenario.
Two fixture assertions were subsequently corrected: declare inference policy rather
than inherit saved preferences, and inspect the exact new host scope separately from
canonical fixture ingestion. The displayed-number assertion remained required.

The first aggregate verification stopped at the existing list-whitespace parser timer
limit (65.8 ms) during a concurrent production build. Limits and parser behavior were
unchanged. The serial rerun passed every test lane: main **1,798**, browser/UI **445**,
source **357**, and real browser/IndexedDB **856**, plus the release/architecture/core
checks and scanner. The default **20,015-owner** case passed exact canonical metadata,
evidence, gates/degrees, zero-extra-read/parse/full-build, and cancellation assertions.
Final production-build completion is recorded with the aggregate result in the receipt.
