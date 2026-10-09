# Issue #2: long editor paste freeze

Status: correction reviewed and full verification passed; real native paste acceptance pending
an unlocked session with Settings closed on `fix/large-paste-freeze`,
based on main `25ba53ee300dd9cbe8c48ecba4e1381f993dc445`.

## Reproduction and causal evidence

The [report](https://github.com/zsviczian/kplex/issues/2) describes repeated freezes immediately
after pasting a long podcast transcript, even with no visible Plex. The reporter's later
restart leaves the saved note responsive. The supplied paragraph has 30,687 JavaScript
characters / 30,704 UTF-8 bytes; SHA256
`78235486dba10bd512da8cbcc1222420ab882a208cd47c27717703e510fe5eb0`.
It is used only as an external local diagnostic, not committed as a third-party fixture.

The globally registered, default-enabled ontology editor suggester evaluated fourteen
unanchored optional greedy-whitespace regexes against the entire editor-line prefix.
A long line without any trigger caused quadratic backtracking. Visibility/index debounce
guards do not cover this native editor owner. Earlier Vault.modify tests did not exercise
clipboard insertion or the editor suggestion callbacks.

| Original owner observation | Duration |
| --- | ---: |
| Node22.22.2, synthetic 2k / 4k / 8k prose | 95.7 / 380.5 / 1529.3 ms |
| Node22.22.2, supplied paragraph | exceeded independent 5-second deadline |
| Actual registered native owner, 2k / 4k prose | 133.3 / 371.3 ms |
| Actual native owner disabled, 31.5k input | 0 ms at measured resolution |
| Canonical synchronous / cooperative paragraph parser | 2.41 / 2.50 ms |

The native baseline temporarily toggled and synchronously restored the original setting;
it made no editor/file/clipboard changes. These timings isolate the suggester but do not
by themselves prove successful real paste, save or paint.

## Narrow correction

`src/editor/OntologySuggester.ts` now derives the terminal query boundary and uses bounded
literal KMP matching. It preserves role/prefix ordering, legacy optional-prefix selection,
empty/custom/Unicode/whitespace/colon/metacharacter triggers, query and exact insertion
span. No line-length cap, settings migration, retained editor text, parser duplication,
index scheduler change or production timing diagnostics were added.

Three synthetic owner tests cover existing role/filter/insertion behavior, a bounded
comparison with the old regex, and an independent child-process deadline over large prose,
unbroken input, a 10k overlapping custom trigger and a valid trigger after long prose.
The corrected external production-owner probe measured the supplied paragraph at0.240ms
and 8k prose at0.257ms. These are local observations, not universal timing promises.

## Verification and limits

Affected checks:18/18 owner/parser/architecture tests passed; final owner tests3/3 passed.
Actual installed-package types, touched-source official Obsidian ESLint and whitespace
checks passed. Root independently reviewed production and regression code.
The full `npm run verify:obsidian` lane passed on Node22.22.2 (07:50:58–08:03:51UTC):
7 architecture / 69 core / 424 general / 20 UI / 333 portable source / 410 Chromium tests,
indexing fixtures, official lint, actual installed-package types and production build. Exact
installed-artifact hashes matched and native graph render smoke passed without captured errors.
The unchanged311-input freeze digest is
`7b3454f2ee1b61dc334b768a4de7cc6d882461254c173b7a6a761a01d566f7ae`.

| Artifact | SHA256 |
| --- | --- |
| main.js | `0496ad5f231768ea2585a72673d89518174c8ef9480c9a8abd3cc9196d6316a2` |
| styles.css | `05c59fe68c56784fb3e727056b7e27aee65f7f595d7145e4710b75f660dacc55` |
| manifest.json | `19799fff9ae459130d707901e7c0d98b3e14a8567881a393f07d457c2fa8ec1c` |

A corrected actual registered native-owner probe measured2k at0.5ms,4k at0ms at timer
resolution, and the supplied30,687-character paragraph at0.1ms. It synchronously restored
the original enablement setting and changed no editor, clipboard or files.

The native paste attempt at08:05UTC failed its unlocked-session/no-unowned-Settings
prerequisite before installing its controller or running any scenario. **Real paste/save/typing/
autocomplete/reload acceptance remains pending**; no scenario is claimed from the owner probe.
Driver source receipt SHA256:
`a762822c68d5bfc07b78668beceaf250141eb2d305afca586aa62b816edee777`.

The failed attempt independently removed/checked all ownership, compared original native
main/left/right/floating workspace branches, and restored configuration. Final audit found
73notes,0owned notes/controllers/dialogs/sessions/guards/settings rows/recorders/overlays;
main window/document, desktop mode and1440×875geometry/minimum200×150 preserved.
Original Settings stayed open. Fresh configuration was backed up immediately before staging
after write queues drained; original data.json17,104bytes SHA256
`917529459ca3d7725bff5d521222b9ffbe90c23407c1961b4645349c2ef36d34`,
enabled-plugin list and hotkeys all match independent readback. No reload after restoration.
Local full/native/owner/audit receipts are under `/private/tmp/kplex-issue2-*`.

Highest remaining risk: actual editor clipboard insertion invokes multiple native callbacks.
Run the prepared driver after unlock and closing Settings; require complete text saved,
responsive following edits, and unchanged parent/inline autocomplete. Physical-device
interaction and full application restart remain separate coverage limits.

Native driver `scripts/testing/obsidian/largePaste.mjs` owns one disposable Markdown note
and captured editor, trusted Electron paste, temporary suggestion timing/heartbeat observers,
clipboard restoration and exact settings/workspace cleanup. Planned scenarios cover hidden
and visible Plex, repeated paste, subsequent typing, configured parent/inline suggestions,
exact saved text and plugin reload. This does not claim physical-device touch, paint latency
or full application restart.

PR#86 was already squash-merged before this task. Its strict URL-heavy post-parse CI check
failed at56.8ms and at64.8ms on retry against its unchanged50ms bound. Both failure logs
are retained independently; the paste correction does not change or relax that gate.

The maintainer subsequently authorized publication with issue#2 deliberately kept open until
the reporter tests and confirms. At publication the session was unlocked but unowned Settings
remained open; no real native paste scenario has been added to the acceptance claim.
