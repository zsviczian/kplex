# Live settings synchronization — PR182

Branch `2026-10-18-live-settings-sync`, updated without rewriting through `8b0fdbd`
after the authorized PR181 merge (`main@c0cd100`). First runtime checkpoint:
`c0f10e917408eec22b808be612bc38ea8af1e514`. Keep PR182 draft; pause after completion
for maintainer testing. No merge/release or work on PR141/147 is authorized here.

## Cause and implemented ownership

The baseline had no `Plugin.onExternalSettingsChange()` implementation. Whole
snapshots were serialized from live memory, allowing a later unrelated local save
to restore fields from before an incoming settings replacement. The callback is
public since Obsidian1.5.7 and present in the actual installed1.13 typings; it covers
plugin configuration files which ordinary Vault modify events do not represent.

`SettingsReconciliation` extends the existing plugin settings disk queue. It keeps
raw expected disk content, an immutable accepted effective snapshot, mutable live
settings and captured local intent separate. Reads are detached, generation-fenced
and coalesced with three bounded replacement retries. Startup notifications are
retained before consumers exist; unload retires reads and retry timers. There is
no polling/watch service, extra writer, persisted conflict schema or Sync backend.

Every unstarted settings write verifies the plugin's own data file through
`loadData()`, then applies only submitted root changes to the accepted snapshot.
Appearance/library and lens colors, hierarchy, actions and individual workflow
roots have explicit conflict owners. Objects and ordered collections are replaced;
there is no recursive merge which can resurrect removed styles or palette entries.
Same-device queued edits retain existing field merging and submission order,
including an undo queued before the earlier save completes.

The primary callback captures incoming data even during an accepted disk write.
After that write settles, unrelated accepted local roots and received roots are
reconciled against the captured predecessor. Same-owner incoming data wins that
post-write reconciliation; a not-yet-started conflicting local operation is refused
with localized reopen/reapply feedback. Failed/uncertain storage gets read-back,
not blind replay. An exact intended-payload read-back confirms a write which
committed before its storage promise rejected; mismatching/uncertain data does
not acquire that success. Accepted writes are not retroactively described as cancelled.

Own echoes and equivalent object-key reorderings are no-ops. Arrays retain order
and multiplicity, absence remains meaningful, and a later remote A→B→A applies;
there is no permanent blacklist of previously seen content. Baselines are detached
from live objects so imperative controls cannot alter accepted proof by mutation.

## Live effects, compatibility and limits

Reception does not save, import legacy data, initialize a theme library, restore
another device's workspace, navigate, or deliberately reopen native documents.
Selected theme contents and the root appearance use existing own-settings migration
and projection. Same-ID active changes advance the existing editor activation;
inactive preset metadata does not retire active drafts. Existing style managers
retain their stale/read-only/discard behavior. Future action/color/theme containers
remain preserved and read-only through their established serializers.

Native Settings keep Obsidian's declarative renderer and public `update()` path.
Transient handler keys encode their remote owner epoch, preventing an old row's
delayed event from resaving a received value. Those aliases are never persisted.
Action recorders/queued drafts use the equivalent owner guard; publication uses
the receiving device's existing compiler and current accepted preferences.

Presentation receipts use existing presentation/paint and subscription owners,
with no mixed-change semantic fallback. Consent revocation publishes immediately.
Actual ontology/inference changes invalidate and refresh existing semantic policy;
they are not falsely treated as zero work. Slow graph/native refresh stays outside
the settings disk queue, and refresh failure reports applied-settings/pending-view
status instead of rolling back or resaving the file.

`indexingMode` remains stored-versus-session: GraphIndex captures its active mode
at construction. URL acquisition remains background-only under existing migration.
The legacy interval is registered at startup; incoming interval/startup window and
restoration preferences do not replay startup or reconfigure native panes. Live
throttle remains read by its existing owner. No source/cache schema, parser,
relationship classifier, index scheduler or cache purge changed; C14 stays paused.

This prevents stale writes after observed incoming changes. It does not make
asynchronous file synchronization a distributed transaction: simultaneous offline
or same-owner device edits, and the unavoidable interval between file read and
write, remain subject to the Sync service's resolution. A settings-file preflight
read is intentional work on each local save; no comparative CPU/memory claim is made.

## Verification record

Node22.22.2, installed dependencies and actual Obsidian types. Fifteen deterministic
Chromium scenarios exercise the production plugin persistence/reconciliation
methods with controlled shared-file reads/writes, not a rewritten algorithm:
two instances/both directions/quiescence; same-ID appearance and A→B→A; key order
and echoes; held reads/writes; preflight without callback; queued undo; conflicting
styles/actions/scalars; failed storage/future containers; slow refresh; startup
before consumers; event-save rejection; detached live mutation; a real dirty style
editor and received palette deletion with local concurrent field merging.
The combined focused run passes50 tests including existing action controls.

Removing callback delivery fails the actual two-instance scenario. Removing the
shared preflight fails the unnotified replacement scenario. Both controls restore
the exact source bytes in finally. Required build/types and lint pass at checkpoints.

Earlier failures are retained:

- The first full attempt stopped because the indexing harness did not compile the
  two new modules into its explicit temporary inventory. Its corrected indexing
  fixture passes, including24 settings-independence production scenarios.
- The next full run passed1052/1061 in its first test group; nine native-shaped
  shortcut tests lacked the newly used Notice export in their finite host stub.
  Updating that boundary makes the affected action/sync run pass50.
- Native1792351071407 reached real delivery/paint with zero saves/reads/parses but
  correctly reported1 semantic refresh/3 acquisitions: setup had omitted the
  canonical Challenger field, and own migration restored it. The matched fixture
  now retains that field. Plugin data restored exactly; native workspace autosave
  overtook its byte restore, so cleanup now drains before restoring configuration.
- Corrected native1792351158314 passes5 scenarios on Windows11 / Obsidian1.14.4
  installer1.14.0, On-demand mode: a real external callback, native Settings/stale
  handler, unrelated local save, stationary received ontology and torn-file recovery.
  Main/sidebar/popout colors update with0 note reads, parses, acquisitions, semantic
  refreshes, full builds or outgoing settings saves. Configuration bytes restore.

Final full-chain and exact-build native repetitions remain pending at this
checkpoint. Later entries below identify the final source/artifacts and actual
results; the earlier trials do not substitute for final-head validation.

## Remaining device acceptance

1. Real macOS↔Windows Obsidian Sync with this branch: style reception, unrelated
   save in each direction, a conflicting open editor and quiescence after edits stop.
2. Minimum supported Obsidian1.13 and a non-default config directory. Current
   Windows host1.14.4 and installed types establish different evidence.
3. Physical mobile/tablet reception and native Settings/editor focus while Sync
   delivers changes. Desktop Chromium and Electron do not prove mobile interaction.

Use disposable vaults. No personal settings dump/vault was accessed, and no raw
evidence is authorized for publication. Private backups preserve failures and
originals; source and archive/checksum references will be pinned at closeout.
