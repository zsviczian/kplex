# Native action settings integration — 8 October 2026

Implementation and automated validation are complete. This follow-up replaces the original configuration modal described in [the A–F implementation report](action-manager-2026-10-08.md); action dispatch, composer, persisted preferences and command IDs remain unchanged. Source is uncommitted on `action-manager`, based on `67ee400b56c7706d795412d6f6631b365d15c394`. C15–C26 remain paused.

## Delivered behavior

The Plex gear menu opens the main K-Plex settings page. Actions and shortcuts is a native declarative subpage, with all 114 actions individually indexed by Obsidian's global Settings search. Its local name/chord search and All, Assigned, Assigned by me and Unassigned filters affect only original-page rows. The keyboard icon records a chord for search without changing preferences.

Shortcut bubbles inherit Obsidian's `setting-hotkey`, `mod-empty`, `setting-hotkey-icon`, `setting-delete-hotkey` and `setting-add-hotkey-button` appearance. Empty rows show Blank and the add control uses the circled plus. Semantic buttons retain accessible labels and keyboard activation. Edits save immediately through existing serialized workflow preferences; conflict replacement, failed-save retry, unknown fields and future schema protections remain intact.

The settings controller owns rendered rows and transient recorder lifetimes. Typed window migration rebinds exact global-search listeners to the Settings document; structural DOM guards account for adopted elements retaining their creating constructors. Native toggles remain single components per row and ignore callbacks matching committed state, so opening or refreshing the page does not save preferences.

## Verification

The frozen final source contains 301 inputs, SHA-256 `286e469a6960727014fa7a5b567495397f44cb7b53ff7b46f89f3056084e9e7c`. Required Node 22.22.2 full verification passes: architecture 7, restricted core 69, Node 385, UI 20, portable 333 and browser 410; scanner 0 errors/0 warnings, actual installed Obsidian types and production build pass. Frozen source remains unchanged after these checks.

The exact installed build passes native primary **19 scenarios**, workflows **8 scenarios**, and desktop/tablet/phone emulation **3 cases**. Native assertions cover root settings routing, all 114 searchable actions, local filters and hotkey search, globally searched locally hidden results, native chip classes, read-only initialization, immediate toggle/shortcut persistence, recorder cancellation, plugin restart recovery, owned popout migration and editor focus. Paste, Select All, Copy and Undo each have an exact trusted OS_CUA key event on the owned native editor; this proves OS automation delivery, not physical keyboard coverage.

Earlier failed attempts are preserved in [the machine-readable evidence](action-settings-integration-2026-10-08.json), including CLI read timeouts and uncaught Obsidian titlebar errors. Primary6 passed its scenarios but failed the aggregate error gate. Its passive trace showed the owned closing popout still retiring when plugin disable began: DOM window.closed was false while its native zoom method was unavailable; the main frame retained a valid method. The driver now waits for that owned window to finish native destruction before starting the independent restart scenario, under the unchanged 15-second deadline. Primary7 passes with no captured errors and retains one read-only CLI timeout/retry. This is a test sequencing correction; no production code or error handler was changed to suppress the failure.

Final audit: 73 Markdown files, zero owned fixture paths/controllers/dialogs/action sessions/guards/settings rows/groups/recorders; main host document/window active, desktop mode, original 1440×875 bounds at (0,25), minimum 200×150, no captured errors. Both write queues drained before restoring the fresh pre-follow-up configuration. Data settings and enabled-list bytes match their original hashes; hotkeys.json remains absent. A later readback remains identical, with no reload after restoration. Temporary awake leases are released or expired.

Final `main.js` SHA-256: `2c6cf09d3656608413e86e10b6782220610466a1e69fffbe305de85c2fa4e117`; `styles.css`: `050ce8733994f5aa90300d280e7dbd74ac9ddb07572d4a67c559339c7943314d`; `manifest.json`: `19799fff9ae459130d707901e7c0d98b3e14a8567881a393f07d457c2fa8ec1c`. Built and installed artifacts match. The evidence packet embeds accepted and failed raw reports, driver hashes, source freeze, restoration and audit receipts.

## Retained observations and limits

The [4/73 indexing observation](indexing-stall-observation-2026-10-08.json) remains preserved. [PR82](https://github.com/zsviczian/kplex/pull/82) remains separate for the maintainer to merge after delivery; this follow-up changes no production indexing behavior. Strict legacy full UX/cold hydration acceptance remains separate from local action acceptance.

Desktop phone/tablet emulation validates responsive geometry and platform routing; it does not establish physical touch, mobile WebView, device memory/performance or mobile hardware keyboard behavior. Other desktop operating systems, IME/non-US hardware layouts and screen reader behavior remain manual.

No commit, merge, release or personal-vault deployment was performed. Test staging targets only `kplex-test-small`.
