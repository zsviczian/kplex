# Standing instructions ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in the issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.




---

# PR261 implementation return

**Inactive handoff: implementation accepted for integration.** On 2026-11-02 the maintainer authorized committing/pushing this work, merging PR261 and returning the checkout to main. No further implementation assignment is active.
Implementation starting HEAD: `fc30792c6824366c1b18ea1a04d183f6f11d3b8e`; base: `bde2bca2b76236cae3a1adb1dfcc6090e4573867` (0.4.1). The evidence below identifies the reviewed candidate before its integration commit; the PR carries the durable implementation/validation summary.
No release or separate issue-closure operation is requested. Physical-device/platform limits remain documented below and are not asserted as passing.

## Final checklist

- [x] Read the complete PR261 brief, issue bodies/comments, repository instructions, architecture and mixed-agent workflow; recheck branch/main/related PR ownership.
- [x] Work through #255, #107, #254 in order and capture missing/failing behavior before implementation.
- [x] Implement each issue in its existing action/native clipboard/settings owners.
- [x] Complete affected production-method/browser checks, architecture, lint, portable types and the real production build.
- [x] Pass all three exact-build Windows native lanes in the existing disposable Small vault, with independent cleanup.
- [x] Add the requested independent After saving preferences, migration, composer regressions and exact-build native reload check.
- [x] Remove the temporary PR stub and transient staging helper; preserve the standing handoff header.
- [x] Maintainer authorized integration of the reviewed work with its recorded validation limits.
- [ ] Physical-device/platform acceptance below. These are not asserted as passing.

## Implementation by issue

### #255 - captured section navigation

The production-method baseline regression ended on B when an explicit A#Second open activated a native leaf still displaying B. That old-file observation was incorrectly allowed to enqueue a newer passive open. A second regression exposed the queued case where the current native B and an older pending target A must both remain distinct.

The existing request retains those exact identities while preserving the separate prior-mode completion identity. There is no blanket follow lock, timeout, retry or added navigation delay. Section menus now dispatch the same captured node.open action as keyboard/pointer opening. Valid sidebar sections are admitted without broadly enabling unrelated sidebar actions. Native file identity, source stat/cache revision and stale-menu lifetime checks reject replaced or outdated sections.

Final native evidence: both normal canvas and sidebar reach the actual A file and Second heading through the controlled activation race and a real menu click. Another Plex remains unchanged. Portable regressions additionally cover pending predecessors, rapid headings, same-file mode preservation, later deliberate navigation, two owners and stale identities. **The original Android long-press report/video was not independently reproduced on a physical device.** The controlled Windows result supports the identified defect; it is not a claim that every Android event order was tested.

### #107 - destination-aware Copy node link

The existing node.copy-link action, selection/center policy, action palette and configurable command/hotkey metadata are retained; the node menu now exposes that action. The host adapter writes through the invoking document immediately in the user gesture. A bounded private HTML receipt plus exact plain text identifies K-Plex-owned pastes; matching ordinary text alone grants no authority.

At editor-paste time, the receiving editor's physical file supplies sourcePath to Obsidian FileManager.generateMarkdownLink. The installed Obsidian declarations were checked (generateMarkdownLink and editor-paste). No competing path resolver, format preference model or clipboard polling was added. Public Editor.replaceSelection retains native insertion/undo ownership. The existing ClipboardSession supplies revocable write completion; originating view migration/teardown and plugin unload release captures.

Real notes, attachments and valid section source/anchors use native formatting. URLs and tags copy as text; unresolved nodes copy their unresolved wikilink without creating anything. Folders and display groups are unavailable. Rename/delete/replacement of a captured real target blocks owned insertion with a truthful notice. Arbitrary clipboard text/HTML, missing destination files and already handled events remain native.

**Fallback contract:** when rich owned clipboard support is unavailable, real files copy a full physical vault-path wikilink (including .md and a section anchor when applicable) and show an explicit fallback notice. No destination-relative behavior is claimed outside supported Obsidian editor-paste or after receipt authority retires. Unit coverage checks this branch, clipboard denial, unrelated text, stale identities and late completion/teardown. The actual Windows host supports rich clipboard; physical mobile fallback remains unverified.

