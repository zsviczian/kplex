# SI5 physical-device checklist

Desktop closeout is complete on implementation commit **`9d8b5c9cb3e5fd7e42edc7d3a65684eda241ee5e`**. The [exact report](settings-independent-indexing-si5-merged-selection-2026-10-04.md) and [settings-route/retirement audit](settings-independent-indexing-si5-closeout-audit-2026-10-04.md) record the completed automated/native work. The narrow correction removes redundant transactions; overall warm latency did not demonstrate improvement. No further automatic architecture, dense-hub, cold-start or performance change is queued.

**SI5 remains open for physical iPad and Android validation.** This is the frozen candidate for those tests, not a release acceptance. Copy all three exact artifacts together; a matching `0.0.5` version alone is insufficient.

| Artifact | SHA-256 |
| --- | --- |
| `main.js` | `094b520cb267567086fab211b460fd05b7bd02eb1d3f196a736688426b8cec89` |
| `manifest.json` | `e3bb9a35215af97f6a3394cf7fc8f7d2142bae06de94bb112fef5a05819cda62` |
| `styles.css` | `e9da76ff7840cea44b77912963977f1fe2ab762b69a9853d047712d7b3270494` |

Frozen convenience archive: `/private/tmp/kplex-si5-device-candidate-9d8b5c9.zip` (SHA-256 `b8416760417a4ecf7c2c7742e5bc5c7b1fb2f8117ed3a120f400c48b2a1de197`). It contains only the three artifacts above; archive contents were verified against those hashes.

Use a disposable vault. Copy `dist/main.js`, `dist/manifest.json` and `dist/styles.css` together into its `.obsidian/plugins/k-plex/`, then reload K-Plex. Record device model, RAM if known, OS, Obsidian version, build hashes, fixture identity/file count and whether the app stayed in the foreground. Required targets are a physical iPad and Android device; record an iPhone run separately rather than substituting it for the iPad.

Before/after each workflow, run **K-Plex: Copy index diagnostics** in the Command Palette and retain the copied report. The command exports aggregate status/repository/hydration decisions, not the desktop warm probe's full phase/work counters; mark absent work counters unmeasured. Record foreground screen video for visible latency and touch behavior. If you can safely reproduce a storage failure on a disposable device vault, verify that it reports unavailable/pending without losing completed data; otherwise record that fault case unmeasured.

Create `SI5 A.md` containing `SI5Friends:: [[SI5 B]]` and an empty `SI5 B.md`. Allow initial indexing to finish, open A in K-Plex, then run the following checks. Repeat the settings/navigation measurements three times after warming the same fixture; retain the first-run result separately.

| Workflow | Expected result and evidence |
| --- | --- |
| Configure `SI5Friends`, move Friend → Challenger, remove/re-add it, toggle inference and image selectors | A's relationship zone, gates/counts, explanation and edit eligibility agree with the final settings. No cold indexing restarts. Record foreground screen video for time from interaction to the correct visible result. Presentation target: ≤250 ms; a normal requested Plex: ≤1 second. |
| Navigate A → B → A; use siblings, expansion, search and a lens | Current relationships/labels remain coherent. Search returns the requested note and its current selected targets. Also check body-only URL/virtual search from an unopened note; record missing entries as failures. |
| Close/reopen Obsidian after a settings change | Saved policy and latest notes appear without a cold whole-vault rebuild. Copy index diagnostics before/after; a green indicator alone does not establish zero reads/parses. Mark unavailable counters unmeasured. |
| Begin first acquisition on the large fixture, background/terminate Obsidian, reopen | Completed work remains reusable, missing work resumes, and the requested view becomes correct. Repeat with a sync/edit arriving during reopen. Keep failure/termination evidence. |
| Edit the unconfigured field, restart, then configure it | The latest reference appears, including after a semantic no-op edit while the field was unconfigured. |
| Touch and lifecycle | Tap navigation, pan, pinch, long-press, scrolling and focus work together. Closing/reopening the final view preserves camera/folds and allows progress to resume. Record behavior after OS suspension and any WebView termination. |

The 20k dense hub is a documented stress limit, not a required SI5 device gate. Use representative notes with hundreds of links (around a thousand for an extreme realistic note). The maintainer has accepted the existing extreme-vault cold behavior; no further synthetic cold optimization or high-node redesign is required. Record sampled diagnostics and any OS memory/termination evidence; browser JS heap is not device/process peak memory. Desktop emulation cannot close these gates.

Return the recordings, copied diagnostics and a pass/fail/unmeasured row for each workflow. A failed latency, memory, interruption or touch result remains an open SI5 gate; no implicit waiver follows from a passing desktop run.

## Return record

| Device | Model / OS / Obsidian | Exact build / fixture | Workflow | Pass / fail / unmeasured | Visible latency (3 warm runs) | Diagnostics / video / termination evidence |
| --- | --- | --- | --- | --- | --- | --- |
| Physical iPad | | | | | | |
| Physical Android | | | | | | |

Highest-priority failure to look for: suspension/termination or sync during acquisition/reopen strands readiness or loses reusable progress. If a required case fails, stop that case, retain its diagnostics/recording and report the trigger; do not repeatedly rebuild or delete caches to hide it. Desktop main-window/popout interaction evidence is retained separately; any newly observed camera/fold/provenance problem is still a failure to investigate. After required outcomes pass, record them against these exact hashes and close the two remaining aggregate SI5 checklist gates. iPhone/emulation cannot substitute for physical iPad/Android.
