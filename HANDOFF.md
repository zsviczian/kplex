# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.




---

# PR #177 feedback: implementation complete; final-head verification pending

Branch `2026-10-17-navigation-and-native-drag`. Runtime/test/driver checkpoints
committed and pushed: a1974c096497c42a2da7fb6e7a11f70ea312fac3 (UI/creation/Properties)
and d86fea32cad34f92cbb14cfff9d9c8d6e882196d (Find/early structural availability).
This closeout changes documentation only. Keep PR177 draft, Closes#157/Refs#175;
no merge/release/personal-vault access. All agents completed/frozen; no further code.

The report `docs/validation/navigation-and-native-drag-2026-10-18.md` and Refactor
plan ledger hold durable scope, decisions, real checks/failures and limitations.
Phone new-tab policy was corrected during final review and red/green covered.
Only files/folders/tags already native-loaded supply early Find; selected tags use
bounded existing structural compilation, not zero work. Native source/body policy
and strict durable source fences remain unchanged; no receipt/scheduler/schema.

Completed component assertions on actual Node22.22.2: architecture7/core130,
lint, Node1029/UI131/source334/browser598, no skips/cancellations. Two below-normal
verify:obsidian attempts failed the unchanged35-minute aggregate portable deadline;
children completed passing and drained before another lane. Preserve failures:
...verify-1792303010693 and ...verify-1792305706470. Intermediate ...5267656 was
intentionally cancelled before the phone correction, with only owned headless
processes stopped. No Obsidian/Resolve process touched. Production build passes.

Exact staged final artifacts:
main.js f10694fe6eb79bdb1349ffc1edb98bbbae8db4ab9d04acd417eb0f9dad1e7050
styles.css b22bad683a71019b03f663bc4b48ad26e450b22e64a5aea4a2102ad475b2b056
manifest 19d9ecce5557733e0ff0f2e27155e635c30158c3cfa6fbca0f11c16e4dedfd2c

All six native lanes PASS on this exact build, serially in kplex-test-small:
find-1792307953436; folders-1792308104673 (9workflows+reload); layout-1792308155994
(5cases,6actualSettings,main/sidebar/popout); legacy-1792308179504 (15pass+1observed);
native-drag-1792308229416 (6cases); touch-1792308357609 (8gestures+phonepolicy,
reload,7geometries). Full paths use `%TEMP%/kplex-navigation-feedback-<name>/report`.
Folder guard initial failure included navigation/opening: corrected scope retains
zero assertions and reports two checked/repaired setup sources separately. Touch
controls preserve failed dispatcher-return assumption/helper-name error; real native
availability=false and zero allocated tabs pass. Runtime unchanged by these fixes.
Final sanity ...feedback-final-sanity-1792308417589.json passes107files/88Markdown,
no controllers/dialogs, desktop, captureFALSE, exact artifacts. Small configuration,
workspace and fixtures restore. Opening CLI capture FALSE; preserve that finally.

Verified private backup (do not publish/delete/overwrite):
`%LOCALAPPDATA%/KplexValidation/navigation-feedback-177-20261018-1792308483120`
208files/43,617,105bytes;524source ZIP files, all CRCs/per-entry hashes and copied
files reverified. Root manifest SHA256:
43205a56fd58dc859fa8a4d933d7cb7b46d611e30c63f855db2eab0cdf232975
Old403-file backup and all Temp originals remain. Source ZIP excludes HANDOFF.

LATEST USER: Resolve finished rendering. Finish docs commit+push, verify its diff
from d86fea3 is documentation only, then run private launcher with actual Node22:
`%TEMP%/kplex-navigation-feedback-run.mjs verify normal` on clean final head.
This uses standard priority only for owned validation, leaves applications alone,
and keeps all assertions/deadlines unchanged. Native/browser/heavy lanes serial.
Launcher's default remains below-normal for native runs; each gets fresh output.
The new full report/exit is authoritative: failed wrappers never count as passed.
After full success restore idle CLI captureFALSE, run ...feedback-sanity.mjs, preserve
new receipts in another unique private verified backup via existing preserver with
exact final head (runtime/test/build files identical to d86fea3). Never publish raw.

Update existing PR body from private ...feedback-pr-body.md (fill placeholders),
record exact final head/local full result/CI and private supplemental receipt. Keep
draft. CI d86fea3 run39107754294 was in progress; cancel only superseded OWN runs
once final-doc head queues. a1974c0 run39107733111 cancellation already requested.
Wait final-head CI green (typical31min); do not claim older-head CI applies.
Private preserver ...feedback-preserve.mjs is reusable, append-only and checks
source match/ZIP/all copied files. No Git code changes after verification.

Remaining limitations: actual reported freeze unconfirmed despite proven bounded
Properties retry hazard; inherited On-demand gate/filter guard refreshes requested
coverage (assertion intact); ordinary moving-placeholder unmodified doubleclick;
physical OS crosswindow dragging, macOS/minimumhost and physical mobile acceptance.
No native large-vault speed/CPU/heap gain is claimed. Render-era timings uncontrolled.