Final native evidence: copy once per target, then paste into notes in two folders under wiki/Markdown x shortest/relative/vault-absolute preferences: **60 cases**, covering duplicate basenames, spaces/Unicode/punctuation, an attachment and a note. Exact inserted bytes match the native generator, saved resolvedLinks identify the actual target, and normal undo works. Heading, ordinary clipboard, embedded editor and popout paste/undo also pass. Native Copy invocation proves zero source reads/parses/requests/builds/navigation in the action itself.

The embedded lane first establishes ordinary paste/undo readiness, then restores and reuses the exact earlier K-Plex clipboard payload. Earlier immediate first-paste attempts after mounting/focus failed and remain in private reports. The attempted OS-level check could not run because Computer Use app approval timed out. Final success is native Electron evidence under the explicit readiness gate, **not** physical keyboard, first-frame paste, Android/iOS or OS-level input acceptance.

### #254 - bulk visibility

Both existing visibility sections expose localized Enable all / Disable all buttons. A shared finite boolean patch covers the eight common flags; Settings additionally owns showNeighborCount, while Views and lenses additionally owns renderSiblings. The existing ownership of these settings is unchanged.

One operation rebases on the current settings through the serialized disk writer, persists once, publishes changed booleans only after success and issues one render-only notification. No-op actions are disabled. Unrelated/unknown fields and concurrent queued edits are preserved. It deliberately avoids the source-capable presentation-refresh path. Native Settings adoption into a popout is supported by reading the actual button document at activation, with a direct adoption/retirement regression.

Mixed/on/off/repeated/failure/concurrent persistence cases and two mounted React controls pass. Final native evidence covers both actual surfaces, two accepted operations/two saves, unchanged lenses/exclusions/centers, zero K-Plex source preparation/parsing/semantic refresh/rebuild and actual plugin-reload persistence. Cache-only scope checks continued and were recorded separately. One Obsidian native editor cachedRead occurred during the wider UI workflow; its app.js origin and unchanged K-Plex acquisition counters are retained. No universal zero-host-I/O claim is made.

### Additional enhancement - separate After saving preferences

Creation retains the persisted `newNodeAfterSaving` key; existing-note and web-link operations use the new validated `linkAfterSaving` key. On upgrade, the former shared choice seeds both, including the legacy editing-toggle fallback. Explicit separate selections, unknown keys and graph-import isolation survive reload. Both use the existing serialized settings writer; no separate store or scheduler was introduced.

The real composer retains one local choice per operation. Selecting an existing note or entering a web link restores the linking choice; clearing it restores the creation choice. Create another after a link returns to the creation choice. Folder-child creation, placeholder materialization, explicit invocation overrides and non-persisted unavailable-destination fallbacks retain their existing behavior. No new user-facing strings were needed.

The production-method regression failed before implementation (linking returned the creation preference), then passed. Actual React coverage verifies switching, web links, Link/Create another and reopening both forms. The exact final build also passed the native completion lane: creation `editor-maximized` and linking `another` were independently stored, switched and reopened after a real plugin unload/load, with an unknown-key sentinel preserved. This lane changes dialog preferences but does not submit a new native note/relationship; existing completion execution regressions cover the save routes. Production was untouched.

## Source review and boundaries

Reviewed against AGENTS.md, CODING_STANDARDS.md, CONTRIBUTING.md, docs/ARCHITECTURE.md and docs/AGENT_WORKFLOW.md. Shared action targets/guards, native exact identities, owning documents, cleanup, catalog keys, TSDoc, finite settings ownership and durable-before-live failure semantics were reviewed explicitly; automated lint alone is not the review evidence.

