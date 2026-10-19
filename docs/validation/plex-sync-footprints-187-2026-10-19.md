# Independent Plex document sync and Footprints — PR #187

Status: complete repository verification passed; final native acceptance is in progress.

Branch: `2026-10-19-plex-sync-footprints`. Integrated main through `1076068` without rewriting history (`42209ee`). PR #186 was merged before starting this work. This implements the approved batch for #31 and #59; both issues remain open and the PR remains draft.

## Delivered ownership

Each native `BaseKplexView` owns a `KplexDocumentSession`. It retains the center, Off/Recent/Pinned intent, native target, companion preferences, source-inspection suppression and pending native-follow identity/revision. React and window remounts keep that owner. Actual view close disposes it. `sidecarLeaves` remains the sole managed-companion association inventory; folds keep their existing owner.

Managed and ordinary native destinations share the existing serialized native-open path. Requests capture the native view, destination, ownership revision, canonical file identity and path. A non-cancellable accepted native open can finish, but superseded requests cannot apply mode, focus or remembered-state completion. Identical observations preserve Markdown/drawing representation. Another pair's managed companion is excluded from implicit Recent and pin selection. Explicit acquisition releases conflicting ownership without closing the former owner's document.

Native workspace state stores a versioned allowlist of scalar center/sync intent and verified native target IDs. The host's isolated ID bridge is checked with the installed public `Workspace.getLeafById()` API. Copies to another leaf retain the center without inheriting its native claim. Legacy companion intent seeds only one unambiguous old workspace. Restoration creates no replacement split when a matching native target is absent.

Command-palette sync uses the originating surface and its center. Cross-window ambiguity uses the existing native `ActionTargetPicker`; captured stale surfaces never fall back to another Plex. Pins and saved navigation history retain their shared ordering, deduplication, limits and queued settings writer.

## Footprints

The native session owns `PlexFootprints`, a chronological list of small visit IDs and canonical action references. Repeated visits remain separate. Same-center publications and native echoes add nothing. Normal navigation, including older trail selection, uses the existing activation/history path. Selecting an older visit appends; it does not truncate the trail. **Start here** retains only the current visit in that Plex.

The host Lucide Footprints icon sits beside Find. The disclosure reuses `FloatingLayer`, the collection-window owner, native icons and the existing saved-node presentation. It resolves/renders at most 40 rows, reveals the newest visit on opening, supports keyboard navigation and keeps the scroll position when a reader is inspecting older visits.

The trail has no persistence/export method. It is absent from native `getState()`, plugin settings, graph caches and support-report projections. Renames update occurrence coordinates without manufacturing visits. Missing or replaced references stay unavailable; selecting them never creates a note. Memory grows with the session's visits; the UI window is bounded, not the retained visit sequence.

## Checkpoint evidence

The final full `npm run verify:obsidian` run passes on Node 22.22.2, including `npm run verify`, production TypeScript/build and exact-build disposable-vault smoke. Its lanes pass 1,148 primary, 187 browser, 334 source and 642 browser-storage tests, plus architecture/core checks and official lint. The long 20,015-owner IndexedDB case completes under its existing deadline. These are regression checks, not a new comparative performance campaign. The later user-requested Footprints glyph adjustment uses 14 px against the magnifier's 15 px and shares its canvas button styling; affected browser/scanner rechecks accompany the checkpoint.

- Actual TypeScript build and changed-source scanner pass on Node 22.22.2.
- 228 focused session, follow, action, editor and persistence tests pass at the first implementation checkpoint. Final-head checks remain pending after subsequent lifecycle/tooling changes.
- The serial Chromium affected lane passed 159 cases before the command-palette extension. Its Footprints test retains 10,000 ordered visits with at most 40 rendered rows and bounded visible-row resolution per append. Final-head browser verification remains pending.
- Native Windows Obsidian 1.14.4 (installer 1.14.0), `kplex-test-small`: the first complete candidate passes 11 scenarios. These cover two independent pairs, distinct panes displaying the same file, held A → B → A native opens, drawing-as-Markdown, source inspection, repeated Footprints, reset/focus, older-row append, duplicate native views, popout/main migration, scalar serialization and an actual renderer restart restoring two exact pair IDs with fresh trails.
- In the native Footprints open/reset/Escape interval: zero semantic-demand acquisitions, Vault reads, rebuild requests and plugin settings saves. Existing passive counters also show zero parses, inventory passes, full-build starts, node-catalog starts and snapshot/checkpoint saves. Normal navigation is outside that interval and can legitimately hydrate/save global history. This is functional work-count evidence, not a comparative performance claim.

The native candidate above precedes the final command/lifecycle adjustments; it does not establish final-head acceptance. No production parser, compiler, source-cache schema or indexing scheduler change is proposed.

## Preserved failures and limits

The first full-verification attempt stopped at indexing smoke assertions that still expected global sync calls. The second reached the full 1,148-case primary test lane: five fixtures failed because they retained global materialization/command ports or the old toolbar container. The migrated fixtures then passed all 133 affected tests. These failures remain in private logs; neither failed full run is counted as acceptance. Path remapping now runs once in the startup-registered lifecycle owner, rather than repeating in the later index listener.

The third full run passed the primary lane but found two render-to-effect publication fixtures missing the new pending-URL callback. After correcting those fixtures and the final canonical-URL/hidden-portal cases, all 65 affected checks pass and the fourth complete verification passes. Failed runs are retained separately. The final native trial also checks that Zen retires an open body portal while retaining the native trail.

The first drawing controls used raw `setViewState()`, which Excalidraw redirects to its drawing view. K-Plex issued no extra opens or visits. The corrected control uses Excalidraw's actual **Open as Markdown** action.

The first popout control reference retired during a focus-time React remount. The corrected driver reacquires only that same view's current control after focus. One failed trial's awaited layout cleanup timed out even though the original native layout had returned; the verified fixture subtree was removed and the disposable renderer reloaded to retire the pending test task. Later cleanup returns test popouts to main before restoring the layout. All originals/failures remain private.

Required remaining work: affected native menu/Sidecar/display/interaction lanes and remaining targeted lifetime variants. macOS, physical phone/tablet touch, mobile WebView and screen-reader acceptance are not established by Windows or Chromium emulation. No personal vault was accessed. No raw archive is published, no branch deleted, and no merge or release is authorized for #187.
