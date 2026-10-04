# SI0/SI1 settings-independent indexing validation

## Result

The combined SI0 characterization/diagnostics and SI1 presentation-ownership checkpoint is accepted on branch `indexing-optimization-v2`. It prevents presentation, styling, search-name and view settings from rejecting a saved graph or invoking semantic indexing. Hierarchy, inference and image-suppression selectors remain conservative semantic inputs until SI2–SI4 provide neutral durable facts and reinterpretation.

Independent review retained the returned signature decoder, retired-exclusion reconciliation, pending-facet model, separate presentation subscriptions and synchronous publication fences. The review fixed one performance defect: a selected-facet refresh staged and file-fenced every Markdown page even when only tag names changed. The final provider skips pages whose old and new selected facets are both empty and captures file revisions only when metadata/body inputs are read.

## Automated and native evidence

Final acceptance used **Node 22.22.2 / npm 10.9.7**, macOS 14.5 and Obsidian **1.14.2 (installer 1.14.0)**. `npm run verify:obsidian:migration` passed on the exact reviewed tree. Its nested verification reported:

- architecture: 56 migrated roots, 100 reachable files, zero violations;
- 59 host-free core tests, 123 aggregate Node tests and seven browser DOM tests;
- official Obsidian lint with no errors;
- real declaration typecheck and production build;
- exact-build native smoke, actual legacy fixture import and persistence, node/link style managers, unchanged legacy-style save, rendered Plex styles, plugin reload persistence and cleanup.

The final migration report is `/var/folders/b1/2dys0jfs7bq73whkl2qnyyym0000gn/T/kplex-migration-host-Z4HFID/migration-report.json`. Built and installed artifact hashes matched:

- `main.js`: `43fb2d422d9b9842ea5be1d140c8e5d99dca35efd9bfc5ac54534ef19b7e061a`
- `manifest.json`: `e3bb9a35215af97f6a3394cf7fc8f7d2142bae06de94bb112fef5a05819cda62`
- `styles.css`: `e9da76ff7840cea44b77912963977f1fe2ab762b69a9853d047712d7b3270494`

The native `kplex-test` fixture was authoritative and ready at **20,015 Markdown files / 20,703 graph nodes / 715,032 original declarations**. A bounded probe changed and restored representative link style, full-tag display, label limit, tag-style list, note-type selector, primary-tag selector, aliases and name fields. Counters observed zero full/progressive/plugin rebuilds, zero per-file patches, zero scheduled semantic rebuilds, zero Vault `read`/`cachedRead`, zero parser calls and zero semantic notifications. It emitted presentation notifications while preserving the page map, evidence store and neighbor-map identities.

A presentation-only setting persisted across plugin disable/enable. The legacy saved signature produced `signature-format-changed`, then `complete-snapshot-fresh`, `complete-restored` and `presentation-settings-adapted`; it did not enter a cold-build lane. The original setting was restored. A temporary pop-out produced two rendered leaves in two owner documents with two presentation listeners; a style change emitted presentation notifications and zero semantic notifications. The pop-out was detached, one main leaf remained, settings were restored and Obsidian reported no captured JavaScript errors.

## Performance and limits

On the 20k desktop fixture, representative final settings refreshes were: style 6.4 ms, label limit 27.2 ms, tag-style list 32.5 ms, primary-tag selector 6.0 ms and aliases 22.7 ms. Full-tag refresh showed startup/scheduling variance: the first post-deploy sample was 257.9 ms; a final three-run visible/focused sample was 241.2, 45.0 and 37.9 ms. The median meets the proposed 100 ms desktop target; the first-run tail does not. This is accepted as an explicit SI1 observation, not SI5 performance acceptance or actual-paint evidence.

No persisted graph/body/settings schema, database version, command ID or user document changed. Downgrading can make an older binary reject the new signature format and rebuild its disposable graph; body cache, settings and Markdown remain readable. Historical signatures cannot prove nondefault image-selector provenance, so current nondefaults conservatively reject them.

No maintainer manual test blocks this checkpoint. Before the complete redesign is release-ready, SI5 still requires physical iPad and Android large-vault settings/lifecycle/memory tests, including background/termination/reopen. Desktop automation does not establish those device properties.
