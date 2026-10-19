# Live settings synchronization (PR #182)

Implemented on `2026-10-18-live-settings-sync`, integrated with merged #181 through
`8b0fdbd` without rewriting history. Fully verified runtime:
`dbe531732bfd76b1e7c1a10c20b3a56ac5128554`; final native tooling:
`f7424d808f87cd051987f105f7cf330df475b4e7`. Later closeout changes are documentation
only. Keep #182 draft for maintainer testing and pause; no merge or release.

## Cause and ownership

The baseline had no `Plugin.onExternalSettingsChange()` callback. Incoming file
changes could leave live settings stale, and subsequent whole-snapshot saves could
restore unrelated old fields. The public callback exists since Obsidian 1.5.7 and
is present in the actual installed 1.13 typings. Ordinary Vault modify events do
not provide this configuration-file contract.

`SettingsReconciliation` extends the existing settings disk queue, separating raw
expected disk data, a detached accepted effective snapshot, live mutable controls
and captured local edit intent. Notification reads are generation-fenced, coalesced
and retried at most three times. Startup retains notifications before consumers
exist; unload retires reads and retry timers. No polling service or second writer.

Every unstarted local save reads through `loadData()` and applies only its submitted
root changes to the latest accepted snapshot. Appearance/library, lens definitions,
hierarchy, actions and individual workflow roots use explicit conflict owners;
ordered collections and dictionaries are replaced, never recursively merged.
Unrelated edits survive; stale same-owner submissions are refused with localized
reopen/reapply feedback. Existing same-device field merging and queued undo remain.

Incoming evidence captured during an accepted disk write is retained. After that
write settles, received and unrelated accepted local roots reconcile against the
captured predecessor; same-owner incoming data wins. Failed storage gets read-back,
not blind replay. Only exact intended-payload read-back can confirm a write whose
promise rejected after committing. Duplicate/own echoes and key reordering are
no-ops; genuine A to B to A remains valid. Live mutations cannot modify the detached proof.

## Live effects and compatibility

Reception does not save, initialize themes, import ExcaliBrain data, replay startup,
navigate to another device's center, or deliberately reopen native documents.
Existing own-settings migration keeps root appearance and selected-theme content
coherent. Same-ID active changes retire relevant editor owners; inactive metadata
and duplicate receipts do not. Unsupported future containers retain the established
preserved/read-only serializer behavior. All eight locales include conflict/failure copy.

Native Settings reuse Obsidian's declarative renderer and public `update()`.
Transient row keys fence delayed events by their remote owner revision and never
enter persisted data. Existing appearance, lens and action subscriptions converge;
commands compile using the receiving device's key convention. Presentation receipts
use existing paint/presentation owners without a mixed-change semantic fallback.
Actual ontology/inference changes refresh the existing semantic-policy owner.
Slow graph/native refresh remains outside the disk queue; failure means adopted
settings with pending view refresh, without rollback or replay.

`indexingMode` remains stored-versus-active until restart. Startup restoration,
legacy interval and startup-window preferences do not rerun initialization; live
throttle stays with its existing reader. No parser, cache/source schema, scheduler,
relationship classifier or index algorithm changed. C14 structural work stays paused.

This prevents stale snapshots after observed incoming changes, not all distributed
conflicts. Simultaneous offline/same-owner device edits and the interval between
file read/write still depend on Sync resolution. One settings-file preflight per
local save is intentional work. No comparative CPU/memory improvement is claimed.

## Final verification

Node **22.22.2**, real installed dependencies and Obsidian typings. Full
`npm run verify` passed: official lint, indexing fixture, real build/types, and:

| Test group | Passed | Failed / skipped |
| --- | ---: | ---: |
| Architecture | 7 | 0 / 0 |
| Restricted core | 130 | 0 / 0 |
| Main regression group | 1,061 | 0 / 0 |
| UI / Chromium | 162 | 0 / 0 |
| Portable sources | 334 | 0 / 0 |
| Browser source/storage | 623 | 0 / 0 |

Sixteen focused scenarios exercise production persistence/reconciliation methods
through controlled two-plugin shared-file updates, held reads/writes, stale editors,
actions/scalars, palette deletion, future data, startup, refresh failure and exact
durable read-back. Disabling callback delivery or shared preflight makes the
corresponding regression fail; both controls restore source bytes.

Windows 11 / Obsidian **1.14.4** (installer 1.14.0), Electron **43.3.0**, Chromium
150.0.7871.212, native Node 24.18.1; authorized Small vault only:

