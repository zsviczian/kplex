# Attachment rename and rendered-node lifetime

The maintainer reported a phantom attachment after using Obsidian's image rename menu inside
the central editor. One attachment followed editor collapse; another stayed behind. Restarting
Obsidian cleared it. The initial broken small-vault view was inspected before any reload.

The canonical graph had one matching attachment page and one child relation. The DOM had two
thoughts with the same attachment path, while the current React tree, alternate tree and memoized
scene each had one. The stale element survived unrelated layout/navigation. This locates the
persistent phantom in rendering rather than an extra physical file or current graph relation.

GraphIndex intentionally preserves page object identity during rename and changes its path.
An independently memoized scene can temporarily retain both the old materialized endpoint and
a new-name placeholder. Taking React keys from their current paths makes previously distinct
keys collide. React can then leave an element outside its current child tree. Rebuilding geometry
from the same stale neighborhood can create the same collision even with a simple path snapshot.

PlexGraph now captures an encoded path/occurrence key for each positioned node's scene lifetime.
Ordinary scenes retain one stable key per path; transient collisions receive distinct keys.
Expanded strips capture their original base-node key, including their mini-child/connector
namespace, instead of reading through a display clone's mutable parent path. This changes only
reconciliation identity: semantic paths, canonical page objects, actions, indexing, evidence,
settings, storage schemas and note contents retain their existing ownership.

The real React/Chromium regression extracts the production capture/projection/render functions
and actual ThoughtNode. It exercises memoized reuse and stale-scene geometry rebuild, count
hydration/display clones, placeholder handover, expanded strips, reordering, collapse, later
layouts, attachment removal and unmount. The predecessor key expression fails with an actual
orphan; provisional path-only capture fails the rebuilt-scene variant. The final focused case
passes with unique keys and no console warnings. Main independently reviews the source/test
return and runs the mandatory full repository gate on frozen inputs.

The controlled native baseline uses an owned note/image and a new-name placeholder, then the
public typed FileManager.renameFile API, collapse and re-expansion. It observes a transient
same-path pair but settles to one child even on the predecessor. It is not claimed as a native
persistent-failure reproduction; the original live capture and deterministic browser schedule
provide that evidence. Initial harness escaping/setup/capture failures are retained separately;
final baseline cleanup preserves exact settings/enablement and removes the owned fixture.

Final frozen-source `npm run verify` passes on Node22.22.2: architecture7/core69/Node292/UI18/
portable333/browser410, zero browser failures/skips/cancellations, scanner0errors with one existing
activeLeaf warning, and real installed-types production build. The mandatory20,015-owner cached
publication case passes in268.714s. Frozen278-input hash `86d39d498cde…` remains unchanged.
Exact main `c08c0cde9310…`, CSS `d9ca9609bbbd…` and manifest `e3bb9a35215a…` match the serial
small-vault deployment and native smoke on Obsidian1.14.4(installer1.14.0).

Native final controlled rename settles to one child/DOM thought; collapse moves it from318.895px
to112.895px, re-expansion returns it with no orphan. Transient duplicate path rows can still exist
before authoritative handover; the fix ensures reconciliation removes them. Native warning capture
is not claimed. The browser regression directly asserts zero React warnings. Test throttling was
temporarily disabled for this functional probe and restored; these are not performance timings.
The original small-vault graph now renders one screenshot child among11 thoughts, zero duplicate
thought paths. Only the disposable test vault receives this build; production is untouched.

Fixture, center, save wrapper, throttle and exact settings/enablement bytes are restored. An initial
console cleanup check failed: synchronous CLI eval restoration was replaced by the CLI's temporary
console capture. Final asynchronous debugger cleanup follows the captured test/CLI wrapper chain
back to the exact native console.error, verifies restoration and detaches its owned debugger.
Final audit finds zero test controllers/fixture files and no attached debugger. Failed harness
attempts remain recorded; their cleanup flags are not retroactively described as passes.

Recommended manual check before maintainer acceptance: use the actual editor image context menu Rename once,
then collapse/re-expand, expecting a single child that follows the editor. The automated native
probe uses the real public FileManager rename/cache/editor ordering but does not automate that
menu/dialog. No physical-device or startup/paint/latency claim is made. Detailed identities,
results and limitations are recorded in the [evidence](attachment-rename-render-lifetime-2026-10-07.json).
Maintainer subsequently confirms the issue is solved and authorizes a commit. No push or PR is
requested. No C15–C26 work or source-schema change is assigned in this bug-fix round.