No indexing algorithm, scheduler, compiler, ontology classifier, source-acquisition implementation, index cache/schema, existing persisted default, dependency, version or companion repository changed. The additional workflow setting defaults/migrates through the existing settings owner. C15-C26 remains paused. All eight catalogs contain the original batch's new/updated copy. The two new test files are included in the normal test inventory; additional preference regressions extend existing executed suites. No full indexing/performance aggregate was run: this is a focused native navigation/clipboard/presentation/workflow batch.

Changed production owners: src/main.ts; src/settings.ts; src/ui/{App,PlexGraph,PlexFilter}.tsx; src/ui/NewRelatedNoteModal.ts; src/adapters/obsidian/nodeLinkClipboard.ts; src/core/plex/contentVisibility.ts; src/ui/features/ContentVisibilityActions.tsx; styles.css and eight language catalogs. Tests extend the real production-method/browser owners; scripts/testing/obsidian/navigationCopyVisibility.mjs is the maintained native entry. The temporary docs/agent-handoffs/navigation-copy-visibility-255-107-254.md is deleted as required. README, the creation feature authoring guide and CONTRIBUTING describe independent preferences and focused validation.

## Actual validation

Node **22.22.2**, installed repository dependencies and Obsidian types; Windows, native Obsidian **1.14.5**. Native target: existing kplex-test-small, 98 Markdown notes before and after. Production and companion repositories were untouched.

| Command | Result |
| --- | --- |
| node --test --test-concurrency=1 tests/linked-document-follow.test.mjs tests/action-host-integration.test.mjs tests/action-surface-ui.test.mjs tests/section-anchors.test.mjs tests/node-link-copy.test.mjs tests/content-visibility.test.mjs tests/canvas-view-settings.test.mjs tests/localization.test.mjs | **249 passed**, 0 failed |
| npm run check:architecture | **9 passed**, 0 violations; numeric-control audit passed |
| tsc -p tsconfig.core.json | Passed |
| npm run lint:obsidian | Passed, 0 errors/warnings |
| npm run build | Passed; real TypeScript/production bundle |
| git diff --check | Passed |

The 249-test batch above predates the completion enhancement. The architecture (9 passed/zero violations), portable type check, lint, real production build and whitespace check were rerun successfully after that enhancement. Its additional actual results are:

| Enhancement check | Result |
| --- | --- |
| creation-navigation + related-note-composer, full files | **91 passed**, 0 failed |
| CONTRIBUTING's focused completion command (including new linking/migration patterns) across six files | **47 passed**, 0 failed; includes production React browser interaction |
| Full excalibrain-migration suite | **74 passed**, 0 failed; non-default independent values, unknown keys, reload and foreign-import isolation |
| Localization suite | **25 passed**, 0 failed |
| Final-build native completion lane | Passed; cleanup passed; receipt below |

These commands overlap; their counts are not additive. The focused command initially exposed a missing `captureSurfaceContinuation` dependency in the old folder-menu test fixture and missing input focus in the new browser fixture. Both fixtures were corrected without changing production guards or weakening assertions; the full focused command then passed.

Native entry: node scripts/testing/obsidian/navigationCopyVisibility.mjs, with KPLEX_BATCH_261_LANE=sections, copy, visibility or completion; run serially with explicit KPLEX_TEST_VAULT_NAME/PATH/CONFIG_DIR and a fresh KPLEX_HOST_REPORT_DIR. Use the existing shared host lock and exact-build staging. The transient wrappers used processTools, canonical target checks, actual unload/load waits, SHA-256 checks and exact configuration restoration; they have been removed. Small is currently staged with the final completion build. The new lane waited for the other native test process to release the shared lock; it did not interfere with that run.

| Three-issue native lane, before completion enhancement | Receipt |
| --- | --- |
| Sections | C:\Users\viczi\AppData\Local\Temp\kplex-261-sections-pVelWv\navigation-copy-visibility-261-sections.json |
| Full copy matrix + editor contexts | C:\Users\viczi\AppData\Local\Temp\kplex-261-copy-7Gc3VG\navigation-copy-visibility-261-copy.json |
| Visibility + plugin reload | C:\Users\viczi\AppData\Local\Temp\kplex-261-visibility-w7h0A7\navigation-copy-visibility-261-visibility.json |

