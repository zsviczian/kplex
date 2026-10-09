# Default Date property relationships — issue #81

## Corrected scope after maintainer clarification

The maintainer clarified that the default role applies to Date fields **without configured
ontology**. Configured Date fields always use their assigned ontology, including Hidden.
The initial inferred/ontology switch missed this fallback-role requirement and is superseded.
Its verification below is historical evidence, not acceptance of the corrected implementation.

**Settings → K-Plex → Plex behavior → Relationship behavior → Default Date role**
provides **Parent**, **Friend**, **Child**, **Challenger**, **Previous** and **Next**.
Initial default is Parent, following the requested meeting → daily note direction. A field
configured as Friend remains Friend even when default is Parent; an unconfigured Date field
uses Parent. Switching default to Child changes only unconfigured Date fields.

The correction retains Date source provenance and scalar values; it does not turn dates into
editable wiki-link lists or change Daily Notes naming/date recognition. It reuses the canonical
selector/compiler/precedence and cached semantic invalidation. Explicit configured fields win
for that field; conflicts between separate explicit fields on the same pair retain ordinary
K-Plex reconciliation. Prior cache signatures must be invalidated for the new interpretation,
without clearing or reparsing neutral source facts.

Implementation and independent review passed. The corrected legacy indexing fixture passed
24 production settings scenarios and all parser/indexing/cache/scene assertions. Offline109
focused tests plus80 consumer tests, installed actual/core types, touched lint and architecture
83roots/164files/0violations passed. Date-only defined relationships now use the Date explanation
rather than claiming configured ontology; higher hidden/suppression/conflict reasons remain.
The archived oracle remains unchanged, with a shared finite overlay for exactly four Date pairs
and explicit expected sibling/gate/scene effects. Current semantic-only signatures correctly
adapt first-publication presentation without claiming a historical-presentation diagnostic.

Full verification started on313 frozen production/test/build inputs:
`738d71b1f8e99adf227c525bc19921b9b55e98f087aa974677dcd29789bcfb62`.
Full attempt1 stopped before build/staging: architecture7/core69/general432/UI20 and
production indexing/settings scenarios passed; portable-source332/333 passed. One direct
neighbor phase fixture expected the old inferred Child Date gate. Its test-only correction
now covers Parent default and selected Child while preserving physical phase order and
DEFINED Date evidence;99 affected source checks passed.
No production/timing change or native configuration mutation occurred. The failed report is
/private/tmp/kplex-date-default-full-verify-1/report.json. Full gate restarted on313 frozen inputs
`e00a2496e4ae0141d8e5510f932073d5322d93255ec569cd209cb2b62f0fbf49`.
The corrected full build and exact native acceptance passed; final receipts follow.
The native driver now checks all six fallback roles and inverse views, configured Parent across
all defaults, every configured Date role, Hidden, generic inference independence, scalar Date
mutation refusal and persistence after plugin reload. Readiness and named/timed CLI failures
are retained; the earlier indexing/reload timeouts remain unresolved observations.

## Corrected implementation acceptance

The full gate passed at **12:36:49 UTC** on the 313 frozen inputs above, using Node 22.22.2:
architecture 7, core 69, general 432, UI 20, portable-source 333 and browser 410 checks,
plus the real production indexing/settings fixtures, official Obsidian lint, installed TypeScript
and production build. Native loading/render smoke passed in Obsidian 1.14.4.
Report: `/private/tmp/kplex-date-default-full-verify-2/report.json`.

The same exact staged build passed **24 native scenarios in each indexing mode**:

- Six unconfigured default roles and their inverse endpoint views.
- Configured Parent across all six defaults; each configured Date role with a different default.
- Hidden, independence from generic inference flags, ordinary explicit Friend preservation,
  scalar Date direct-unlink refusal, registered six-choice declarative setting and plugin reload.

On-demand completed at 12:37:11 UTC, with 3 reads, 0 parses, 341 acquisitions and 0 full builds
in the policy measurement. These are actual call counts, not a claim that on-demand scopes
never acquire facts. Eager completed at 12:37:38 UTC, with **0 reads, parses, acquisitions
and full builds** in the warmed policy measurement. Reload persisted the unconfigured Parent
role and inverse Child in both modes. All native CLI disable/enable calls completed in
15–93 ms; no captured JavaScript errors. Driver SHA256:
`a3f51970ae21f206fe2e05a70f52170446dba5b2ee1d10f527f3371177bf900a`.
Reports: `/private/tmp/kplex-date-default-native-1/report.json` and
`/private/tmp/kplex-date-default-native-eager-1/report.json`, each retaining its driver source.

Built and installed artifact SHA256 values match:

| Artifact | SHA256 |
| --- | --- |
| main.js | `85358c635afe393c71225b6b0f544526bfc38fd31ec7c783a4834f3d2860d591` |
| styles.css | `05c59fe68c56784fb3e727056b7e27aee65f7f595d7145e4710b75f660dacc55` |
| manifest.json | `19799fff9ae459130d707901e7c0d98b3e14a8567881a393f07d457c2fa8ec1c` |

