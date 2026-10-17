# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.




---

# Native drag, tag/folder navigation and compact layout

Active main-agent assignment, authorized 2026-10-17. #174 is merged at
8f702d9c6dfcb70921a1bd5c15087af70e7f2156; local main fetched/fast-forwarded.
Implementation branch: 2026-10-17-navigation-and-native-drag, same base.
User authorizes unsupervised implementation, validated checkpoint commits/pushes;
no release or merge of the new feature branch is authorized.

Scope: native outbound link drags for eligible node kinds and cross-Plex drops;
#157 tag hierarchy and Find tag/folder/type-icon support; #175 combined-left
friends/challengers presentation per device/surface profile; compact reusable
folder suggester in creation/materialization including placeholder default aliases
and primary-modifier double-click folder selection. Preserve fast note creation.
No receipt/startup optimization, scheduler/schema or broad architecture work.
C14 remains accepted and structural refactoring paused.

Mixed-agent owners (all offline returns uncommitted, no native or Git operations):
- tag_find_navigation: indexed tag topology/search and Find; coordinate projection.
- folder_creation_ux: shared folder chooser and existing creation/materialization.
- simplified_layout: layout/profile/settings and narrow-screen overlap regression.
- root: native drag integration, independent review/localization/CSS/native tests,
  serial full verification, evidence/report, Git and draft PR management.
Root owns this handoff; agents return source findings/patch/tests via messages.
Shared main.ts/projection edits require coordination. Root owns all locale/CSS edits.

Required acceptance: focused reproductions then contract tests and actual Obsidian
Settings/drag/Find/composer interactions on kplex-test-small; all three explicit
vault identity/path/config variables and exact artifact hashes. Native/browser/
resource lanes run serially. No personal-vault access. Record fixture cleanup and
host/device limitations; desktop emulation does not establish physical mobile.
Prove presentation/search/drag/folder selection add no source acquisition, parse,
full build or snapshot rewrite; necessary actual note writes measured separately.
Full Node22.22.2 verify and exact-build native verification before final review.

Implementation returned and independently reviewed; all three offline slices are
frozen. Native link dragging and its shared same-view mutation path are integrated.
Existing-placeholder duplicate/relink behavior is retained; an alias override
never selects a different relationship mutation policy.

Current step: final portable verification followed by serial exact-build native
Find, folder creation/materialization, layout/drag and affected touch/gate checks.
Focused creation/relationship checks pass 97/97 after review. The active full run
passes architecture 7/7, core 130/130, Node 1003/1003, UI browser 131/131,
source-portable 334/334 and source IndexedDB/browser 598/598, plus real-types build,
Obsidian lint and exact-build native smoke/staging. These counts do not yet
constitute focused native feature acceptance. One earlier browser-startup timeout
is preserved; the unchanged isolated case and complete retry pass, with no
deadline or assertion relaxation. Native Find now passes eight guarded searches
and six navigations, with zero indexing/storage work in search intervals and
exact fixture/layout/config restoration. The intermediate-tag native failure is
fixed using the existing structural baseline and matching evidence; 118 focused
tag/host checks pass, including shared-tag removal/final deletion. Other native
lanes and final combined verification remain in progress. Confirmed folder,
modifier and layout-profile corrections are not yet a completed native checkpoint.

Durable feature evidence/report owner:
docs/validation/navigation-and-native-drag-2026-10-18.md. Keep final build hashes,
actual source-work counters, fixture restoration and platform gaps there; do not
publish raw configuration or local evidence. No personal vault is accessed.
