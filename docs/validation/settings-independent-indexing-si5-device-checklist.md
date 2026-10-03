# SI5 physical-device checklist

Prepared for the maintainer's iOS and Android runs. **Do not treat this candidate as SI5 accepted or release-ready:** desktop restart/fault validation and remaining catalog/performance work must finish first. Use the final approved artifact hashes from the SI5 validation report, not a similarly versioned `0.0.5` build.

Use a disposable vault. Copy `dist/main.js`, `dist/manifest.json` and `dist/styles.css` together into its `.obsidian/plugins/k-plex/`, then reload K-Plex. Record device model, RAM if known, OS, Obsidian version, build hashes, fixture identity/file count and whether the app stayed in the foreground. Required targets are a physical iPad and Android device; record an iPhone run separately rather than substituting it for the iPad.

Create `SI5 A.md` containing `SI5Friends:: [[SI5 B]]` and an empty `SI5 B.md`. Allow initial indexing to finish, open A in K-Plex, then run the following checks. Repeat the settings/navigation measurements three times after warming the same fixture; retain the first-run result separately.

| Workflow | Expected result and evidence |
| --- | --- |
| Configure `SI5Friends`, move Friend → Challenger, remove/re-add it, toggle inference and image selectors | A's relationship zone, gates/counts, explanation and edit eligibility agree with the final settings. No cold indexing restarts. Record foreground screen video for time from interaction to the correct visible result. Presentation target: ≤250 ms; a normal requested Plex: ≤1 second. |
| Navigate A → B → A; use siblings, expansion, search and a lens | Current relationships/labels remain coherent. Search returns the requested note and its current selected targets. Also check body-only URL/virtual search from an unopened note; record missing entries as failures. |
| Close/reopen Obsidian after a settings change | Saved policy and latest notes appear without a cold whole-vault rebuild. Copy index diagnostics before/after; a green indicator alone does not establish zero reads/parses. Mark unavailable counters unmeasured. |
| Begin first acquisition on the large fixture, background/terminate Obsidian, reopen | Completed work remains reusable, missing work resumes, and the requested view becomes correct. Repeat with a sync/edit arriving during reopen. Keep failure/termination evidence. |
| Edit the unconfigured field, restart, then configure it | The latest reference appears, including after a semantic no-op edit while the field was unconfigured. |
| Touch and lifecycle | Tap navigation, pan, pinch, long-press, scrolling and focus work together. Closing/reopening the final view preserves camera/folds and allows progress to resume. Record behavior after OS suspension and any WebView termination. |

Use the 20k/large-file fixture and the separately identified dense/high-node/high-degree fixtures. Record sampled diagnostics and any OS memory/termination evidence; browser JS heap is not device/process peak memory. Desktop emulation cannot close these gates.

Return the recordings, copied diagnostics and a pass/fail/unmeasured row for each workflow. A failed latency, memory, interruption or touch result remains an open SI5 gate; no implicit waiver follows from a passing desktop run.
