# K-Plex Help authoring workflow

This is an **agent playbook for maintaining [K-Plex Help](https://github.com/zsviczian/kplex-help)**, an independent Obsidian vault and living, navigable demonstration of K-Plex. It is **not** material to add to the K-Plex plugin's end-user README or UI.

## Where the work belongs

- Product implementation, source truth, issues, PRs, released tags and technical documentation: [K-Plex](https://github.com/zsviczian/kplex).
- User-facing explanations, use cases, release archive, screenshots and visual showcase: [K-Plex Help](https://github.com/zsviczian/kplex-help).
- As of October 19, 2026, the in-progress Help branch is [`2026-10-19-help-use-cases`](https://github.com/zsviczian/kplex-help/tree/2026-10-19-help-use-cases), under [Help PR #2](https://github.com/zsviczian/kplex-help/pull/2). **Check the live branch/PR before resuming; never assume it stays open.**
- The help vault has independent `.obsidian` configuration, including plugin executables and `plugins/k-plex/data.json`. Documentation edits do **not** authorize changing binaries, settings, hotkeys or workspace state. The local maintainer updates the bundled `main.js` / release artifacts deliberately once the release is ready.

## Content architecture

Help Home → sections → feature guides and outcome-oriented use cases. A separate Release notes hub → each release → feature and use-case guides. Preserve ordinary Obsidian reading (folders, Markdown links) **and** graph navigation (frontmatter ontology). Do not create duplicate pages when an existing guide can be improved.

In the Help vault's current ontology, `Guide`/ `Parent` map to Parent; `Explains`/ `Child` to Child; `Related`/ `Friend` to Friend; `Watch out`/ `Challenger` to Challenger; `Previous` and `Next` are sequence roles. Check the current help `00 Start Here/How to use this help vault.md` and settings before changing field names. Prefer **release → Explains → guide/use case** and **use-case → Explains → relevant feature guides**; do not reverse relationships arbitrarily or invent a new ontology. The relation should make navigational sense when either note is centered.

### Content types

- **[Feature guide template](FEATURE_TEMPLATE.md):** one capability/workflow, reader-oriented steps, limitations, related features, screenshots where helpful.
- **[Use case template](USE_CASE_TEMPLATE.md):** a real problem and an achievable outcome, several easy ways to get there, `Note type: Use case`, enduring text, links to features. Avoid "next release" or version availability banners; when historical provenance matters, link to a versioned release page instead.
- **[Release template](RELEASE_TEMPLATE.md):** one page per *published* version, using the actual GitHub release text where practical; separate explicitly labeled *draft* for a proposed release. Describe what changed and outcomes. Link to corresponding living guides using `Explains`; avoid duplicating entire feature manuals.

## Agent editing loop

1. Identify the task and read K-Plex `AGENTS.md`, `CONTRIBUTING.md`, and this playbook. Review the relevant K-Plex implementation, merged PRs and **published releases**; distinguish released, merged-only and proposed changes. GitHub is authoritative for code and history.
2. Read the **current** Help branch and its own instructions if present, Help Home, Use cases, Release notes, ontology guide and related feature notes. Check for conflicting/duplicate pages. Use its own branch workflow and verify repository identity before edits.
3. Plan a small set of page changes; use the templates as starting points, not a replacement for existing content conventions. Favor audience value over lists of UI controls.
4. Write frontmatter properties as valid YAML and use Obsidian wikilinks to real paths. `Note type: Use case` is the exact value for use-case pages; tags can supplement it but should not substitute for the property. Add `Explains` edges only to meaningful, existing targets.
5. For **screenshots**: the local agent can open a suitable build of K-Plex in Obsidian, capture genuine screenshots showing actual current UI, crop for clarity, store them under the Help vault's existing `Assets/` conventions, and embed with working Obsidian links. Do not fabricate UI, screenshot evidence, tests or version coverage; remove personal data and secrets. Record missing screenshot opportunities as TODOs, not fake image paths.
6. Validate both directions of each link and ontology edge; check titles, aliases, Note Type values, backlinks, image paths, displayed formatting, rendered Plex and version claims. Keep screenshots and text in sync. Save on the authorized Help branch, read files back and inspect the diff.
7. In the relevant PR, briefly describe changed reader outcomes, sourced releases/PRs, screenshots captured, rendering tested and remaining gaps. **Do not merge** without authorization.

## Release cadence and boundaries

When a K-Plex release ships, update the Help vault's plugin assets only under a separately approved step; convert the version draft into a published-history page using the **actual** release and verify no features were cut. Historical release pages remain immutable in meaning: correct mistakes transparently and link to current help, not silently rewrite past shipped facts. Each release can point via `Explains` to feature pages and to the evergreen use cases it enables or improves.

**Acceptance checklist:** accurate source/release status; one clear audience goal; all referenced files exist; correct YAML/ontology/Note type; no stale availability promises in use cases; screenshots genuine and appropriately captioned; no unapproved `.obsidian` or binary changes; GitHub read-back and honest visual-test report.
