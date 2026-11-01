# Remembered creation outcomes and native folder reveal

The related-note, folder-child and placeholder dialogs share one **After saving** select.
An explicit selection is persisted; dialog-specific fallbacks do not replace it. Placeholder
materialization omits Create another and Follow node. Sidecar is omitted in the sidepanel;
popouts are desktop-only. New tabs use the invoking Plex group, or the most recent main
workspace group when invoked from the sidepanel. Return creates without opening an editor.
The old editing toggle migrates to Sidecar/Return. Preference changes are presentation-only.

Native file and folder reveal use the same guarded Files/system delegates. Folder menu
callbacks capture native identity and reject deletion, rename and same-path replacement.

The branch already contained explicit placeholder-reference relocation. This follow-up proves
the maintainer's `[[folder/folder/note title]]` case across body, embeds, Markdown links and
properties. Creation in a changed folder rewrites approved references, preserving aliases and
heading/block suffixes. No rename of a nonexistent old file or automatic-link-update setting
is involved. Existing partial-write/retry and concurrent-edit guards remain covered.

## Focused evidence

The maintainer explicitly requested immediately relevant validation, not a full regression.
No aggregate indexing suite was run for this follow-up. Prior full-suite results at `92b7508`
remain historical evidence for that earlier checkpoint, not the new runtime sources.

- 45/45 creation, actual browser composer/folder dialog, placeholder relocation, preference
  migration, native group routing, exact occurrence readiness and folder reveal checks pass.
  The exact focused command is recorded in CONTRIBUTING.md, File creation and navigation acceptance.
- 25/25 localization checks pass, including all eight supported catalogs.
- Touched-module ESLint, portable TypeScript compilation, production build and import boundary
  checks pass: 235 migrated roots, 427 reachable files, zero violations. Whitespace checks pass.
- Eight exact-build macOS native cases pass in the existing disposable Small vault: tab,
  editor, maximized editor, Sidecar, popout, sidepanel/main-group routing, actual single-control
  Create another/Return, and actual placeholder Return with explicit relocation.
- Native relocation checks actual body links, embeds, alias/heading and property links, the
  new file identity, absence of the old physical file, and unchanged center under Return.
  Persisted after-saving selection is checked on disk. Settings/enablement bytes, owned
  fixture cleanup, workspace and window-throttling restoration pass.

The initial hidden-window setup did not reach index readiness. Foregrounding the exact Small
window and temporarily preserving/disabling its background throttle resolved test setup;
cleanup restored the prior value. This is functional routing evidence, not a performance claim.
The first native editor attempt correctly failed: an explicit semantic node without its displayed
occurrence could not pass existing editor admission. The fix adds a bounded displayed-center
snapshot port, waits for exact native file identity and unique current occurrence, then runs the
accepted editor action once. Pending, unrelated and repeated occurrences are rejected by tests.
Browser sandbox restrictions required rerunning the local Chromium lane with localhost access;
all 45 focused checks then passed without weakening assertions.

Exact hashes and eight native case receipts are in
[the sanitized native record](creation-after-saving-2026-11-01.native.json).
Production was not deployed or modified for this follow-up. K-Plex Help is untouched; its separate
author can use [the behavior reference](../help-authoring/creation-navigation-features.md).

## Limits and useful manual follow-up

Windows native destinations and physical phone/tablet keyboard/touch remain separate acceptance.
No full regression or indexing performance claim is made for this change. When trying this build,
check the preferred outcome in your usual creation dialog, and on a tablet check that Return
creates without opening an editor. OS Finder/System Explorer delegation is covered through the
production adapter with controlled native capabilities; no production folder was revealed.
