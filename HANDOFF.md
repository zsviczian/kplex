# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.

---

# Assignment — SI4 original host-owner order acquisition

**State/direction:** main validation agent → offline development agent. This is the next bounded SI4 input, not SI4b1/SI4b2/SI4c/SI5 acceptance. C15–C26 remain paused.

**Input identity:** `indexing-optimization-v2`; accepted source base `2770ff4941f5913cc874fa5e9b47fb74b93aca8d`. Work from the standard `repository.zip` produced by `npm run repo:export`. It has no `.git`; do not claim a local HEAD, fetch, push or commit. The ZIP includes this handoff. No unrelated dirty files should be assumed. Return only changed/new repository-relative files in a ZIP and overwrite this body with your findings, checks and online-review instructions. The maintainer has reverted to ZIP transfer; no Git collaboration is requested of the offline agent.

## Objective and owner

Capture and persist the **original outer-owner order of both whole host-link maps** during explicit contributor/catalog acquisition, bound to the same complete host observation as the source facts. This is the missing source input established by [the reviewed proof](docs/SOURCE_DIRECT_NEIGHBOR_ORDER_PROOF.md) and [validation](docs/validation/settings-independent-indexing-si4-direct-neighbor-order-review-2026-09-30.md). Build an additive, authenticated coordinate only; do not create an ordered-neighbor reader or widen any existing `ready` result.

Trace the current full `ObsidianHostLinkSourceCollector` traversal, source acquisition, contributor catalog/root codec and host-journal/finality owners before choosing the smallest seam. Resolved and unresolved maps are separate global phases and may have different owner permutations. Preserve actual JavaScript own-property enumeration, existing within-owner target order, source identity/incarnation and accepted source frames. Retain empty/absent-owner and filtered/stale-owner semantics explicitly enough that omission cannot become a false completeness proof. Do not infer rank from SourceId, path, structural `order`, v3 `markdownOrdinal`, selection order, count or revision.

A versioned additive derivative is acceptable if necessary; v2/v3 remain readable for their accepted capabilities. Do not rewrite source/body/graph/journal formats, touch settings/UI/search routes, add a query-time whole-map scan, duplicate relationship classification, or copy the full graph. Acquisition must be bounded/cooperative, with terminal validation of the complete order-sensitive host observation and fail-closed/no-partial-commit behavior. If a trustworthy capture or persistence contract cannot be implemented without asserting unproved native currentness, stop at a precise contract/test return rather than minting a false certificate.

## Acceptance evidence

- Production traversal and stored coordinate agree for resolved and unresolved outer-owner permutations, including numeric-looking keys, empty maps, duplicate/reciprocal and non-Markdown owners. Use the fresh full builder/collector as the oracle; `tests/source-direct-neighbor-order.test.mjs` supplies counterexamples. Preserve phase order and local record identities without introducing an alternate sorter.
- Versioned derivative decode/authentication rejects missing, duplicate, malformed, truncated, wrong-root or wrong-head coordinates. Aborted writes leave the prior accepted root readable; reopen and cold upgrade preserve v2/v3, source/body and existing relation/URL-title/degree capabilities. Use real IndexedDB browser tests if persistence changes; portable envelopes alone do not prove durability.
- Never interpret the new coordinate as a current ordered-list certificate. Explicitly state what the existing host journal/observation can and cannot attest after the last await. A native MetadataCache event-order/currentness guarantee is **not** established by a test double. Keep existing negative-support, policy, demand and hot-scope boundaries unchanged.
- Run Node >=22.22.2 with real dependencies where available: focused tests, `npm run test:sources`, `npm run test:sources:browser`, `npm run check:architecture`, `npm run check:core`, `npm run lint:obsidian`, `npm run build`, `npm run verify`. Record actual version, pass/fail and unavailable gates. Do not weaken existing assertions, timer bounds or golden fixtures. No native Obsidian claim is possible offline.

Update the focused architecture proof/design and append the return to `Refactor plan.md` without marking a checkpoint accepted. In this transient HANDOFF, list changed files, precise input ZIP/source identities, tests and limitations, and exact online verification. The main agent will review, run required real-environment checks and commit accepted work. Native selected scalar/alias completion and host-event order currentness remain separate online probes. Sibling witness order, hot-range continuation, complete visible lists, changed-host S2b, publication, settings routing, SI5 and C15–C26 are outside this assignment.
