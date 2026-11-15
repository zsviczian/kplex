# K-Plex Help authoring workflow

This is an **agent playbook for maintaining [K-Plex Help](https://github.com/zsviczian/kplex-help)**, an independent Obsidian vault and living, navigable demonstration of K-Plex. It is **not** material to add to the K-Plex plugin's end-user README or UI.

## Where the work belongs

- Product implementation, source truth, issues, PRs, released tags and technical documentation: [K-Plex](https://github.com/zsviczian/kplex).
- User-facing explanations, use cases, release archive, screenshots and visual showcase: [K-Plex Help](https://github.com/zsviczian/kplex-help).
- Check the live Help branch, working tree and open PRs before resuming. Do not assume a historical authoring branch or PR is still active. Preserve local appearance/workspace changes and unrelated edits.
- The help vault has independent `.obsidian` configuration, including plugin executables and `plugins/k-plex/data.json`. Documentation edits do **not** authorize changing binaries, settings, hotkeys or workspace state. The local maintainer updates the bundled `main.js` / release artifacts deliberately once the release is ready.

## Content architecture

Help Home → sections → feature guides and outcome-oriented use cases. A separate Release notes hub → each release → feature and use-case guides. Preserve ordinary Obsidian reading (folders, Markdown links) **and** graph navigation (frontmatter ontology). Do not create duplicate pages when an existing guide can be improved.

In the Help vault's current ontology, `Guide`/ `Parent` map to Parent; `Explains`/ `Child` to Child; `Related`/ `Friend` to Friend; `Watch out`/ `Challenger` to Challenger; `Previous` and `Next` are sequence roles. Check the current help `00 Start Here/How to use this help vault.md` and settings before changing field names. Prefer **release → Explains → guide/use case** and **use-case → Explains → relevant feature guides**; do not reverse relationships arbitrarily or invent a new ontology. The relation should make navigational sense when either note is centered.

### Links and Markdown tables

- **Use short Obsidian links.** Prefer `[[Connection details and evidence]]` over `[[03 Build and edit/Connection details and evidence]]`. Apply this to body links, YAML ontology lists, heading/block links and image embeds. Use `![[Screenshot - Pins.png]]` for a uniquely named asset. Retain a vault-relative path only when duplicate filenames require disambiguation; check the current file inventory before shortening a link.
- Preserve the resolved target, heading/block fragment, display label and embed sizing. Leave executable code, literal syntax examples, external URLs and serialized Excalidraw payloads intact. Do not shorten API file paths or filenames passed to commands: those are data, not navigational links.
- **Never use aliased wikilinks in Markdown tables**, including an escaped alias separator. A pipe in `[[target|label]]` can be parsed as another column. Use an unaliased short wikilink, such as `[[Quick Filter]]`, or preserve a descriptive label with a standard Markdown link, such as `[Inspect Connection details](<Connection details and evidence.md>)`. Use a disambiguating path only when necessary. Avoid pipes in table-cell labels and inline code too; code formatting does not protect table delimiters.
- Check every table's header, separator and body rows for equal column counts. Verify local Markdown links as well as wikilinks and embeds against real targets. Check both ordinary Obsidian reading and ontology navigation; changing link notation must not change the connected notes.

These rules apply to every template below and to later edits of existing Help pages. Keep authoring instructions here, outside the consumer vault.

### Content types

- **[Feature guide template](FEATURE_TEMPLATE.md):** one capability/workflow, reader-oriented steps, limitations, related features, screenshots where helpful.
- **[Use case template](USE_CASE_TEMPLATE.md):** a real problem and an achievable outcome, several easy ways to get there, `Note type: Use case`, enduring text, links to features. Avoid "next release" or version availability banners; when historical provenance matters, link to a versioned release page instead.
- **[Release template](RELEASE_TEMPLATE.md):** one page per *published* version, using the actual GitHub release text where practical; separate explicitly labeled *draft* for a proposed release. Describe what changed and outcomes. Link to corresponding living guides using `Explains`; avoid duplicating entire feature manuals.

## Agent editing loop

1. Identify the task and read K-Plex `AGENTS.md`, `CONTRIBUTING.md`, and this playbook. Review the relevant K-Plex implementation, merged PRs and **published releases**; distinguish released, merged-only and proposed changes. GitHub is authoritative for code and history.
2. Read the **current** Help branch and its own instructions if present, Help Home, Use cases, Release notes, ontology guide and related feature notes. Check for conflicting/duplicate pages. Use its own branch workflow and verify repository identity before edits.
3. Plan a small set of page changes; use the templates as starting points, not a replacement for existing content conventions. Favor audience value over lists of UI controls.
4. Write frontmatter properties as valid YAML and use short Obsidian wikilinks to real targets, retaining a path only for filename ambiguity. Follow the link and table rules above. `Note type: Use case` is the exact value for use-case pages; tags can supplement it but should not substitute for the property. Add `Explains` edges only to meaningful, existing targets.
5. For **screenshots**: the local agent can open a suitable build of K-Plex in Obsidian, capture genuine screenshots showing actual current UI, crop for clarity, store them under the Help vault's existing `Assets/` conventions, and embed with working Obsidian links. Do not fabricate UI, screenshot evidence, tests or version coverage; remove personal data and secrets. Record missing screenshot opportunities as TODOs, not fake image paths.
6. Validate both directions of each link and ontology edge; check titles, aliases, Note Type values, backlinks, image targets, displayed formatting, rendered Plex and version claims. Audit all edited Markdown tables for equal column counts and no aliased wikilinks. Keep screenshots and text in sync. Save on the authorized Help branch, read files back and inspect the diff.
7. In the relevant PR, briefly describe changed reader outcomes, sourced releases/PRs, screenshots captured, rendering tested and remaining gaps. **Do not merge** without authorization.

## Release cadence and boundaries

When a K-Plex release ships, update the Help vault's plugin assets only under a separately approved step; convert the version draft into a published-history page using the **actual** release and verify no features were cut. Historical release pages remain immutable in meaning: correct mistakes transparently and link to current help, not silently rewrite past shipped facts. Each release can point via `Explains` to feature pages and to the evergreen use cases it enables or improves.

### Release sequence navigation

- Use `Previous` for the immediately preceding release page and `Next` for the immediately following release page in version order. Use existing pages, including explicitly labeled drafts; do not invent missing versions or link to nonexistent future pages.
- Maintain both frontmatter declarations: the newer page's `Previous` points to the older page, and the older page's `Next` points to the newer page. When adding or inserting a release page, update its neighbors in the same edit. Omit `Previous` on the earliest page and `Next` on the latest page.
- Never classify chronological release-to-release links as `Related` or `Friend`, or leave the same pair under both a sequence field and a friend field. Keep `Related` for genuine companion references and source URLs; keep `Explains` for feature and use-case guides.
- For example, `Release 0.3.0` has `Previous: [[Release 0.2.4]]`, and `Release 0.2.4` has `Next: [[Release 0.3.0]]`. Store these as quoted wikilinks in YAML lists, as shown in the release template.

Before completing a release-note edit, check the entire release archive in version order: valid YAML, existing targets, correct reciprocal `Previous`/`Next` links, no chronological links under `Related`/`Friend`, and correct endpoints. Preserve historical body text when correcting navigation metadata.

### Release-day journal navigation

- Maintain real daily notes at the configured Daily Notes location and date format. The supplied Help vault uses root-level `YYYY-MM-DD.md` notes. Use GitHub's **published_at** date for historical releases, rather than commit, tag creation, documentation-edit or deployment dates. Several versions may share a day. The technical 0.2.1 republication is documented by Release 0.2.0 and shares its October 20 date.
- In each release page, write `released on:: [[YYYY-MM-DD]]`. Configure **released on** as a **Friend** field; it is an explicit wikilink relationship, not a scalar Date. Do not reclassify release-to-feature `Explains` edges or release-to-release `Previous`/`Next` edges.
- Daily notes form a reciprocal chain through `earlier:: [[previous-existing-day]]` and `later:: [[next-existing-day]]`. Configure **earlier/later** as the Previous/Next inverse pair. Link the nearest existing daily entries across gaps; do not manufacture notes for every intervening calendar day. Omit earlier on the first day and later on the last.
- Keep existing demonstration days in the chain, identifying them as examples rather than inventing a release event. The October 9 Date-property example demonstrates a different source from the explicit released-on link.
- Use the [daily-note template](DAILY_NOTE_TEMPLATE.md). Group the Release days hub by month so its actual semantic children remain within twelve; audit inferred body-link children as well as YAML declarations.
- Validate every release's date, reciprocal day-chain links, version-chain links, filename/date agreement, ontology assignment and calendar navigation. Do not infer a whole-vault negative from an incomplete runtime graph.

### Final material prepared before publication

When the maintainer explicitly requests publication-ready copy, write the consumer release page as final material without planned-release banners. Keep the publication checklist, source status and screenshot limitations **here or in the PR**, outside the Help vault. Use an authoritative published date or a maintainer-supplied release date; do not guess one. Recheck the actual GitHub release and its shipped scope before publication. Other drafts retain the normal explicit-draft convention.

An explicit deployment instruction authorizes the named artifacts only. Build current source with `build:local`, verify hashes after copying, and preserve the vault's settings and other plugin files. Do not silently bump a manifest to a future version or describe its displayed version as the executable's source identity. Coordinate screenshots through the shared native host lock; on a conflict, stop CLI activity and ask the maintainer to choose priority. Capture actual Help content, preserve preexisting configuration/workspace bytes, and leave the exact build installed when deployment was requested.

**Acceptance checklist:** accurate source/release status; one clear audience goal; all referenced files exist; correct YAML/ontology/Note type; complete reciprocal release and daily-note sequences; no stale availability promises in use cases; screenshots genuine and appropriately captioned; no unapproved `.obsidian` or binary changes; GitHub read-back and honest visual-test report. Maintain the [screenshot coverage catalog](SCREENSHOTS.md) for missing physical-device views.

## Reader-first review

Every article opens with a reader need and the outcome it helps achieve, before illustrations and version notices. Use [FEATURE_TEMPLATE.md](FEATURE_TEMPLATE.md), [HUB_TEMPLATE.md](HUB_TEMPLATE.md), [TROUBLESHOOTING_TEMPLATE.md](TROUBLESHOOTING_TEMPLATE.md), [REFERENCE_TEMPLATE.md](REFERENCE_TEMPLATE.md), [EXAMPLE_TEMPLATE.md](EXAMPLE_TEMPLATE.md) and the existing use-case/release templates. Apply them as editorial checks, not identical headings forced onto every page.

Count actual semantic children, including inverse Guide/Parent declarations: twelve is the maximum. Split larger hubs into meaningful topics and update the affected notes' parent assignments. Use Friend for useful companions, Challenger/Watch out for genuine limits, and Previous/Next for real reading sequences. Verify cross-links in Obsidian, not just with text searches.

Aim for a genuine, relevant screenshot on every feature guide. Reuse a screenshot where it illustrates the same control, with a caption naming what to notice; never use unrelated screenshots as coverage. Maintain a source-side screenshot coverage record for missing physical-device or unsafe-to-capture scenarios. Keep agent instructions, validation reports, implementation details and raw evidence outside the consumer vault.

Ordinary body links can become inferred Children. After grouping, inspect the actual Child role in the running Plex as well as frontmatter. Classify companion references as Friend/Related where appropriate; keep true subtopics as children. Release citations and implementation/source URLs are references, not child help topics. Preserve their original published prose and give them an explicit related role when needed.
