# Native dragging, Find and creation destinations

Implementation branch: `2026-10-17-navigation-and-native-drag`, based on merged
#174 at `8f702d9c6dfcb70921a1bd5c15087af70e7f2156`.
Scope: #157 and the maintainer's navigation/creation enhancement batch; #175's
overlapping independent areas and requested combined-left alternative. This does
not implement a separate hide-Challengers mode. C14 remains accepted and
structural refactoring paused.

## Behavior and ownership

- Global Find includes the existing tag and folder vocabulary. `#` restricts
  results to tags; tag labels retain `#`, with the full hierarchy in the detail.
  Native Lucide icons identify result types and common attachment subtypes.
  Explicit tag centers expose their parent/child tags and member notes even when
  tags are hidden around ordinary notes. Other filters remain in force.
- Desktop node-body drags use the guarded native Obsidian link-drag boundary
  used by Bases. Files, URLs and placeholders carry native links; tags carry
  literal tag text. Captured node identity supports drops between Plex views.
  Folders and transient nodes have no outbound link gesture. Touch, pen and gate
  gestures retain the existing pointer interaction path.
- Six saved device/surface preferences place Friends and Challengers together
  on the left. Missing preferences preserve the split arrangement. Semantic
  roles, gates, ontology and filters are unchanged. The independent
  Challenger/Sibling seam no longer inherits negative parent compaction.
- One compact folder component serves new-note/placeholder creation and explicit
  Ctrl/Cmd-double-click materialization. Obsidian's calculated destination is
  prefilled; normal name-first quick creation remains available. Placeholder
  references default to the filename alias. Existing-target duplicate/relink
  policy remains unchanged.

`GraphIndex` owns search and relation presentation; layout/profile owners own
placement. No compiler, source acquisition policy, schema, receipt or scheduler
is added. Folder suggestions take one native folder inventory when the dialog
opens, then filter it locally. Changing a pathful placeholder's destination is
an explicit mutation: approved native reference occurrences are retargeted by
the existing literal grammar and atomic `Vault.process` callbacks. This operation
is bounded to 256 source identities and the existing source decode byte budget.
Ambiguous/stale source proof fails closed. Accepted file/reference writes are
retained on a later failure, with a modal-local continuation rather than a second
creation. This is not a multi-file transaction.

## Final validation