The pre-stage backup captured the latest preferences after both live write queues drained.
Both native runs removed their owned fixtures, observers, semantic demands and controllers.
The eager run restored on-demand mode. The original workspace layout was restored through
Obsidian's public API; 73 Markdown files, the open Settings window, desktop mode and original
1440×875 bounds/minimum were preserved. Final audit found zero owned files, controllers,
action dialogs/sessions/guards, settings rows/groups, recorders or fullscreen overlays.

An initial audit incorrectly assumed `activeDocument` must be the main workspace document;
the original open native Settings window was active. Read-only inspection established the
Settings title/owning window. The audit now accepts that exact native Settings document and
retains the failed main-focus assumption receipt. No focus/window mutation was used to force
the assertion. Audit: `/private/tmp/kplex-date-default-final-audit.json`.

All four original configuration paths were restored byte for byte after owned work and queues
stopped: data.json (17,147 bytes), community-plugins.json (46), hotkeys.json (2), and absent
types.json. Independent delayed readback matched all four; no reload followed restoration.
Restoration receipts: `/private/tmp/kplex-date-default-original-restoration.json` and
`/private/tmp/kplex-date-default-restoration-readback.json`.

The old indexing/startup and CLI timeout observations remain unresolved historical evidence.
Successful corrected runs do not establish their cause or a production fix. No indexing or
scheduler change is included. Validation covers desktop host semantics and declarative
registration; it does not claim physical touch, popout, another OS, dropdown clicks/paint or
whole-application restart coverage. Maintainer confirmed the corrected behavior and authorized publication for release 0.1.1.

Prioritized reporter checks: unconfigured meeting Date → daily note Parent (and inverse Child);
then configure that Date field as Friend and verify it remains Friend with default Child.

## Historical interim implementation and verification (superseded)

