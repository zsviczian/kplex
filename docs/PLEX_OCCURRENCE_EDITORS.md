# Occurrence-based editor hosting prerequisite

Status: required M0 for Mind Map after the verified #215 extraction and #218 settings/selector contract. Wu Xing is independent and may implement and validate its complete view using the existing attention-following native editor. M0 must extend that host compatibly, without requiring Compass or non-Classic attention-following definitions to adopt its new API simultaneously. This is an implementation assignment, not a supported runtime capability. Zsolt's Codex Agent, 2026-10-24, following the maintainer's corrected steer.

## Required behavior and current limit

An eligible displayed occurrence must be expandable into its own native document editor without rerooting the map. Layout root, attention/navigation target, selected occurrence, expanded editor bindings and keyboard focus owner are independent. Changing attention cannot retarget a live editor. Branch expansion and editor expansion have separate state and actions.

The first implementation may host **one live editor per Plex**. Its occurrence-keyed boundary must accommodate several bindings later, but simultaneous editors are outside this task. A second expansion request must return an explicit limit result rather than silently replacing a live editor or losing edits.

The current #215 runtime does **not** satisfy arbitrary-node editing. It hosts one attention-following editor, including when a non-Classic definition supplies its off-centre geometry. The existing probe uses different root and attention nodes, but its native editor still edits attention. It is not the required R/A/B proof.

## Why this is a separate native-host checkpoint

The verified extraction retains these concrete compatibility seams:

- `PlexProjection.editor` is a single occurrence anchor. `prepareViewScene()` requires its canonical node to equal attention when an expanded size is supplied, and exempts that anchor from filtering/grouping.
- `PlexGraph` derives eligibility and `centralEditorPage` from `persistentNeighborhood.center`, holds one editor size/maximize/overlay reference, and keys the mounted editor by document path.
- Opening or resizing that editor participates in the shared centre/automatic-fit policy. Attention changes participate in camera placement and retire attention-scoped transient state in `PlexViewSession`.
- `CentralNodeEditor` already accepts an explicit host-side page and owns the existing `mountEmbeddedMarkdownLeaf()` controller. Its file-change callback currently navigates the graph. The adapter owns native focus, link routing, saves, representation changes, window ownership and teardown; mobile/sidepanel activation has deliberate compatibility behavior.

Changing only the projection guard would allow geometry for B while opening A, and would leave camera, lifetime and focus ownership coupled. Do not remove the equality guard until validated occurrence/document bindings replace it. Do not add a plural DTO and describe the feature as implemented while the real native host still follows attention.

## Bounded implementation

### 1. Add binding state and shared actions

Introduce an occurrence-keyed editor-binding collection owned by the existing native Plex session. Keep it separate from view root/branch state, attention, graph selection and focus state. The initial collection enforces a capacity of one.

Each live binding identifies a stable binding incarnation, occurrence ID and intended canonical document. The host captures and revalidates actual native file identity; definitions receive plain identifiers, not a `TFile`, plugin, controller or WorkspaceLeaf. Serializable state contains only bounded intent/preferences; native identity is reacquired and checked after restart. Native editor buffers stay with the existing editor machinery.

Shared expand/collapse/resize actions accept the exact occurrence and document intent, use the existing ActionManager/lifetime fences, and report admission or capacity failures explicitly. Definitions may request those actions; they may not create leaves or editors. Preserve existing Classic command IDs and callbacks through a compatibility adapter.

### 2. Validate and resolve the exact document

For every binding, require a unique admitted occurrence whose canonical node matches the intended document. Reject synthetic groups, absent/filtered-out admission, unsupported targets and stale native file identity. Never substitute attention or another occurrence with the same canonical node.

Use the existing host-side eligibility and canonical lookup owners. The initial non-Classic proof uses genuine Markdown files. Preserve Classic's existing Markdown, attachment/drawing and URL-host behavior through its compatibility policy; do not claim arbitrary-node support for unvalidated target kinds.

