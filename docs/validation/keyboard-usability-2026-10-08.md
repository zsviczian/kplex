# Keyboard usability validation — 2026-10-08

The maintainer's keyboard feedback is implemented and verified in Obsidian 1.14.4 on macOS / Apple M1. Changes remain uncommitted. The [raw evidence packet](keyboard-usability-2026-10-08.json) retains accepted results, unsuccessful attempts, exact source/artifact identities and restoration checks. Previous Action Manager and native settings reports remain historical checkpoints.

## Delivered behavior

- Selected regular and compact nodes have a 3px theme-accent outline, outer ring and larger halo. The native run records the computed outline and shadow.
- Cmd/Ctrl+Enter on an existing selected note centers it and ensures this Plex's managed sidecar is open. Repeating the shortcut reuses the same leaf. Section, unresolved-node and URL handling preserve their applicable routes; the sidepanel does not offer a sidecar action it cannot own.
- The executable menu is **K-Plex command palette**. **Keyboard shortcuts** is a separate searchable, read-only reference with current saved shortcuts. Enter in its search neither runs an action nor opens configuration; explicit **Configure shortcuts** opens the native declarative settings page after retiring help.
- All 114 catalog actions have short purpose-oriented descriptions, including focus destinations.
- Fresh defaults use `/` search, `?` help, `R` rename, `0` select center, `M` context menu, Cmd/Ctrl+Shift+G focus Plex and Cmd/Ctrl+Shift+E focus associated editor. Printable chords work in the graph without stealing editor/search typing. Saved bindings and explicit disablement remain authoritative; an action's **Reset** adopts its current defaults.
- Plugin settings gear, globally searchable native declarative action settings, hotkey search and Obsidian's hotkey-chip markup remain verified.

## Verification

The 303-input source freeze is `c62be44c8e7b1f6de4b21e2643075122db592cb6c6fdc315ce661b704fc03e09`. No production source changed after full verification. Test-driver readiness and explicit custom-key fixtures were corrected separately; their exact hashes are recorded per attempt.

| Gate | Result |
| --- | --- |
| Node 22.22.2 full verification | 7 architecture, 69 core, 388 Node, 20 UI, 333 portable, 410 Chromium tests pass |
| Official Obsidian scanner | 0 errors / 0 warnings |
| Installed Obsidian types and production build | Pass |
| Exact-build staging | Built and installed `main.js`, `styles.css`, `manifest.json` hashes match |
| Primary native attempt 8 | 20 scenarios pass; 4 trusted OS_CUA editing chords; complete cleanup |
| Native workflow attempt 2 | 8 scenarios pass |
| Device emulation attempt 1 | Desktop, tablet and phone pass; original desktop geometry restored |
| Final native error gate | No errors captured |

The primary run validates graph/search/editor ownership, preserved custom bindings, fresh letter defaults, distinct help, stronger selection, repeated center-and-sidecar behavior, command publication, native settings search/recording, Markdown preview and Excalidraw focus, multiple surfaces, popout migration and reload recovery. Native OS copy/paste/select-all/undo operate only on exact owned fixture notes, with fresh accessibility checks and trusted DOM input proofs.

## Unsuccessful attempts and limits

All unsuccessful attempts remain in the packet with cleanup/restoration results. Primary 1 used an incorrect Electron arrow transport spelling; primary 2 inherited disabled section crossing rather than fresh defaults; primary 3 encountered an already-open Settings window. The initial attribution to help Enter was disproven by a direct zero-configuration-call native check. Primary 4–6 encountered notice coverage or unsettled pointer delivery; bounded actual hit-testing and stable target geometry precede the same trusted click oracle. Primary 7 exposed a stale assumption that F1 remained a default; named-key transport tests now assign F1/F3/F4 explicitly as preserved custom bindings. Primary 8 recovered three read-only CLI polling timeouts without changing behavior deadlines, production code or native error gates.

Workflow 1 selected the correct overflow occurrence while the newly prepared fixture was still changing layout, leaving its row clipped. Workflow 2 waits for stable initial row/scroll geometry and passes the unchanged exact-row visibility and filter-retirement assertions. This proves the settled workflow; selection during a changing layout remains a separate timing limitation.

Desktop mobile emulation establishes layout and platform routing, not physical touch, mobile WebView, hardware keyboard, IME or screen-reader acceptance. Prioritized manual checks:

1. Physical phone/tablet scrolling, help/settings touch targets and recorder cancellation.
2. Non-US/IME hardware shortcuts and screen-reader labels, including `?` and native chord recording.
3. Rapid overflow selection during incoming relationship/layout updates, plus selection glow under a custom theme.

## Restoration and scope

The final audit confirms 73 Markdown files, zero owned fixtures/controllers/dialogs/sessions/guards, zero retained action settings rows/groups/recorders, closed Settings and the original desktop window (1440×875, minimum 200×150). Both plugin write queues drained before restoration. Fresh pre-test `data.json` (15,902 bytes, SHA `0f90239a9c3022a4d038745c6407b2972a1b612d16c1b7419e60b7994b83bd0a`), enabled-plugin list and originally absent `hotkeys.json` were restored and independently byte/hash checked later. No reload followed restoration. Both temporary awake leases were released.

The [4-of-73 indexing observation](indexing-stall-observation-2026-10-08.json) remains recorded for later investigation. PR82 was not incorporated. C15–C26 stay paused. No commit, merge, release or personal-vault deployment was performed.
