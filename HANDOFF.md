# Standing instructions ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in the issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.




---


# Facets preset node presentation (#272) — implementation for review

User authorized merging #259, switching to main/fetching, then implementing #272. #259 is merged as d6ffedc79300fac6e4aa0c131faefe4116abbcff. Local main was fetched/fast-forwarded and its tree verified identical to the previously validated replacement. No production deployment or release occurred.

Current branch: 2026-11-03-facets-preset-node-presentation. Original spec-only PR head: 22c79896d8963ff2342a7274b5778267556cacbd. Accepted main was merged normally at 56a1c10982e9e10ad935e9f4c61c89c0afe5c2b3. All implementation, tests and documentation remain uncommitted. PR #272 remains draft and unmerged; do not publish, merge, release or close issues without further authorization. C15–C26 remain paused.

Implemented: optional independent default-off preset booleans focusInCategory and centerAnchoredLinks; single measured attention/editor inside its proven category with central diagnostic fallback; contained-area layout without phantom central reservation; shared rounded-body center-line intersections and collinear scroll clipping; scene-local gate hiding; existing canonical ports/evidence/actions unchanged; guarded native toggles and portable admission/export; all eight language catalogs. Gate dragging is explicitly unavailable when hidden; the native node menu opens the existing relationship composer. Other views retain default routing.

Validation: Node 22.22.2 installed-type production build passed. Focused tests passed (50), then the strengthened real overflow/filter browser case passed. Native Windows Obsidian 1.14.5 expanded lane passed against main.js SHA-256 5a9d63134c478a44252b7f2df5c89cb2f0870711b80eae3314af33c3095433cc. All 20 layout/toggle combinations passed with zero reads/parses/semantic acquisitions/rebuilds during the closed toggle interval. Dirty attention/neighbor editors, resize/scroll clip, native menu composer, Sidecar, same-preset live sharing, independent main/popout presets, migration and assigned/unassigned navigation passed. Final native receipt: kplex-272-native-rCeeuR. Every owned fixture/resource, settings/enablement byte snapshot, layout and window bound was restored. Candidate artifacts remain installed only in disposable Small. Earlier harness/cleanup failures are documented separately, never counted as passes.

Full npm run verify PASSED on Node 22.22.2 with installed Obsidian typings 1.13.0: release metadata, architecture (9), portable core (133), lint, main (1,990), browser (470), portable sources (359), IndexedDB/source lifecycle (894), and production build. The initial full run exposed four legacy extracted-node fixtures missing the new helper import; their original assertions passed after importing the real helper, and the complete aggregate rerun passed. The 20,015-owner case passed with one canonical pass/publication, 8,187,369 checks and 152.3 seconds measured cached publication, preserving the earlier fixture performance. Final translated artifact was then redeployed/hash-verified and the entire native lane passed again. Final source/artifact hashes and receipts are durable in the validation JSON. No runtime source changed after this verification.

Durable implementation/evidence: docs/proposals/FACETS_PRESET_NODE_PRESENTATION.md; docs/validation/facets-node-presentation-272-2026-11-03.md and .json. End-user/API docs: docs/FACETS.md, docs/FACETS_VIEW.md, docs/CANVAS_VIEW_API.md. New test files are in the executed npm inventory. Native lane: KPLEX_WUXING_NATIVE_LANE=node-presentation with the existing verify:obsidian:wuxing command, explicit Small identity variables, fresh report directory, exact staged build and shared host lock. CLI enablement must settle before capturing enablement-file baselines. Native geometry uses the existing legacy rect(...) clip, not obsolete clip-path assertions.

Residual acceptance: macOS native dirty editor/popout lifecycle and physical phone/tablet interactions remain unrun. The validation report gives the two prioritized manual procedures. Production Zsolt's Brain was untouched; this feature does not require production access. Do not restart Obsidian or test against production. Final source/architecture, artifact, whitespace and documentation review completed. Keep the implementation uncommitted for maintainer review.

Publication authorization: on 2026-11-03 the maintainer approved committing, pushing and merging #272, followed by switching/fetching main and implementing draft PR #270. Earlier uncommitted/draft restrictions describe the prior review return and are superseded for #272 only. The #272 runtime source and exact verified artifacts are unchanged.