Implementation branch: `date-property-relations`, based on main
`8858259907303d323451a6818cc5f60c81aa2e49`.
[Issue #81](https://github.com/zsviczian/kplex/issues/81) asks that a scalar Date property
configured as Parent produce meeting → daily note Parent and daily note → meeting Child,
even when the daily note body links back to the meeting.

## Behavior and compatibility

**Settings → K-Plex → Plex behavior → Relationship behavior → Date property relationships**
provides **Normal link inference** (the unchanged default) and **Follow field ontology**.
Ontology mode uses the configured role, including Friend and Hidden. Unconfigured fields
continue to use normal inference; Daily Notes format/folder and host date recognition are unchanged.

The canonical reference selector supplies assignments to the full/patch compiler. Configured
scalar dates retain their raw value, exact configured field label and Date provenance.
They use the canonical explicit frontmatter/hidden precedence. Ordinary reference identities and grammar stay unchanged.
Cached source facts are reinterpreted through the existing semantic settings invalidation owner.
Signature format v3 records the policy; recognized v2 and unversioned history mean inferred.
Neutral source, graph and database schemas are unchanged. No cache clear, extra parser or scan
was introduced. Unknown settings keys and the local policy survive legacy graph imports.

## Verification

Offline focused checks:101 passed (62 affected contracts/replay/localization,29 architecture/default
compiler guards,10 patch/metadata checks), actual installed TypeScript/Obsidian declarations,
core types, touched official lint and architecture scanner passed. Root independently reviewed
production/contract diffs, including normalized date labels versus producer-owned ordinary
reference identities and declaration ordering/multiplicity.

The final correction passed106 affected checks, installed actual/core types, touched lint and
architecture83roots/164files/0violations. Root independently reviewed the correction and the
actual-consumer filter regression. Final full verification passed at09:43:06UTC on312 frozen inputs:
`af6a187b1073f7879857bf7c0ad20a93c03638f837e80048377d99d5896e6581`.
The first full run stopped before build: a presentation test's finite transpile inventory omitted
the new real settings.ts dependency. A one-line inventory correction passed80 affected checks;
root independently reviewed it and restarted the full gate without weakening assertions.
A second run was stopped before staging after root review proved that classifying scalar dates
as ordinary frontmatter links exposed a direct relink writer that assumes wiki-link values.
The correction retains `date-property` evidence and lets DEFINED dates participate in canonical
explicit frontmatter precedence. It preserves Date filters and makes the existing direct relink/unlink
authorizers decline scalar dates. A new explanation catalog key uses explicit English fallback
so older translations do not describe configured dates as inferred.

The full gate passed architecture7/core69/general429/UI20/portable-source333/Chromium410
checks, production indexing fixtures, official lint, actual Obsidian types and production build.
Exact native smoke rendered the application without captured JavaScript errors. Installed artifacts
matched the build: main20f883b6992c8ce92f3157647cab4998fdc6e8265aa485f58ec95cbd9b7a2189,
CSS05c59fe68c56784fb3e727056b7e27aee65f7f595d7145e4710b75f660dacc55,
manifest19799fff9ae459130d707901e7c0d98b3e14a8567881a393f07d457c2fa8ec1c.
The equipped host used Node22.22.2 and Obsidian1.14.4 (installer1.14.0).

Native on-demand acceptance passed nine scenarios at09:56:56UTC: registered declarative
setting, six policy/configuration transitions, scalar-Date refusal by the actual direct wiki-link
unlink owner, and persisted Parent/Child roles after plugin reload. Ordinary working-on Friend
remained unchanged. Date evidence retained its scalar raw value and date-property provenance.
Policy measurement recorded3Vault read calls/0parses/79source acquisitions/0full builds;
on-demand requested scope preparation is not a zero-acquisition claim.

Prepared eager checks subsequently passed all six policy transitions and the unlink guard,
with0reads/0parses/0acquisitions/0full-build delta. Startup was explicitly ready76/76, initial
index complete, no active build/rebuild/timer or dirty flag, before measurement. The following
reload sequence hit the independent30-second Obsidian CLI process deadline, so the complete
eager driver and eager reload persistence remain pending. Cleanup succeeded with73original
notes, no owned observers/demands/controller, original mode/layout/Settings-open state and
configuration bytes restored; no captured JavaScript errors. No production indexing or scheduling
change was made to bypass the deadline.

Failed harness attempts remain evidence rather than passes: on-demand attempt1 incorrectly
required disabled global source inventory and needed independent empty-folder cleanup;
attempt2 incorrectly expected Hidden to suppress both endpoints; attempt3 used broader reload
readiness while repeatedly refreshing local scopes. Corrections preserve canonical directional
Hidden and await the requested fixture scopes. Eager attempt1 observed a changing full-build
counter despite zero source calls; its cause was not established. Eager attempt2 timed out90s
waiting for coordinator idle before Date assertions; it did not capture which flag remained
pending. Eager attempt3 reached ready76/76 and passed measured policy changes, then hit the
CLI deadline during reload. These observations do not establish a connection to the earlier
"4 of73 files indexed" symptom; retain both for later indexing investigation.

Raw evidence for this session remains under /private/tmp/kplex-date-policy-full-verify-3 and
/private/tmp/kplex-date-policy-native-{1,2,3,4,5,eager-1,eager-2,eager-3}. The durable conclusions,
artifact identities, failed-attempt limits and restoration receipts are recorded here and in the
refactor tracker. Native tests own disposable notes, finite semantic demands and temporary read
observers; they restore configuration independently of assertions.

The final on-demand driver passed the same nine scenarios at10:11:18UTC, with driver SHA
3af40a988a877dea43e36546b82918f9d7101ec25165481ff2833821e4c62b77. Its measured
work was3reads/0parses/74acquisitions/0full builds. Added readiness snapshots and named CLI
errors improve failure evidence without changing production code or the acceptance assertions.

Independent final native audit at10:12:22UTC found73Markdown notes, no owned fixture paths,
controllers, dialogs, action sessions/guards, settings rows/groups/recorder or display overlays.
The main document/window stayed desktop, Settings open,1440×875 at(0,25), minimum200×150;
installed artifact hashes still matched the verified build. Both settings write queues drained.
The exact pre-staging data.json (17,104bytes; SHA917529459ca3d7725bff5d521222b9ffbe90c23407c1961b4645349c2ef36d34),
community-plugins.json and hotkeys.json were restored after cleanup; no subsequent reload is
performed. Independent delayed readback at10:13:14UTC verified all three files remained byte
identical to their pre-staging backup. Each native driver also restores types.json without
changing its property registry.

A bounded read-only lifecycle review found no harness await spanning reload commands:
native task installation returns before asynchronous work, and polls return detached JSON.
Production unload cancels work synchronously and does not await a final snapshot flush.
The failed eager report's raw process error did not name disable, enable or readiness eval;
therefore the stalled command and underlying cause are unconfirmed. Future driver failures
include the command name. Host reload latency/post-enable startup is a hypothesis, not an
established defect or a reason to change production indexing.

## Coverage limits

This feature changes semantic policy and adds a native declarative dropdown. The native driver
inspects its registration rather than clicking it; graph assertions use actual neighborhood
classification rather than screenshots or paint timings. Plugin reload is distinct from application
restart. No physical mobile, alternate desktop OS or popout interaction acceptance is claimed.

Reporter confirmation for [issue #2](https://github.com/zsviczian/kplex/issues/2) remains pending;
[PR #87](https://github.com/zsviczian/kplex/pull/87) was merged using a reference without closing it.
Its CI retained the unchanged strict URL-heavy50ms post-parse guard failure at68.6ms; the prior
local full gate passed. This independent timing failure does not establish date-policy behavior.

## Prioritized manual confirmation

1. In the reporter's daily-note/meeting fixture, select **Follow field ontology** with Date
   configured as Parent. Meeting should show the daily note as Parent, and the daily note
   should show Meeting as Child despite its reciprocal body link. Working-on remains Friend.
2. Return to **Normal link inference** and expect the previous inference behavior. Complete
   eager-mode reload acceptance is pending the separately recorded native CLI timeout.
