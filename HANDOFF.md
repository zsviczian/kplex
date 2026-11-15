# Standing instructions ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in the issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.






---

# Active status: 0.4.4 Help material updated and deployment complete

The maintainer requested final 0.4.4 release material in the existing kplex-help repository, updated demonstrations and genuine screenshots, release-day daily notes with released on Friend and reciprocal earlier/later ontology, extension of the source help-authoring guide, and deployment of current main.js/styles.css. They explicitly requested final consumer copy without planned-release banners and supplied November 15, 2026 for 0.4.4. No commit, push, PR or merge was requested for this Help task. Both repositories remain on main with these new task changes uncommitted; no agents were spawned.

Help now includes the missing published 0.4.3 summary, final 0.4.4 material from merged PRs #297/#301/#302/#308, current hubs and living guides, and a real Markdown-template walkthrough with two plain Templates. All 20 release pages retain their reciprocal version sequence and link to actual daily notes. Historical dates were read from GitHub published_at; 0.4.4 uses the maintainer-supplied date. The 17 daily notes include the preserved October 9 Date-property example and grouped month hubs. released on is Friend; earlier/later is the Previous/Next pair. Daily note text avoids duplicate release links so the released-on example remains a single distinct physical occurrence. Only hierarchy, pinnedNodes (latest release) and markdownTemplateFolder changed in the saved plugin settings.

Seven native Windows Obsidian 1.15.1 captures were visually inspected and embedded: Markdown creation/template, Excalidraw tab, attachment visibility, release-day journal, pin editing, Daily Notes calendar and shared note-type style. Screenshots use actual Help content; creation/style/calendar dialogs were canceled without creating practice notes or saving drafts. Physical-mobile screenshots were not fabricated. Extended docs/help-authoring README and release template, added daily-note template and screenshot coverage catalog, and marked the older creation/navigation reference as historical.

Validation: all edited Markdown YAML, wiki/Markdown/image links, table columns, 20-page release sequence and 17-day reciprocal chain passed. Native full graph audit covered all 178 Markdown notes with no page over twelve semantic Children; the 0.4.3 released-on edge resolved to one physical source. Actual native preview rendering loaded image embeds in the release, template demonstration, journal and Quick Filter guides. Final native readback verified 0.4.4 is a Friend of 2026-11-15 and that day's earlier entry is 2026-11-09. Source and Help whitespace checks passed.

Latest source runtime was built with actual installed Obsidian types and build:local under pinned Node22.22.2. Initial sandboxed esbuild failed on directory access; the unchanged elevated build passed. main.js and styles.css were copied to Help and hash-verified. SHA256 main.js: 10f192444e4818e2e43adca640a7df2082aea1be97dbe2b1c4f7cb23b2c1927d; styles.css: a9a98390ae2607131fc192fb2d69b6053723cc0bb9f7373c7a6115ecfdfe1822. Only those named artifacts were authorized, so Help's manifest was preserved at 0.4.2 and no source release version was bumped. Release publication should deploy the proper release manifest/artifacts; do not mislabel this local build as the published 0.4.4 bundle.

Native work used the shared application-user-data lock and the canonical registered Help path only. There was no competing lock owner. It restored the original live workspace/recent-file tracker/window bounds/zoom, removed temporary reader/canvas/controller resources, and independently verified original appearance.json, workspace.json, community-plugins.json and preserved manifest bytes. data.json matches the intentional three-key-group demonstration update, with no leaked capture history or style drafts. Preexisting user modifications to appearance/workspace remain unchanged. Zsolt's Brain and other vault notes were not used.

Managed raw evidence: ...help-044-build-khWPj4 (build), ...help-044-native-D6tlDF (frozen setup, images, backups), final native audit managed native result containing rendered/singleSource, and ...help-044-content-audit-OzUaHH. The temporary capture driver is ignored .test-work/help044-native-session.mjs. Its finish succeeded and independent restored hashes matched. Earlier crop/focus/cache-reconciliation attempts were corrected and are not represented as successful captures. Do not run further native mutations merely to repeat green results. Final content is not yet committed or published.
