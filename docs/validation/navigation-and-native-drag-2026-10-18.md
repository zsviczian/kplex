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

## Validation status

The first implementation checkpoint passes `npm run verify` on Node 22.22.2:
architecture 7/7, core 130/130, Node 1,003/1,003, UI browser 131/131,
source-portable 334/334 and source-browser 598/598; no skips or cancellations.
Obsidian lint and the production build against the installed types pass. A final
existing-placeholder delegation regression and the affected relationship suite
also pass 97/97 after review. An earlier Chromium startup timeout occurred before
its bundle loaded; the unchanged isolated case and the complete retry pass.
Assertions and deadlines are unchanged; the failed run is retained privately.

Exact-build staging and native command/render/error smoke acceptance pass on
Windows 11, Obsidian 1.14.4 (installer 1.14.0), in `kplex-test-small`.
Both repository output and installed artifacts have these SHA-256 values:

| Artifact | SHA-256 |
| --- | --- |
| `main.js` | `78e0e00fcd4c534f4fd0e26c986957f1f789ea9274d15b44e48bf2b1ecae765f` |
| `styles.css` | `3dd15f02ccd96bd363731342b7fc8d056b8461ca7371b9ca3746d41471f3366f` |
| `manifest.json` | `19d9ecce5557733e0ff0f2e27155e635c30158c3cfa6fbca0f11c16e4dedfd2c` |

Focused native feature lanes are still pending at this checkpoint. Final actual
results will be recorded before returning the draft PR. No personal vault is used.

The resource claim is narrowly testable: search typing, layout presentation,
native payload creation and folder editing/cancellation must perform no added
body reads, parsing, source acquisition, semantic compilation or snapshot writes.
Actual On-demand navigation and note creation/retargeting are measured separately
and are expected to perform their normal work. This is not a claim of zero UI
CPU/allocation cost or a startup/indexing speedup.

## Remaining platform acceptance

Windows Electron input and synthetic native-handler events do not establish
physical phone/tablet interaction, macOS Option/Command handling, minimum-version
host compatibility, or an actual OS drag gesture between windows/applications.
These outcomes must be distinguished in the final results rather than inferred
from portable tests or DOM dispatch.
