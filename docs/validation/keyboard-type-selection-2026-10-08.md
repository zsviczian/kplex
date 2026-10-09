# Option shortcuts and typing selection validation — 2026-10-08

Status: passed. Source freeze: 306 inputs, `1ad42fa3ddbd99cd7f974aa02a139c5e65478c8d7422c74197c7f73587f7a53e`; Node 22.22.2, Obsidian 1.14.4, disposable `kplex-test-small`.

Alt/Option printable defaults preserve saved custom bindings/disables. Graph-only typing selects displayed occurrences across every area using a case-insensitive contiguous phrase. Tab/Shift+Tab wrap; Escape clears; Backspace edits. Nodes remain displayed, and center/Vault search remain unchanged. Native palette/reference rows use title/description left, native shortcut chips right, fixed search and independent result scrolling.

| Validation | Result |
| --- | --- |
| Full software checks | 7 architecture, 69 core, 399 Node, 20 UI, 333 portable, 410 Chromium passed |
| Installed Obsidian typings, official scanner, real production build | Passed; zero findings |
| Native action scenarios and guarded OS editing keys | 21 scenarios and 4 OS_CUA clipboard accelerators passed |
| Native supplemental workflows | 8 passed |
| Desktop/tablet/phone emulation | 3 passed; original desktop mode/geometry restored |
| Final source/artifact identity and cleanup | Unchanged freeze; all 3 built/installed hashes match; 73 Markdown files, 0 owned fixtures/controllers/dialogs/sessions/guards/settings rows/groups/recorder |
| Original disposable configuration | Both queues drained; 15,858-byte original settings, enablement and original hotkey-file absence restored, independently read back; no reload afterward |

Root independently reviewed projection/selection/reveal ownership, native physical virtual-key registration, original-event parent forwarding, focus/mode/connection/IME guards, detached recorder facts, contextual collision replacement/retry behavior, bounded query work and exact resource cleanup. Native tests verify Option chords/readable hotkey search, parent-letter precedence, cross-area matching, no hiding, all query controls/custom-action priority, badge control non-overlap, fixed search/results geometry at 1200/900/390px, actual global Settings destination identity/scroll/highlight, sidecar ownership and plugin/window lifetimes.

[Raw evidence packet](keyboard-type-selection-2026-10-08.json) retains the complete freeze ledger, exact artifact hashes, every failed/interrupted software/native attempt, final results and restoration receipts. A stale bare-R fixture was corrected; an interrupted verification was superseded after badge/control overlap correction. Historical formatting OS input was interrupted while the maintainer typed a message. Both immediate final-leaf detach and normal native close exposed an Obsidian Titlebar teardown race before its initial status callback. Three Markdown baseline closes and three K-Plex closes after observed native initialization had no errors. Final acceptance waits for that actual initial status, then normally closes the exact owned window with unchanged retirement/destruction/error checks. Native global Settings focus/trusted query replacement passes; raw Meta+A clearing is unreliable, so DOM selection is fixture setup. All diagnostics are retained; no production workaround was applied.

Physical phone/tablet touch, non-US/IME hardware keyboards, other desktop operating systems, screen-reader feedback, custom-theme contrast and rapid overflow selection during changing layout, and closing a popout during native initialization remain prioritized maintainer checks. Emulation, Electron trusted input and OS automation do not establish physical hardware acceptance. Existing custom shortcuts remain authoritative; Reset adopts the new defaults.

The indexing 4/73 symptom remains recorded for later investigation; PR #82 was not incorporated into this branch. C15–C26 stay paused. No commit, release or personal-vault deployment.
