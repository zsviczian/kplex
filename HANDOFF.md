# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.

---

# Return — SI4 direct-neighbor encounter-order missing contract

**Direction/state:** offline development agent → main validation agent, 2026-09-30.
**Unaccepted proof/test return, with validation and ledger insertion pending.** SI4b1/SI4b2/SI4c/SI5 remain open; C15–C26 remain paused. No order reader, certificate, public consumer, settings route, schema change or accepted-checkpoint claim is included.

**Repository authority:** the maintainer expressly authorized this return to be committed and pushed to `indexing-optimization-v2`, overriding the standing uncommitted-return default for this assignment only. No PR, merge or release is authorized or performed. Review the resulting commit independently; repository publication is not technical acceptance.

## Base and transport limitation

The GitHub branch was read before drafting and pointed to the requested exact base, `dd58feefb4a8bfe6ad54bb5f4b3e4ed86e397378`. Its root tree is `259f70e182950f5c5a76bde3883e875b26cbb94f`. Source reads were pinned to that commit. Native Git access failed with `Could not resolve host: github.com`; there was no existing local checkout. Therefore **a native `git fetch` / checkout fast-forward was not completed**. API reads established that no newer branch commit needed incorporation at the initial check; they are not represented as a successful CLI fetch.

The update is prepared against the original tree, with one parent at the reviewed base and a non-forced branch update. The remote head must still equal that base immediately before publication; unrelated branch changes must not be overwritten. The final response supplies the actual published SHA, rather than embedding a self-referential commit identity here.

## Finding and scope

The assignment's missing-contract alternative applies. Full-builder order is first insertion of an unordered evidence-pair bucket, including an opposite-direction hidden witness or a host declaration later removed while another declaration keeps the bucket alive. Within-pair configured-field ordering does not move pair keys. Canonical resolution, binding and direct-role filtering preserve that order, and `GraphIndex.sortNeighbours()` explicitly uses the original encounter index after equal primary/title comparisons.

Stored facts retain each owner's local target order, but not that owner's relative position in each complete resolved and unresolved host-link map. Structural source order and derivative-v3 Markdown ordinals describe different phases. Two static host maps can therefore have equal per-owner neutral payloads and Markdown ordinals but different full-index tied parent orders. A clean contributor cover, equal degrees and successful replay do not supply the missing acquisition coordinate.

The proof proposes only the smallest missing acquisition contract: authenticate original full host-map source positions/record identities under the same root and host observation, retain existing local sequences, and reconstruct the original structural → resolved → unresolved → Markdown phase schedule. It does not invent a native event-order guarantee or implement an unauthenticated ready prefix. Complete original positive/negative incidence, all selected-head/journal/host/source/policy/demand fences after the last await, finite admission and no settings-time inventory/reparse remain necessary for a later reader.

## Changed files

- `docs/SOURCE_DIRECT_NEIGHBOR_ORDER_PROOF.md`: full phase/evidence/binder/sorter trace, finite invariant, missing-contract argument, future admission/finality obligations and explicit limitations.
- `tests/source-direct-neighbor-order.test.mjs`: ten authored top-level production characterization cases, using fresh actual full GraphBuilder/GraphIndex instances and existing host fixtures, with no substitute sorter/classifier. Covers v2/v3 host-source permutations across eight tie modes, local target order, hidden/opposite first insertion, configured versus physical field order, mixed phases, image suppression, reciprocal/duplicate/suppressed evidence, folder structure and third-party URL-origin order.
- `package.json`: adds only this test file to `test:sources`; the existing aggregate `npm test` / `verify` chain includes that lane. Dependencies, engine range, lockfile and all existing test commands/assertions remain unchanged.
- `HANDOFF.md`: preserves the standing header and replaces the prior assignment with this return.

**Unfinished documentation requirement:** `Refactor plan.md` remains byte-for-byte unchanged. Its full historical blob was read, but this API-only return does not replace the approximately 403 KB ledger with a manually reconstructed copy. The unaccepted return entry is supplied verbatim in section 6 of the focused proof for insertion during review. This is a pending assignment detail, not a claim that the requested ledger update was completed.

## Actual checks and capabilities

Available: Node **v22.16.0**, npm **10.9.2**, Git CLI and global TypeScript, GitHub connector read/write access. Node is below the required **>=22.22.2 <23**. No complete repository checkout, installed project dependency tree, Obsidian CLI/runtime or configured disposable vault was available. A Chromium executable exists; that alone does not establish a usable test lane.

Passed local checks:

- `node --check tests/source-direct-neighbor-order.test.mjs` against the drafted file: syntax only, not test execution.
- JSON parsing and structural comparison of `package.json`: only the new source-suite argument differs. Reconstructing the original bytes gives Git blob SHA `d92b0494dfc1e1530b420c07b48aee92483aa233`, equal to the fetched base.
- `git diff --no-index --check` for the new proof/test/HANDOFF text and the package replacement: no whitespace errors. This is not a full-checkout `git diff --check`.

**Not run / pending:** the new behavioral suite; all source tests; architecture and restricted-core lanes; official Obsidian lint; production TypeScript/esbuild; real Chromium/IndexedDB; `npm test`; `npm run verify`; native and physical-device checks. No current test pass count or built artifact exists. The base's accepted 269/269 source and 145/145 browser results are prior evidence only and are not transferred to this return. Existing strict goldens, timer limits and browser policy were not changed.

## Equipped-agent review

Pull and inspect the exact reported commit. First verify the only changed paths listed above, the preserved handoff header, script-only package change, and no runtime/schema/certificate widening. Append the supplied unaccepted ledger entry before treating the documentation deliverable as complete.

On the required Node runtime with real lockfile dependencies, run:

```sh
node --version
npm ci
node --test tests/source-direct-neighbor-order.test.mjs
npm run test:sources
npm run check:architecture
npm run check:core
npm run lint:obsidian
npm run build
npm run test:sources:browser
npm run verify
git diff --check
```

Review the expected results against the production owners, especially hidden-first pair insertion, duplicate evidence and image suppression; these authored expectations have not been executed here. Fix any defects without weakening existing assertions. Static host doubles do not prove that Obsidian reports every map replacement/reordering before a final fence. No persisted derivative changed, so no new migration suite is introduced; the existing real-browser regressions still need execution.

The native selected scalar/alias MetadataCache completion and physical-revision trace remains its separate online prerequisite in an explicitly configured disposable vault. No scalar/absence reader is authorized by this return. Sibling/witness merge order, hot continuation, complete visible lists, changed-host S2b, public/settings routing, SI5 and C15–C26 remain outside scope. No maintainer manual workflow is requested for this proof/test-only return.
