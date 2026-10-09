# Recorder and typing-badge polish — 8 October 2026

**Software verification passed; native acceptance awaits unlock.** [Machine-readable record](recorder-polish-2026-10-08.json).

The typing phrase/count now sits top-left with the magnifier’s inset, and long phrases ellipsize before its button. Recording uses native Setting/Dropdown/Button components, a distinct capture area and a responsive footer. Changing matching mode refocuses capture; new recordings start physical. Existing saved bindings retain their matching semantics.

Separate Shift/Option presses remain intermediate chord state. A shared canonical policy permits explicitly modified physical Dead/accent positions; only graph focus can execute them. Logical Dead, ordinary/Shift-only accent typing, IME, AltGraph and accent gestures in native editors/fields remain native. The source confirms dropdown focus loss and blanket physical Dead rejection. Whether Dead caused the maintainer’s unspecified original key failure is inferred.

Node22.22.2 full verification passes 7 architecture / 69 core / 405 Node / 20 UI / 333 portable / 410 Chromium checks, installed real Obsidian types, zero official scanner findings and the production build. The exact build is installed in disposable kplex-test-small. Focused foundation/recorder69 and action-surface14 checks pass. An early verification failed before staging because three import-only doubles lacked ButtonComponent; those exports were added without changing assertions, and all47 affected tests passed. Both attempts are retained.

The native attempt stopped before its first scenario because the Mac was locked (native/document focus=false). CUA accessibility timed out. An existing driver failure snapshot assumed an already-created host leaf and raised a secondary TypeError, obscuring the initial prerequisite failure; the driver now records the primary error first and safely captures optional state. That driver-only correction is syntax checked and still needs an actual rerun.

The cancelled run created no fixtures. Its final cleanup removed the controller; independent audit found73 Markdown files, zero owned files/controllers/dialogs/sessions/guards/settings groups/rows/recorder, main-window ownership, original desktop bounds/mode, drained write queues and matching built/installed artifact hashes. An unowned existing Settings window remains open and was preserved. Original16,181-byte settings (SHA8f1d61e2…), enablement and hotkey-file absence were restored and independently read back. No reload followed restoration. The temporary awake lease was released.

Pending after unlock: native modifier/mode-change capture, one OS_CUA ShiftOptionR recorder chord, native1200/900/390 form geometry/badge symmetry, existing four OS editor chords and responsive device emulation. Fresh native attempts must preserve current user configuration again, clean up and independently read it back. Expected remaining time is about3–5min once native automation is responsive; no native pass is claimed here.

Indexing4/73 evidence remains deferred; PR82 is separate. C15–C26 stay paused. Changes are uncommitted; no merge, release or personal-vault deployment.