| Exact-build native lane | Result |
| --- | --- |
| Real external file callback, actual On-demand session | 6 / 6 |
| Same lane, verified actual Eager session | 6 / 6 |
| Existing style operations, concurrent saves and storage/refresh faults | 15 / 15 |
| Existing migration import, managers, unchanged save, rendering and reload | 6 / 6 |

The migration entry reused the completed full-verification receipt only after
checking clean source, log checksum and all artifact hashes. Its native assertions
were unchanged. All native/browser drivers ran serially.

Each presentation receipt used **1 settings read; 0 outgoing saves, note reads,
parses, acquisitions, semantic refreshes or builds**. Main/sidebar/popout DOM and
colors updated, actual native Settings refreshed, stale handlers were refused,
and a subsequent unrelated native save retained received root/theme colors.
Received stored mode did not change the active session. Real ontology changes
updated stationary rendered Parent nodes in all views, preserving editor identity,
leaf, caret and centers. Torn input retained valid settings and later recovered.

Full post-setup observations include the local save, opening a native editor,
real ontology refresh and invalid-file recovery: each mode recorded 7 settings
reads, 6 note reads, 0 parses, 1 semantic refresh, 0 builds and 1 local write.
Acquisitions were 3 in On-demand and 0 in Eager. These totals include native editor
work and must not be attributed to the presentation receipt or used as CPU savings.

Earlier failures remain in private evidence: two full harness prerequisite errors
(explicit compile inventory and missing Notice stub), the initial native fixture's
omitted canonical Challenger field and workspace-autosave restore race, and two
final focus-oracle failures. The latter were demonstrated setup errors: native
frontmatter initialization moved requested line 0 to actual line 4 before receipt;
before/after identity, leaf and caret were identical with zero focus events. The
validator now compares observed state and retains bounded facts on failures.
No production runtime or timeout/assertion budget changed to resolve these trials.

Final cleanup restores opening settings, workspace and configuration bytes exactly,
original On-demand mode and **107 files / 88 Markdown**. No owned controllers,
dialogs, pending adoption or debugger capture remain. Installed artifacts match:

- `main.js`: `75177091ce58f6e70a214954fb33224767e75208ea8defa32bf8bcc9af48e425`
- `styles.css`: `0135225519ad680cace5c7a35e8eab8388a3c6e6a8ead1a10a49f337324b106a`
- `manifest.json`: `19d9ecce5557733e0ff0f2e27155e635c30158c3cfa6fbca0f11c16e4dedfd2c`

## Private evidence and reproduction

Verified durable backup, **outside Temp**, with originals retained and nothing
published: `%LOCALAPPDATA%/KplexValidation/live-settings-sync-182-20261018-1792354136115`.
98 files / 12,419,738 bytes include raw successes/failures, negative controls,
private disposable configuration backups, exact build and two source ZIPs. Both
ZIPs pass CRC checks and per-entry SHA-256 validation. HANDOFF and temporary scripts
containing its body are excluded. `MANIFEST.json` and `COPY_VERIFICATION.json`
verify copied files; manifest SHA-256:
`4151640803f1ddf7641a1e3305ada346df8f78ed14b253486b5e401090ca970c`.

`sources/runtime-at-full-verification.zip` pins runtime `dbe5317`;
`sources/runtime-and-tests.zip` pins final tooling `f7424d8`. Their source manifests
and `REFERENCES.json` retain checksums, revisions, fixture and reproduction details.
Reproduce with `npm run verify`, then the exact-build disposable-vault setup in
[CONTRIBUTING.md](../../CONTRIBUTING.md). Run `verify:obsidian:external-settings`
in existing On-demand and `KPLEX_EXTERNAL_SETTINGS_MODE=eager` sessions, followed
serially by `verify:obsidian:style-operations` and `verify:obsidian:migration`, each
with the explicit Small name/path/config and a fresh report directory. The external
lane creates only three synthetic notes; its source defines their exact contents.
Never publish its raw configuration backups. No personal vault was accessed.

## Remaining acceptance and decision

Ready for maintainer testing; keep draft. CI is not awaited. Required unavailable
platform evidence stays pending:

1. Real macOS/Windows Sync: receive styles, save an unrelated preference in both
   directions, reject a stale editor, and observe quiescence after edits stop.
2. Minimum Obsidian 1.13 with a non-default config directory: real callback delivery
   and persistence at that actual location. Installed types/current Windows differ.
3. Physical phone/tablet: live reception, Settings/editor focus and per-surface
   behavior. Desktop Chromium/Electron does not prove mobile interaction.
