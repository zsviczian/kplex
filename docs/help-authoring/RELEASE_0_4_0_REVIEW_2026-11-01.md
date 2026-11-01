# K-Plex Help 0.4.0 authoring review — 2026-11-01

## Scope and source identity

The maintainer requested the Help vault update since 0.3.1 and explicitly instructed that 0.4.0 be written as already released, including PR #249. This overrides the authoring template's default draft-status instructions for this deliverable. No GitHub release or tag was created, and publication was not claimed as an action performed by the authoring agent. No release date was invented.

- K-Plex source: `main@2aaf6d36a3704f68ff79dcdd6d4af48f9f03520c`; reviewed `git log 0.3.1..HEAD` and relevant implementation/English labels.
- Help starting point: `main@f45266121fbcab6ccb94002340e0817bcf34fede`. GitHub reported no open Help PRs; the old October help branch was not reused.
- PR #249 source: `codex/kplex-creation-navigation@9ff6db6c97a82c10e80d306bf47d473124dc7b77`, including its `creation-navigation-features.md` reference. Included file-menu destinations, captions, optional trackpad mode and template selection/persistence. The maintainer will release the companion simultaneously; the consumer notes omit its version requirement as requested.
- Other reviewed PRs: #237, #238, #239, #240, #241, #243, #244, #245 and #248. Used current `docs/PUBLIC_API.md`, `docs/CLI.md`, export proposals, production API contracts, canvas-export admission and native English labels. The release text omits refactor/test/build details from these sources.

## Reader outcomes

Added the 0.4.0 release page and reciprocal 0.3.1 → 0.4.0 sequence. Updated release/recent-feature navigation and living guides for export, ontology descriptions, file reveal/open destinations, view menus, editors/Properties, mobile Rename and template creation. Added a linked-outline writing use case, an automation hub, eight independent JavaScript examples, CLI guidance and a standalone root `skill.md` for Codex/Claude and similar local tools.

The exact API spelling is `window.kplexApi.v1`. Documentation distinguishes graph coverage from canvas projection, canonical IDs from occurrences, accepted actions from observed scenes, native all-view Markdown export from the API's Mind Map-only operation, and native PNG output from the unavailable API image exporter. The skill preserves task authorization, explicit vault/canvas selection and the reviewed configuration-import protocol.

The Help README now accurately reports its unchanged bundled manifest as 0.3.1 and the guides as covering 0.4.0. No `.obsidian` configuration, plugin binaries, existing images or drawing payloads were modified. No commit, push, PR write or merge was performed.

## Local validation

Environment: Windows; Node 22.22.3. This was documentation work, with no runtime/build changes.

- Parsed all 150 consumer Markdown files' YAML using the installed `js-yaml` package. Checked new/changed wikilinks, relative Markdown links, code-fence balance and duplicate section headings across 24 edited/new Markdown files.
- Checked the complete archive of 16 release pages: correct adjacent reciprocal Previous/Next, endpoints, valid targets, and no chronological release links under Friend/Related. Historical body text was preserved; 0.3.1 only gained Next metadata.
- Static relationship review combined declared Child/Explains, inverse Parent/Guide and otherwise-unassigned body wikilinks. All edited pages remain at or below twelve semantic children. This is a source check, not a rendered Plex assertion.
- Executed all eight API example blocks against current production `PublicApi`, `PublicCanvasRegistry`, actual GraphQL.js and the actual Markdown formatter, with controlled graph/canvas ports and real Help workshop property verification: 16 successful result envelopes. Checked the CLI Node example's syntax. No native files or settings were changed by this harness. This proves example/API shape compatibility, not native Obsidian acceptance.
- `git diff --check` passed in the Help repository. Read back edited files and inspected the diff. Native help rendering and screenshots remain unavailable as described below.
- The bundled skill-creator Python validator could not start because PyYAML is absent. Installing it into a temporary directory failed because network sockets are unavailable. Equivalent frontmatter, name/description bounds, supported keys, code-fence and unfinished-placeholder checks used the installed YAML parser; no project dependency was added.

Temporary validation scripts/output live outside both repositories. No validation harness was added to the consumer vault.

## Screenshot and native-rendering coverage

No new screenshots were captured. The new writing use case reuses the genuine existing `Assets/Screenshot - Mind Map workshop.png`, explicitly captioned as a map illustration rather than an export-dialog image. Existing assets were preserved. A source validation screenshot of a native editor was inspected but not added because it is a diagnostic fixture rather than a useful consumer demonstration.

The read-only CLI probe used the repository's `obsidianCliExecutable()` and `spawnNativeSync()` for **only** `vault=kplex-test-small vault info=path`. It returned: “The CLI is unable to find Obsidian. Please make sure Obsidian is running and try again.” No fallback vault, app restart, deployment or workspace/configuration write was attempted.

Pending screenshot opportunities on an accepted 0.4.0 build:

1. Export submenu, PNG scope/transparency preview and Markdown ontology-label preview.
2. Ontology editor with independent field/paired-field descriptions.
3. Obsidian file-menu K-Plex destinations and resulting named independent tabs.
4. Drawing-template dropdown in related-note and folder-child creation, including remembered selection and Blank drawing.
5. Trackpad setting and an ordinary foreground canvas; a still image cannot establish gesture behavior.

Before visual sign-off, read the changed pages in Obsidian and inspect the actual Child roles for Build and edit, Use cases, Release notes and the new Automation hub. Prioritize main-window/popout link navigation, code/table readability and template dropdown screenshots. Device-specific input remains a separate check: desktop screenshots do not establish tablet/phone gestures, keyboard-visible Rename, mobile sharing or physical touch. Existing source PR acceptance records are provenance for behavior descriptions, not a claim that this authoring pass reran those tests.