Move Classic's attention-following selection and legacy global editor-mode/dimension interpretation into Classic compatibility policy. Other views retain bindings across attention changes instead of inheriting that policy.

### 3. Feed occurrence dimensions through shared layout

Supply each expanded occurrence's dimensions in the existing measurement collection before calling layout. Its normal and expanded sizes belong to that occurrence, not one scene-wide editor mode. Two occurrences of B remain independently collapsed/expanded.

Reuse the current native editor implementation/controller under a stable binding/occurrence host identity. Ordinary reflow, resize, camera movement and attention changes must update geometry without reopening the file or remounting the native editor. Host placement must use actual displayed occurrence coordinates, including area scrolling/clipping, rather than assuming a centre outside the scroll areas.

Opening/resizing may reflow nearby nodes. It must retain the map root, branch IDs and camera intent, without an automatic whole-map fit. Keep Classic's present framing behavior behind Classic policy. Rooted view state and root-relative camera/expansion state must not expire merely because attention changes; retain only bounded existing demand leases where necessary, with no new scanner or index scheduler.

### 4. Keep focus and document synchronization explicit

Background open, measurement and resize must not call graph activation, redirect Sidecar or steal focus. Record the actual graph/editor focus owner separately from attention and selected occurrence. Explicit user activation uses shared navigation policy and may change attention while retaining the rooted view and the editor's document.

Preserve the adapter's existing native activation, mobile and popout workarounds. Separate background admission from explicit activation where required; do not delete an existing workaround or make every open implicitly active. Route in-editor links through an explicit shared navigation/rebind policy, never an incidental retarget caused by attention.

### 5. Retire bindings safely

Collapse must flush/close through the existing native editor lifecycle and retire pending work exactly once. A filter may pin a live editor occurrence; an action that would remove it must explicitly collapse/flush it or refuse the removal. It cannot silently retarget or discard the editor. Branch collapse is distinct from editor collapse.

A compatible view transition may retain a binding only if the replacement admits that exact occurrence/document contract. Otherwise block the transition until explicit editor collapse, or perform an explicitly tested close/flush transaction. Teardown, rename, deletion and window migration must preserve existing native save/identity fences and must not resurrect a deleted document.

## Required proof before claiming support

Use the actual shared renderer and native host with disposable fixtures. A pure layout or mocked editor is insufficient.

1. Render root R, attention A and an editor bound to occurrence B and B's canonical Markdown file. Open B through a shared action; R and A remain unchanged and Sidecar does not redirect during background open/measurement.
2. Change attention to C. Verify the same R and branch state, B binding, canonical file and native editor instance remain. Graph selection and actual focus ownership are observed independently.
3. Make B genuinely dirty and capture its caret/selection. Reflow and resize B; verify identical native editor instance, unsaved value, caret and native focus, with no implicit whole-map fit or reroot.
4. Display B1 and B2 for the same canonical document. Expanding B1 leaves B2 collapsed. A second-live-editor request hits the explicit capacity-one limit; do not claim multiple simultaneous editors.
5. Exercise explicit collapse, filtering, branch removal, compatible/incompatible view switching, popout/main migration and teardown. Verify saved content, no accidental retarget, no duplicate save/resource ownership, correct cancellation and restored fixture resources.

Retain the existing Classic geometry golden and editor/action/Sidecar tests. Run focused contracts/session/browser tests, real build/types/scanner, applicable exact-build native checks and full verification/CI. Record actual desktop, popout and emulation coverage; physical Windows/phone/tablet acceptance remains separate and must not be inferred.

## Exit and exclusions

Publish a validated shared hosting commit and updated capability matrix before the Mind Map/Ideaverse jobs consume arbitrary-node editing. Until the native proof passes, label it **unsupported / prerequisite pending** in the matrix and handoff.

This task does not implement Mind Map, Ideaverse, a multi-editor workspace, external view loading, new graph/index/storage machinery or a production deployment. It does not resume C15–C26.