All three reports say passed and cleanup passed and identify the same earlier main.js artifact: `0b2758f5bd1685c3058ad31a0bbe6daed3a746db9100d267967744ec743b023d`. They were not rerun for the isolated completion enhancement. Each lane restores settings/configuration/enablement, owned notes and folders, workspace/session intent, clipboard, wrappers and throttling independently. Inspectable DOM native menus and trusted Electron input were used; Windows native menu chrome and physical Android long-press are separate. Temporary background throttling was disabled only in the selected disposable window and restored; these are functional results, not performance/paint measurements.

Final-build completion receipt: `C:\Users\viczi\AppData\Local\Temp\kplex-261-completion-56aNv3\navigation-copy-visibility-261-completion.json` (**passed**, **cleanup passed**, Obsidian 1.14.5, Node 22.22.2). It identifies the final hashes below, including NewRelatedNoteModal.ts. The actual native dialogs use programmatic change/input events; physical keyboard/touch selection is not claimed. Both non-default values are checked on disk and after plugin reload. Fixture/configuration/workspace/session/window restoration passed; the shared lock was released.

Failed iterations are retained under private %TEMP%/kplex-261-* reports: missing graph focus/visibility, native Settings page/document targeting and adoption, asynchronous enablement writes, premature optional-refresh observation, the native-host-read oracle, immediate embedded paste readiness and the unavailable OS approval path. They were diagnosed and not relabeled passes. Source-work proofs distinguish cache-only checks and ordinary native host work from actual K-Plex acquisition. No accepted test bounds, goldens or indexing rules were weakened.

## Exact identity

Runtime artifacts:

- main.js: 389aa63ed22e73a38d1061b4a95bc481c871f9c033b65ce52aeefe4cfb1e3ed4
- styles.css: d89188385a224f257da98ca48b41ea1e0fe9dd14f67f45012a51b144fb492ab1
- manifest.json: 8c65b0d38a506f8fa9fc3311b81ea22bcda48e0209e9190483752c1f20834326

Change manifest (all changed/new/deleted files except this transient HANDOFF and removed temporary tools): C:\Users\viczi\AppData\Local\Temp\kplex-261-completion-56aNv3\change-identity.json
Canonical manifest SHA-256: **f87d729979b800fe8e0ea3bcc964cdb024ea925cd4e34255efd186ea93a34586**. This identifies the uncommitted change set, not a new commit.

Obsidian retains an older manifest version label in its in-memory plugin registry after a plugin-only reload. Installed manifest and runtime SHA-256, the live clipboard owner and the report hashes identify this candidate; the cached label was not treated as build identity.

The earlier three-issue cleanup probe found 98 Markdown notes, zero owned Kplex-261 files, no test controller, no retained clipboard view capture and Settings closed. The final completion receipt independently confirms its cleanup and exact settings/enablement bytes. Shared application lock released. No full application restart was used.

## Reviewer action and remaining platform gates

The maintainer has authorized integrating this reviewed candidate. No release or separate issue closure is included. Risk is concentrated in native event ordering and clipboard host support; the bulk operation is a finite presentation write and index/storage owners are unchanged.

1. **P1 - physical Android #255:** expand a note, long-press each heading and open it from the sidebar under Recent/Pinned; verify the exact note/heading, later deliberate navigation and an independent Plex. The original reported device behavior remains unverified.
2. **P1 - real clipboard/device input:** verify first paste after opening an embedded editor, copy once then switch destination folders, relative/wiki/Markdown preferences, ordinary copy/paste and normal undo on physical desktop/mobile input. Include a host without HTML clipboard support and confirm the documented full-path fallback. OS Computer Use approval was unavailable in this run.
3. **P2 - narrow/mobile bulk controls:** use keyboard/touch on both surfaces in mixed state; expect reachable localized buttons, one durable change, correct no-op disablement, retained filters and reload persistence. macOS, screen-reader and physical phone/tablet behavior were not validated here.