Runtime and tests are pinned to [ac22f45](https://github.com/zsviczian/kplex/commit/ac22f45600e6835fb22f849dcf3e82b86f5f8f88).
The final local `verify:obsidian` run starts and builds from a clean tree on
Node 22.22.2; its process exits zero. Later closeout changes are documentation only.

| Required lane | Result |
| --- | --- |
| Architecture / restricted core | 7/7 and 130/130 |
| Node contracts | 1,013/1,013 |
| Browser UI | 131/131 |
| Portable source / real-browser source | 334/334 and 598/598 |
| Obsidian lint / real-types production build | Pass |
| Exact-build native staging, command/render/error smoke | Pass |

Full verification reports no skips or cancellations; assertions are preserved.
The browser source lane includes its
20,015-record synthetic restart/publication case. Native acceptance uses Windows
11 10.0.26200, Obsidian 1.14.4 (installer 1.14.0), Electron 43.3.0 and native
Node 24.18.1. Only authorized disposable `kplex-test-small` is used: 107 original
files, including 88 Markdown notes. No personal vault is accessed.

Repository output and installed files match these final SHA-256 values:

| Artifact | SHA-256 |
| --- | --- |
| `main.js` | `86fa12f02946d1d0c085c73bbab3eab501d0224b7f23b8402ed17d2fe7aea0f8` |
| `styles.css` | `3dd15f02ccd96bd363731342b7fc8d056b8461ca7371b9ca3746d41471f3366f` |
| `manifest.json` | `19d9ecce5557733e0ff0f2e27155e635c30158c3cfa6fbca0f11c16e4dedfd2c` |

All five native lanes pass serially on that exact build:

- Find: eight guarded queries, six navigations, hierarchical/accented tags,
  hidden ordinary tag nodes, folders and native result-type icons.
- Folder creation: eight real-dialog workflows plus a genuine plugin reload.
  Covers name-first modifier-Enter, existing/root/new folders, duplicate basenames,
  placeholder aliases, failed storage, modifier double-click/Cancel and durable
  relocation. The mixed-reference case moves three space-target links while
  preserving three percent-literal links and every other source byte.
- Combined layout/drag: ten cases, including all six actual Settings controls,
  main/sidepanel/popout placement, dense independent areas and semantic drop
  previews; five Markdown drop types, cross-Plex navigation/composer, popout
  handlers, trusted gate geometry and trusted same-view body-drag delivery.
- Existing interactions: all 14 asserted cases pass, including sibling additions
  in four directions, Bases drops, held-build materialization and Properties
  focus/overlap/non-Markdown/popout behavior. One fixture observation is separate.
- Touch emulation: eight trusted gestures, saved-value reload and phone/pane
  geometry. Earlier acceptance also exercised the temporary-enablement branch.

Native handlers receive synthetic drops where stated by their receipts. Trusted
body dragging uses Chromium's intercepted native data with trusted start/drop and
no synthetic fallback; this does not prove an OS drag across windows/applications.
Every lane restores its owned fixtures, workspace and configuration bytes. A final
independent sanity check confirms 107/88 files, no test controllers/dialogs,
desktop mode, loaded candidate and restored CLI console capture. Visual inspection
of the actual compact composer confirms name focus and a closed folder menu;
that check submits no note or settings write. All eight locales remain covered.

## Indexing impact

Guarded Find queries, layout changes, native payload creation and folder
typing/cancellation record zero added Vault reads, parsing, source acquisition,
semantic builds and snapshot writes. Layout also retains semantic revision and
source counters. Search uses the existing vocabulary; folder browsing filters one
captured native folder inventory. Ordinary On-demand navigation and actual
creation/retargeting legitimately perform their existing source and note work and
are measured separately. This is operation-level evidence, not a claim of zero
UI CPU/allocation cost, a startup speedup or measured whole-vault resource savings.

## Safety and remaining limitations

Native cache probes and four failing-before regressions exposed a defect in the
new relocation path: wiki percentages were decoded like Markdown. The correction
preserves literal wiki spelling, decodes Markdown once and requires exact native
cache/token agreement. Literal wiki `%23` is not a heading. All 49 composer
tests pass; raw/twice-decoded cache mismatches fail closed. General index/parser
policy is unchanged. Percent-escape-looking wiki destinations are conservatively
refused by the new serializer. Unsupported wiki targets and uncertain YAML quoting
fail before creation; a destination apostrophe plus any apostrophe in affected
frontmatter can be refused even when that other apostrophe is unrelated.

The separate On-demand gate/filter lane **fails** its unchanged-semantic-revision
guard, with correct gate values. The existing cross-link toggle's legacy settings
save calls `refreshSemanticSettings()`, clears requested coverage and repatches
files despite unchanged source counters. Main contains that same source path;
this is a source comparison, not a native old-build trial. The assertion remains
intact and no unrelated correction is included. A focused future fix can route
cross-link-only saves through presentation while preserving mixed semantic saves.

An ordinary unmodified double-click can move a noncentral placeholder after its
first click, putting its second click over a gate. Baseline source has the same
hazard; that exact old-build native sequence is unproven. Ordinary materialization
is validated on a stationary center; the new modifier gesture is validated on a
noncentral node. Earlier browser-startup, drag-transport, folder/reload and cleanup
failures remain preserved with their successful controls and recovery receipts.

Remaining manual acceptance, in priority order:

1. Physical mouse drag between adjacent Plex/Markdown panes and across
   windows/applications: links arrive correctly and Cancel preserves relations.
2. macOS Command/Option, folder selection and native input/IME; minimum-host
   compatibility remains untested separately from the installed desktop host.
3. Physical phone/tablet picker focus, touch/scroll and separate layout profiles.
   Desktop emulation does not establish device acceptance.

## Preserved evidence

Private durable backup: `%LOCALAPPDATA%/KplexValidation/navigation-native-drag-177-20261018`.
It contains 403 verified files (74,104,069 bytes): complete owned raw
measurements, failures/recoveries, staged artifacts and a source/test archive pinned
to `ac22f45`. `sources/SOURCE_REFERENCES.json` and `sources/REPRODUCE.txt`
record source identities, fixture conditions and the established runnable lanes.
`MANIFEST.json` records every file's checksum. Its SHA-256 is
`4c3c98f4bba8b008021468a0823c7056763021c91b15ff61156a83d0f2b55c39`.
All copies and checksums were verified before closeout; Temp originals are retained.
Configuration backups remain private. No raw evidence is published or added to Git,
and the transient handoff is excluded from the source archive.

[Runtime CI](https://github.com/zsviczian/kplex/actions/runs/39081868817) and
[the draft PR's current checks](https://github.com/zsviczian/kplex/pull/177/checks)
provide the remote results; the PR description records final-head CI status.
No merge or release is authorized for this implementation branch.
