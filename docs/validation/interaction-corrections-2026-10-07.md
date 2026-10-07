# Style field guidance, navigation zoom and created-file linking

The prior verified node-style feature was committed on main at `8f0d668` as requested. These three
follow-up fixes are separate uncommitted changes; no push, PR or C15–C26 work is authorized.

The Add node style editor changes a nonempty matching value to one leading hashtag when choosing
Tag prefix, and removes leading hashes when choosing Property value. Existing styles retain their
fixed family and imported spelling. Each field has an associated visible label and a short visible
explanation exposed through aria-describedby, using Obsidian theme classes. Label prefix means
text placed before the displayed node title. No HTML title duplicates the accessible description.

The scene-recenter layout effect previously set scale1 on navigation when autofit was disabled. It
now retains the current scale while recentering. Enabled autofit, editor restoration and metadata-only
layout preservation follow their existing paths. The real effect regression exercises each branch.

Native baseline reproduced creation failure for Markdown and Excalidraw: files existed and metadata
was present, but exact pair preparation cancelled before writing a relationship. During preparation,
the target cache identity changed; native source-event observation could change too, while physical
identity/mtime/size, origin cache, policy, source and graph publication stayed stable. The cancellation
guards were correct: FileManager completion preceded its final MetadataCache observation.

Created-node display/alias helpers now reuse the existing lifecycle-owned metadata write observer.
Each write waits for an actual changed-event cache agreeing with current body, selected affected
properties and exact physical revision before the next write/pair capture. Blank Markdown without
configured presentation fields observes a no-op; non-Markdown drawings retain physical binding.
Rename/delete/unload reject and remove listeners/timers; delays do not grant authority. The saved
metadata pending notice is truthful. GraphIndex, source replay, exact relationship write fences and
canonical saved publication are unchanged. Shared folder-child/ghost consumers are covered by
actual production callback ordering regressions. No schema/index/ontology/default change.

The user's literal addRelated.createFailed display was not reproduced in the current exact host: its
translator resolves the catalog message. No speculative fallback modification was made; the actual
linking race was reproduced and corrected. Both modal extension copies remain synchronized.

85 focused tests pass on Node22.22.2, including actual convergence observer/control events, creation
callbacks, cancellation/cleanup, folder-child/ghost consumers, camera effect, style controls and
localization. Scanner has0errors/one unchanged activeLeaf warning; real provisional build passes.
Exact provisional main `629d4406…` passes native direct creation/link and actual dialog type-button
creation for both file kinds, canonical frontmatter evidence and no error notice. Actual zoom
buttons retain1.3225 through forward/back navigation. Actual style form hashtag/description and
prior save/priority/inheritance checks pass; exact settings/enablement bytes and all owned
fixtures/controllers/dialogs/wrappers are restored. Production vault untouched.

Failed attempts are retained in [evidence](interaction-corrections-2026-10-07.json): an initial
driver quoting error, directory cleanup corrected through the public force parameter, and one30s
CLI transport timeout during Excalidraw polling. Same-artifact subsequent native success does not
turn that timeout into a pass. Restricted final verify then failed all18 Chromium launch checks;
unchanged frozen source reran successfully with permitted browser execution. No test bound/oracle changed.

Main independently reviewed all changes against AGENTS/CONTRIBUTING/architecture, including
existing-owner/component reuse, narrow host dependencies, opaque identity/source fences, localized
copy and owning-document fields, inherited settings preservation and meaningful TSDoc. Offline
focused return completed but exhausted session capacity before replacing HANDOFF; main owns the
final reviewed diff and acceptance. Final278-input hash
`daa4ae2ea8f341a05995d8c413029ac0b8d046f5b90635ec829d0ed4dd0e2ec3` passed complete
`npm run verify` on Node22.22.2: architecture7/core69/Node305/UI18/portable333/browser410, zero
browser failures/skips/cancellations, scanner0errors/one unchanged activeLeaf warning, actual
TypeScript and production build. Mandatory20,015-owner publication passed275.600s. No runtime/
test/build inputs changed after freeze; documentation-only closeout rechecks the same identity.

Exact final main
`629d440604288cd6fdb22d7187c1e99895512d01ddc4fe8bf3c1c5f0b93ac3ae`
matches the provisional functional build. Final source-matched native smoke initially hit a30s
CLI timeout after staging; that failed run remains recorded. Actual final dialog creation/camera
checks passed, and repeat unchanged-artifact smoke after explicit window focus passed registered
command/rendered K-Plex/no captured JavaScript errors on Obsidian1.14.4(installer1.14.0).
No timeout bound or product code was changed in response to the transport failure.

Final real-form tests create and link Markdown and Excalidraw children on the first selected type
button action, with canonical frontmatter evidence and no new error notices. Manual zoom1.15
remains through forward/back navigation. Final native style input switches add/remove hashtag;
all field descriptions are linked, visible for their applicable mode and fit the526px form without
horizontal overflow; prior imported storage/priority checks pass. Native blank Markdown with
empty display-name configuration also creates/links successfully under exact pair authority.

Independent final audit confirms original live settings, rendered center and exact saved settings/
enablement bytes, no fixtures/styles/controllers/dialogs/pair wrappers, zero pending metadata-write
observers and the verified installed artifact. Final build remains deployed only in kplex-test-small.
No production-vault notes/settings touched. New changes remain uncommitted on main after8f0d668;
no push/PR requested. No additional manual check is required for these scoped desktop fixes.
Physical-mobile touch and paint/performance are not measured by this desktop functional scope.
