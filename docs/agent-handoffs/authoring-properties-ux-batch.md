# Authoring properties, UX improvements and bug validation

Status: implementation handoff only; no runtime fixes are included.
Prepared by Zsolt's Codex Agent on 2026-11-22; scope expanded by the maintainer to include validation and conditional fixes for #313 and #318.
Base: main at a87006e44db9f7ad736aef090b493393bae454b6, including merged #325.
Branch: 2026-11-22-authoring-properties-ux-batch.

The draft PR description is the implementation specification and acceptance checklist. Follow AGENTS.md, CONTRIBUTING.md, CODING_STANDARDS.md, UI_RULES.md and docs/agent-workflows/issue-resolution.md. Refresh the accepted baseline and issue discussions before implementation; preserve unrelated work and existing canonical owners.

## Approved scope

Seven bounded issue slices: #311 property names/icons, #312 canvas pinch sensitivity, #316 Markdown web-link input, #317 generic Add relationship field memory, #319 lowercase defaults, #321 YouTube thumbnails only, and #322 complete wikilink input.

Also implement the maintainer's larger add-node feature: Note type selection; configurable common creation properties including Alias; note-type properties in the same composer; independent node-detail visibility for common properties, with Alias hidden by default; and the requested order of Name, Note type, Folder, divider, common properties, note-type properties, Action, then the existing creation-kind tabs/template selection.

Keep filename Name distinct from a configurable metadata field called Name. Keep property identity, optional display label, creation-form visibility and node-detail visibility distinct. Reuse existing alias semantics when the configured field is Alias; a different property name must actually target that property, not merely relabel a hard-coded alias input. Preserve title/alias resolution independently of supplementary node-detail visibility.

## Validation-first bugs — included in this PR

This supersedes the earlier exclusion of #313 and #318. Validate both on the accepted baseline before relevant feature changes, then repeat on the final PR artifact. Reporter replies are useful but are not a prerequisite to starting the existing reproductions.

- **#318, first priority:** reproduce the A → B → C Add friend / Follow node workflow before and after Local graph ready. Assert the second dialog's source, captured action/file identity and actual A/B/C contents, not only the rendered graph. Exercise delayed readiness deterministically and retain exact-build native coverage of the command/navigation path. If confirmed, fix the smallest responsible action-context, navigation or indexing owner in this PR and add a regression that fails on the unfixed baseline. Never write to A when the second operation intends B; an unavailable exact target must be refused clearly rather than replaced by a previous center.
- **#313:** reproduce plain-prose `see [[ ]] here`, repeated empty links, an explicit self-link and an inline-code control. Compare native resolved-link counts with K-Plex's source-resolution/reconciliation results, preserving genuine self-link multiplicity. Validate recovery settlement, stable failure counters and two unchanged app restarts against a reusable cache; include the applicable settled non-default-ontology fixture. If confirmed, fix the canonical resolver/source-comparison/recovery owner and add failing-before/passing-after regression coverage. Do not hide the loop by dropping valid links, suppressing status, weakening comparisons or resetting caches.
- For each issue, record whether it reproduced, was already fixed, did not reproduce under specified conditions, or remains blocked by unavailable host/device evidence. If not reproduced, update the issue with exact tested commit/build, environment/settings, fixture and steps, commands/results, commit-pinned test references and relevant PR/validation references. A missing native/device check is not a negative reproduction. Do not close an issue solely because one test passed or the PR exists. Confirmed fixes also receive linked regression and validation evidence.

## Boundaries

- #309 link titles were addressed by #314, released in 0.4.5; video-ID graph deduplication remains separate. #310 is already completed.
- #315 needs clarification between retained preset categories and failed manual edits. #320 needs a minimal heading/embed example. Neither is an implementation commitment here.
- #321 is only the requested YouTube subset until the reporter clarifies local video attachments versus web URLs.
- Indexing/source-resolution changes are authorized only where required by a confirmed #313 or #318 failure. No speculative indexing rewrite, new parser/index framework, blanket cache reset, automatic vault-wide property renames or network work during indexing.
- Use the current shared composer, property/type writers, canonical target parsing/resolution, settings queue, display measurement and consent-aware image lifetime. Keep explicit target identity, reciprocal-write guards and partial-commit recovery.

## Acceptance and handoff

Implement in independently reviewable slices. Add focused regressions and run the required real-dependency checks and applicable exact-build native lanes. Cover settings compatibility, create versus link behavior, templates, cancellation/failure recovery, narrow/mobile/popout rendering, all canvas property measurements, and consent/offline thumbnail behavior. Establish no extra semantic preparation from presentation-only controls.

#313/#318 validation is mandatory scope, not an optional follow-up. Assess risk from the actual fix: changes to indexing, source acquisition, graph semantics, scheduling or persistence require the repository's full indexing/persistence acceptance gates, including real-dependency verification, exact-build native checks and unchanged restart/cache reuse evidence. Preserve failing results and record unavailable checks separately. Keep raw validation artifacts in the repository's managed ignored storage; retain concise results and durable test/commit references in the PR and issues.

Current evidence is source review, issue/release comparison and remote document read-back only. No build, runtime test or native validation was run for this planning change. Keep the PR draft; do not merge or close issues as fixed until implementation and acceptance exist.

This file is a temporary artifact required to open the handoff PR. Delete it before final implementation review; keep the lasting scope, decisions and actual results in the PR. Do not archive it or replace the root HANDOFF.md for this planning-only step.
