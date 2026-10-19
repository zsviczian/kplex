# Independent Plex document sync and Footprints — PR #187

Status: implemented and locally validated; PR remains draft.

Branch: `2026-10-19-plex-sync-footprints`. Integrated main through `1076068` without rewriting history (`42209ee`). PR #186 was merged before starting this work. This implements the approved batch for #31 and #59; both issues remain open and the PR remains draft.

## Delivered ownership

Each native `BaseKplexView` owns a `KplexDocumentSession`. It retains the center, Off/Recent/Pinned intent, native target, companion preferences, source-inspection suppression and pending native-follow identity/revision. React and window remounts keep that owner. Actual view close disposes it. `sidecarLeaves` remains the sole managed-companion association inventory; folds keep their existing owner.

Managed and ordinary native destinations share the existing serialized native-open path. Requests capture the native view, destination, ownership revision, canonical file identity and path. A non-cancellable accepted native open can finish, but superseded requests cannot apply mode, focus or remembered-state completion. Identical observations preserve Markdown/drawing representation. Another pair's managed companion is excluded from implicit Recent and pin selection. Explicit acquisition releases conflicting ownership without closing the former owner's document.

Native workspace state stores a versioned allowlist of scalar center/sync intent and verified native target IDs. The host's isolated ID bridge is checked with the installed public `Workspace.getLeafById()` API. Copies to another leaf retain the center without inheriting its native claim. Legacy companion intent seeds only one unambiguous old workspace. Restoration creates no replacement split when a matching native target is absent.

Command-palette sync uses the originating surface and its center. Cross-window ambiguity uses the existing native `ActionTargetPicker`; captured stale surfaces never fall back to another Plex. Pins and saved navigation history retain their shared ordering, deduplication, limits and queued settings writer.

## Footprints

The native session owns `PlexFootprints`, a chronological list of small visit IDs and canonical action references. Repeated visits remain separate. Same-center publications and native echoes add nothing. Normal navigation, including older trail selection, uses the existing activation/history path. Selecting an older visit appends; it does not truncate the trail. **Start here** retains only the current visit in that Plex.

The host Lucide Footprints icon sits beside Find. The disclosure reuses `FloatingLayer`, the collection-window owner, native icons and the existing saved-node presentation. It resolves/renders at most 40 rows, shows the newest visit at the top on opening, supports keyboard navigation and keeps the scroll position when a reader is inspecting older visits.

The trail has no persistence/export method. It is absent from native `getState()`, plugin settings, graph caches and support-report projections. Renames update occurrence coordinates without manufacturing visits. Missing or replaced references stay unavailable; selecting them never creates a note. Memory grows with the session's visits; the UI window is bounded, not the retained visit sequence.

## Checkpoint evidence

Node 22.22.2; Windows Obsidian 1.14.4 (installer 1.14.0), explicit disposable `kplex-test-small`. The final full `npm run verify:obsidian` passes on clean runtime head `95d82fdff6fedb54dc692e1ae6280f9e6bdfca8d`: 1,149 primary, 187 browser, 334 source and 642 browser-storage tests, plus architecture/core, official lint, production TypeScript/build and exact-build Small smoke. The 20,015-owner IndexedDB case completes under its existing deadline. The final native session replay passes all 15 scenarios on that exact staged build. These are regression checks, not a comparative performance campaign.

Final staged main.js SHA-256: `dbd5c7aa12d8736e9da91d8059f5607e41a08e4f0d674dbcadb90ed68574478c`. Receipt source is clean `95d82fd`; subsequent report/handoff edits do not change runtime code. Implementation checkpoint `106e81b` has green GitHub verification; the later checkpoint's final CI state is recorded in the draft PR rather than inferred from that earlier result.

The user-requested Footprints glyph is 14 px against Find's 15 px, with shared canvas button styling and the same 30 px hit target. Native geometry checks verify control alignment. Chromium retains 10,000 chronological visits while rendering at most 40 rows; visible-row resolution remains bounded per append. Memory for the chronological trail grows with actual visits.

| Native lane | Result and scope |
| --- | --- |
| Plex sessions, final | 15 passed: two independent pairs, same-file distinct panes, held A -> B -> A opens, source/drawing representation, repeated/reset/older Footprints, full tag/type rows, rename/delete/recreate, command origin, Zen portal retirement, duplicate native views, popout/main migration and real renderer restart of two exact pair IDs with fresh trails. |
| Menu anchor, second | 14 passed, including owner-document placement, keyboard/outside dismissal and native migration. |
| Sidecar folding, eighth | 37 passed after the bounded overlap correction, including overlapping groups, exact owner routing and cleanup. |
| Display modes, fourth | 12 passed: desktop fullscreen/Zen independence, native lifecycle/migration and phone/tablet emulation geometry. |
| Sidebar follow, desktop second / phone second | 8 passed in each: hidden rapid follow, exact pending-note supersession, explicit/history navigation and native note opening. |
| Excalidraw representation, third | 18 passed: Off/Recent/Pinned/Sidecar toggles via canonical/native/trusted Windows shortcut paths, independent second-owner companion, explicit source inspection, embedded Markdown defaults and drawing defaults. |
| General live updates, first | 15 passed plus one setup observation: structural drops/materialization, Bases drops, editable Properties synchronization, bounded refusal recovery, overlap, non-Markdown and popout. |
| Issue #161, first | 28 passed: both ghost-navigation variants, actual external drawing creation, pinned-target control, first click, four repeated cycles per variant, tab switching, stationary Parent edit and disabled-follow control. |

