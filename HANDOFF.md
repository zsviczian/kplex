# C06 / C07 / C08 — reviewed and accepted

**Status:** Reviewer validation complete on 2026-09-26. C06 and C08 are Done; C07 is deliberately Deferred. Starting revision: `9eafd95` on `kplex-refactor`. The durable result, exact test evidence and limitations are in `Refactor plan.md`. Overwrite this single transient file for the next selected handoff; do not archive it.

## Accepted result

- **C06:** host-free `collectionWindow` is used by the three native settings managers. Their initial limits and increments remain 12/+20, 12/+20 and 16/+24; callers own filtering, sorting, counts, rendering and mutations. The reviewer localized the three touched Show more captions with `collection.showMore` and strengthened the list behavior test.
- **C07:** reviewed the source survey of rename, note-type, folder creation, ghost materialization, deletion and relationship dialogs. Their shared native Obsidian construction does not justify converting different validation/action/async policies into a portable content primitive. No runtime dialog was changed. The broad physical software-keyboard survey was not performed or claimed; it belongs with a future reopened dialog checkpoint/UX change. Separate tablet keyboard-window and draggable desktop-dialog requests are #35/#36.
- **C08:** exact opaque IDs, explicit node kind/resolution, optional plain file metadata, readonly graph views and a narrow legacy semantic-settings view. The Obsidian adapter maps legacy facts without moving persisted identity or changing settings/schema. The reviewer preserved the legacy exact `md` extension predicate, added all-kind/settings/host-object-boundary tests and a fresh-process identity test, and included core `.tsx` files in the restricted type lane. There are no production mapper consumers yet; C09 owns first adoption and revision-boundary validity. Readonly views share legacy metadata arrays and do not freeze them.

## Reviewer evidence

Clean `npm ci` on Node **22.22.2** and final `npm run verify:obsidian` passed: architecture **16 roots / 58 reachable files / 0 violations**, restricted core type lane and **3 core tests**, Obsidian lint **0 errors / 24 unchanged warnings**, all indexing fixtures, **32 aggregate Node tests**, **3 browser DOM tests**, TypeScript and production build. `git diff --check` passed.

Exact-build Obsidian 1.14.2 report: `/var/folders/b1/2dys0jfs7bq73whkl2qnyyym0000gn/T/kplex-obsidian-uKb2UQ/report.json`. JS SHA-256 `93adf6c131c8e16c27a050c46494b8dbcec48572c6e6c1277dbfe938795ade58`; source/staged artifacts matched.

Native-manager checks used temporary plain in-memory fixtures and restored their providers: batch sizes, final remainder captions, search/reset, relationship role filtering and unassigned frequency/name sorting passed in desktop/pop-out and tablet/phone emulation. Modals stayed contained without horizontal overflow. Full warm hydration reached **20,701 nodes**; six node kinds rendered through the real navigation path; persisted semantic settings matched loaded values; original center/history and desktop mode were restored. No captured JavaScript errors. No cache-deleting large-vault rebuild or physical-device performance result is claimed; intermittent index issue #34 is separate.

**Manual acceptance checks:** none needed for these low-impact extractions/contracts or the no-runtime-change deferral. Physical touch/software-keyboard coverage is not claimed for every existing dialog.

## Next checkpoint

**C09 is a Strong no-Obsidian agent candidate.** Inventory one actual graph-read consumer and migrate only that path through a narrow interface backed by the current `GraphIndex` facade/C08 mapping. Preserve semantic versus presentation-filtered queries; record remaining concrete-index reach-through and view/revision validity. The reviewing agent retains exact-build Obsidian checks. Prepare a new scoped assignment by overwriting this file when the next handoff is selected.
