# Saved shortcut conflicts — 2026-10-09

Status: accepted after independent review, full verification, exact staging and native cleanup. This follow-up supersedes the earlier local-collision rejection policy in [the initial conflict report](action-shortcut-conflicts-2026-10-09.md). User interim base `3f2d6b0`, branch `action-manager`; reviewed changes remain uncommitted.

## User-visible behavior

A conflicting local shortcut saves immediately, retaining every other assignment. Both affected settings show native red shortcut bubbles and counterpart action names under the description. The Conflicts filter/count stays red when selected and unselected, includes affected local and external-global settings, and counts actions rather than conflict pairs. External Obsidian command names appear in warning-colored text beneath settings, readable without a globe tooltip. Own published-command assignments remain neutral information. Replace/Cancel conflict choices and automatic replacement are removed. Removing an assignment changes only that action; native global maps remain read-only in production.

## Compatibility and ownership

The canonical portable compiler owns exact contextual collisions, conservative layout overlaps and ambiguity-safe matching. The existing live keyboard dispatcher consumes ambiguous local events and prepares neither action. Malformed/future input, four-shortcut cap, serialized storage failure/retry/rebase and committed-memory publication remain guarded.

The optional `defaultBindingsVersion: 1` workflow marker makes historical unmarked default suppression a one-time load migration. Explicit current saves preserve inherited/default counterparts immediately, including an unmarked live draft. Marked reload, unrelated edits and restoring a default preserve deliberately chosen conflicts. Future default generations use existing unsupported/raw-preservation guards. No action ID, command ID or graph/indexing semantics changed.

Recorder-observed key/code equivalence is detached session evidence. Removal/edit or row/controller teardown retires it; retry reconstructs facts against fresh preferences. After reload, distinct logical Option glyph and physical-code identities require fresh event facts to prove correspondence; the implementation does not guess a keyboard layout. Same-identity and canonical known-layout comparisons survive reload.

## Evidence and limitations

Root independent focused90/90 tests pass on Node22.22.2, after an initial sandbox-only loopback EPERM blocked eight browser scenarios (82 pass/8 infrastructure failures); authorized localhost Chromium rerun passes all90. Source freeze308inputsSHA `a840e3879261e8d6a8d84d29929d8ff795600315ef2af50cb4993a10bd1209e4`. Full `npm run verify:obsidian` passes architecture7/core69/general416/UI20/portable333/Chromium410 plus indexing fixtures, full official source scanner0, actual installed types and production build. Exact staging and native render smoke pass. MainSHA `6af4c1ded407d108777b9101a52f8b3a1d75ce14ebb0caa75c2f3b42a0b339a5`; CSSSHA `c5debd74849fdf9a815c5fa61ec4326142413d7f5d3c11ee5e6124a174943bd4`; manifestSHA `19799fff9ae459130d707901e7c0d98b3e14a8567881a393f07d457c2fa8ec1c`.

Native acceptance uses actual Obsidian1.14.4 in disposable `kplex-test-small`, real declarative Settings, serialized controller saves, plugin disable/enable, exact theme color comparisons and trusted Electron renderer input. Three window widths exercise layout only. This does not prove physical keyboard, touch, screen-reader interaction or mobile WebView behavior. The whole-artifact external CSS scanner is unavailable here; official source scanner plus real types/build and native styling remain the available checks. Legacy rectangular clipping from the prior follow-up retains the polite live announcement without `clip-path`.

## Prioritized manual checks

1. Physical phone/tablet: add a duplicate shortcut, read both counterpart names without hover, then remove one; the other remains and the Conflicts filter updates. Desktop narrow layout does not prove native touch activation.
2. Non-US keyboard/layout switching with logical Option glyph bindings: confirm recorder-observed overlap wording, remove/re-add and reload behavior; session evidence must not be treated as a persistent layout map.

Indexing4/73 and PR82 remain deferred; C15–C26 remain paused. No commit, merge, release or personal-vault deployment.

## Native result and restoration

Final native2 passes all18 scenarios and independent cleanup, with no captured JavaScript errors. Actual light-theme local chips/filter use red RGB233/49/71 with white foreground; external warning text uses RGB236/117/0. Both newly saved local counterparts appear in the count/filter; external-global warnings remain distinct. Tests retain both assignments, allow global advisories, verify custom-empty/default native refresh and shifted punctuation, record Shift+Option+R in both modes with trusted Electron input, fit widths1200/900/390, retain an inherited-default conflict across actual plugin disable/enable, and remove only the chosen assignment. A trusted ambiguous F11 chord is consumed with zero ActionManager.prepare calls.

Native1 passed the same18 behavior assertions but failed cleanup because its geometry object was an Electron remote proxy belonging to the released old Settings context. Recovery restores original preference bindings, detaches the already restored geometry, closes Settings and deletes the controller. The test-only driver now snapshots geometry as plain JSON before releasing a context. Native2 reruns all18 and cleanup successfully; product source/build did not change. Both packets and copied driver identities are retained in [the evidence JSON](saved-shortcut-conflicts-2026-10-09.json).

Audit:73 original notes, zero owned files/controllers/dialogs/sessions/guards/rows/groups/recorder/timers/focus listeners/native subscription/owned commands, closed Settings, original main bounds1440×875 at0/25 and minimum200×150, desktop mode, main-window/document routing and exact installed artifacts. The polite announcement uses rectangular clipping and clipPath none. A passive audit of an unavailable private hotkey-map field was discarded; restoration is established by owned-command cleanup and file-byte readback.

Latest pre-staging16,881-byte data.jsonSHA05bb26dd…/46-byte enablementSHA4ac82798…/2-byte originalhotkeys{}SHA44136fa3… restored byte-for-byte after both write queues drained, independently read back, no subsequent reload. The temporary awake lease was released (exit130). Original preferences are retained; only the exact tested plugin build stays installed in the disposable vault.