The final session replay and full verification use clean head 95d82fd. Menu receipts precede the later folding correction; the other native matrices use the corrected candidate. Exact artifact hashes and driver snapshots are in the private receipts. No production parser, compiler, source-cache schema or indexing scheduler changes are proposed.

During Footprints open/reset/Escape, observed semantic-demand acquisitions, Vault reads, rebuilds and plugin-settings saves are zero. Passive counters also show zero parses, inventory passes, full-build starts, node-catalog starts and snapshot/checkpoint saves. Normal navigation is outside that interval and can legitimately hydrate/save shared history. These are functional operation counts, not comparative resource or performance claims.

During the fold/unfold no-source-work control, K-Plex semantic/source/write/open counters remain zero. Total native `cachedRead` is **2**, both attributed to the enabled Obsidian Word count owner's verified `onSelection -> onFileOpen -> Vault.cachedRead` stack. The test retains the total and bounded raw attribution, disables no core plugin, and rejects every unattributed read. It does not claim the host performs zero reads.

## Confirmed correction and test boundaries

The overlap lane traced a real ownership loss: folding Plex A made Plex B's shared native tab-group geometry zero, and the layout callback released B's managed companion. The correction reuses the existing live fold-topology validator before releasing an invisible association. Invalid topology or a detached native leaf still releases it. A production-callback regression exercises all three cases. No second association map or scheduler was added.

A restart control must wait for Obsidian's debounced native workspace writer to reach disk. The session driver now checks the complete serialized leaf-ID set and both exact center/target tuples in workspace.json before a renderer restart. An elapsed delay alone was not a valid durability boundary. Cleanup removes only verified fixture children before their owned folder; original raw failures remain intact.

The shared native fixture helper captures verified leaf IDs even while a restored native view is deferred. It keeps no renderer global and restores native scalar state through the real view lifecycle. The sidebar test now locates the existing empty graph inside the App root, and serialized cleanup uses expressions. The Excalidraw test sends Control for Windows Mod chords and Command for macOS; native per-view representation and document preferences replace obsolete global fixture fields. Its old expectation that switching to Recent retained a managed companion was replaced by an explicit two-owner isolation control, consistent with the implemented product behavior.

## Preserved failures and limits

Earlier full runs found obsolete global-sync assertions, five global materialization/command/toolbar fixtures, and two publication fixtures lacking the new pending-URL callback. Corrected affected lanes pass; all failed runs remain private. Rename remapping runs once in the startup lifecycle owner, rather than again in the later index listener.

Early native drawing controls used raw setViewState, which Excalidraw legitimately redirects; the corrected control uses its actual Open as Markdown action. A popout control retired during focus-time React remount, so the driver reacquires only that exact view's current control. One cleanup timed out after restoring the original layout; the exact owned fixture subtree was removed and Small reloaded to retire the test task. The sixth restart trial assumed durability too early; its recovery receipt and subsequent passing disk-boundary trial are retained.

All 37 folding scenarios and cleanup passed in the seventh trial, but its final strict error check captured an intermittent native Obsidian popout teardown exception, `t.webContents.getZoomFactor is not a function`, in app.js. That run remains failed. The unchanged eighth trial passes without captured errors; the host exception is a remaining limitation, not suppressed or claimed fixed. One display-mode attempt passed all ten desktop cases then failed to reload the plugin in emulation; cleanup/configuration recovery and failed controls are preserved. A clean native reload and unchanged fourth full matrix pass. The cause of the earlier reload failure is not established.

macOS, physical phone/tablet touch, mobile WebView and screen-reader acceptance are not established by Windows/Chromium emulation. No personal vault was accessed. Evidence stays private in TEMP originals and a checksummed durable backup under LOCALAPPDATA/KplexValidation/plex-sync-footprints-187-2026-10-19. No archive is published, no branch deleted, and no merge or release is authorized for #187.

## Closeout

Final native cleanup and the preserved pre-lane baseline restore the original Small workspace and settings exactly. No owned fixtures/controllers/fullscreen DOM remain, and mobile emulation is off. TEMP originals and failed trials remain; the durable private backup has a per-file checksum manifest. Nothing is archived or published. The branch remains draft for maintainer review; issues #31 and #59 remain open. Highest-value manual checks are two independent pairs with the same file, popout teardown, and Footprints keyboard/touch behavior on physical devices.

## Newest-first follow-up

The stored chronological trail is unchanged. The disclosure projects newest-first through the existing bounded window. Home selects newest, End oldest, and arrows follow visual order. Stable visit IDs and scroll offsets preserve older reading/focus anchors when visits arrive; short lists clamp correctly. Row projection is memoized so scroll/focus settlement does not repeat resolution. Seven focused Chromium/session checks pass, including 10,000 visits with the existing 40-row/80-resolution bound. Earlier failed scroll-anchor and short-list controls remain private. Full verification and exact-build native replay of this follow-up are pending; the earlier full/native results above apply to their recorded revisions.
