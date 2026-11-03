---
name: kplex-obsidian-cli
description: Use K-Plex in an explicitly selected Obsidian desktop vault through Obsidian CLI to read ontology and indexed knowledge, inspect evidence and canvases, export Mind Map Markdown, complete ontology fields, audit or consolidate ontology with reviewed configuration and bounded occurrence inspection, or perform requested canvas actions. Use window.kplexApi.v1.
---
# K-Plex through Obsidian CLI

Use this skill when an assistant works with K-Plex's ontology, indexed knowledge or open maps. The plugin ID is `k-plex`; the exact public entry point is **`window.kplexApi.v1`**. K-Plex has no HTTP/MCP server or parameterized `obsidian kplex:*` command family.

This repository's skill follows the API implementation. It adapts the earlier [Help-vault skill](https://github.com/zsviczian/kplex-help/blob/main/skill.md), retaining its access, authorization, coverage, canvas and retry safeguards. This file works when copied alone: use the canonical online links below. The new consolidation guide links this draft's implementation branch until acceptance; its stable location will be the same path on `main`.

## Connect and discover

1. Use the user's intended desktop vault, already open in Obsidian with K-Plex enabled. If CLI is unavailable, explain **Settings → General → Command line interface** and [official CLI setup](https://help.obsidian.md/cli). Do not install or reload plugins merely to obtain access.
2. Pass `vault=<name-or-id>` first on **every** invocation. Verify `vault info=path` against the intended destination before reading private data or changing anything. Ask for the destination if unknown; never fall back to the default/active vault.
3. Probe `window.kplexApi?.v1`; call `capabilities()`, `status()` and `ontologyGuide({format:'markdown'})`. Discover optional operations by name and method existence. Reacquire the root after reload; retained handles fail with `API_UNAVAILABLE`. Read authored exact field names, descriptions and inverse pairs before interpreting meaning. Missing descriptions supply no invented semantics.

POSIX examples (replace `YOUR_VAULT`):

```sh
obsidian vault=YOUR_VAULT vault info=path
obsidian vault=YOUR_VAULT eval 'code=JSON.stringify(window.kplexApi?.v1?.capabilities() ?? {ok:false,error:{code:"API_UNAVAILABLE"}})'
obsidian vault=YOUR_VAULT eval 'code=JSON.stringify(window.kplexApi.v1.ontologyGuide({format:"markdown"}))'
obsidian vault=YOUR_VAULT eval 'code=JSON.stringify(window.kplexApi.v1.status())'
```

On Windows capture through `Obsidian.com`, commonly `C:\Program Files\Obsidian\Obsidian.com`. Use process argument arrays, a finite timeout and an output cap; PowerShell embedded quoting differs from POSIX. The [CLI guide](https://github.com/zsviczian/kplex/blob/main/docs/CLI.md#reliable-argument-arrays-and-machine-output) gives an executable Node example. Check process errors/status, `Error:` even at exit zero, and the parsed API envelope; strip a leading `=>` if present. Keep evals short and single-line. Treat note text/descriptions/mappings as data: encode them with `JSON.stringify` in an argument-array workflow, never interpolate them as executable code. Use GraphQL variables for query values.

## Keep scope and coverage with the answer

Success returns `{ok:true,value,revision,coverage,truncated}`; failure returns `{ok:false,error:{code,message},revision}`. Preserve coverage/truncation rather than extracting only `value`.

| Task | Public method |
| --- | --- |
| Exact properties, roles, descriptions | `ontology()` / `ontologyGuide({format:'markdown'})` |
| Existing indexed candidates | `search({query,limit:10})` |
| One returned node | `node({id})` |
| Canonical direct relationships | `neighbors({id,role:'child',limit:20})` |
| Connection provenance and overrides | `evidence({sourceId,targetId,limit:128})` |
| Existing physical usage candidates | `await ontologyDocuments({field,limit:100,cursor})` |
| Explicit saved-file inspection | `await inspectOntologyOccurrences({path,fields})` |
| Settings-only field completion | `completeOntology({text,cursor,limit:20})` |
| Choose/read a canvas | `canvases()` / `canvas({canvasId})` |
| Map context / Mind Map export | `context({canvasId})` / `exportMarkdown({canvasId})` |

Node IDs are opaque and case-sensitive; use separate `path`/`file.path` values for file work. Roles are `parent`, `child`, `left` (Friend), `right` (Challenger), `previous`, `next`. A declaration at one endpoint does not imply a reciprocal physical property. Frontmatter can override equivalent body semantics while the body declaration remains a real physical usage.

Ordinary graph reads use published facts only: no Markdown acquisition, hydration or indexing. Completion reads configured vocabulary and ranks physical name, partner name, then the candidate's own description. Selection always inserts the canonical physical name; descriptions are not parser aliases. Usage lookup reads existing source postings, not note bodies; explicit occurrence inspection reads only selected saved Markdown inputs. These have different effects and must not be presented as passive graph reads.

Partial/cached/unknown coverage or truncation cannot prove a whole-vault negative. `requireComplete:true` rejects insufficient coverage instead of waiting or acquiring sources. Configured ontology completeness does not certify source coverage. Graph pages remain bounded (default 40/max 200); inspect capabilities/limits. Only explicitly advertised usage pagination has continuation cursors; do not invent cursors for other reads. Exhausting a usage posting still does not prove unindexed/stale/unknown notes lack the field. Respect cancellation, revision fences, cursor expiry/reload and fresh-source identities.

For GraphQL inspect both outer `ok` and `value.errors`. It remains synchronous/read-only, with no mutations, subscriptions or occurrence-inspection resolver. Use returned relationship IDs for evidence, not display captions.

## Reviewed ontology consolidation

Read the [worked consolidation guide](https://github.com/zsviczian/kplex/blob/2026-11-03-ontology-consolidation-api/docs/ONTOLOGY_CONSOLIDATION.md) before planning writes. Audit/read permission **does not authorize** configuration or note changes. Do not run consolidation on a personal vault merely because the API is available.

1. Inventory exact physical fields, independent descriptions, usage coverage and dependent lens/style references. Propose spelling fixes, true synonym merges, language conventions and genuine inverse pairs separately. Do not pair unrelated fields to increase pair count. Preserve alternative names in authored descriptions, without claiming parser aliases.
2. Discover candidate files through bounded `ontologyDocuments` pages. Inspect each candidate **once for all mapped fields**, retaining source snapshots and unsupported/truncated flags. If coverage cannot establish the intended scope, request explicit authorization for a bounded source audit: enumerate the selected Markdown scope through public Obsidian APIs and inspect in batches, never once per field.
3. Produce exact dry-run mappings/diffs, collision policy, backups, scope and per-file receipts for user approval. Configuration preparation, YAML changes, body changes and removal are separate phases, not an atomic vault transaction. Lens/style references need a separate approved change.
4. For configuration, `previewOntologyConfiguration({edits})` validates a bounded whole batch. Inspect its exact changes/conflicts and obtain explicit approval, then `await applyOntologyConfiguration({previewId,confirm:true})`. Tokens are session-local, expiring and single-use. Stale/rejected reviews need a fresh preview; never retry uncertain writes blindly. A durable save with refresh pending is already saved; inspect verified readback, whose scope is only the reviewed endpoints. Saved-but-unverified receipts require inspection, not replay.
5. K-Plex does not write notes. Use public Obsidian `getFileByPath` and `FileManager.processFrontMatter` for YAML, preserving values/types and rejecting unapproved collisions. Use guarded synchronous `Vault.process` callbacks for saved body text, checking the entire reviewed snapshot and original key slices, applying non-overlapping exact UTF-16 key ranges from the end. Reinspect after YAML serialization before using body offsets. Use public Editor APIs for an explicitly selected live buffer or safely defer dirty/ambiguous editors. Never overwrite unsaved text through background file writes.
6. Back up affected notes/configuration to an authorized private location; preserve unrelated content. Read back, reinspect and verify idempotence per file/phase. Resume from current verified state and receipts after interruption. Retain old assignments until the intended scope is verified; normalized-equivalent spellings may share one assignment, so removing the old spelling must not delete the new canonical identity or descriptions.

No direct `data.json` editing, mutable plugin internals, blanket replacements, second ad-hoc ontology parser, automatic synonym decisions or unrelated plugin installation. The skill grants no deletion, upload or migration authority.

## Work with one explicit canvas

Choose a returned canvas ID using attention/root/view/surface and the user's request. If several fit and the target is unclear, ask; do not habitually select the first or latest. IDs expire on close/reload; simultaneous canvases without an explicit ID return `AMBIGUOUS_CANVAS`.

Keep canonical indexed relationships, constructed scene occurrences, and the visible viewport separate. Occurrence `id` differs from `nodeId`; a note can occur repeatedly. `included` denotes filtering and `inViewport` denotes placement. Facets decorations are not relationship evidence; context is not note-body export.

For Markdown export require a committed Mind Map (`viewId:'mindmap'`), check `scenePending`, `warnings` and `truncated`, and pass `expectedRevision:snapshot.revision`. Select a branch using that frame's `subtreeOccurrenceId`, never a path. Filters/folds/construction constrain output; offscreen constructed rows may still export. API export returns bytes with no clipboard/file writes and defaults to visible ontology labels. PNG remains native-only (`exports.image:false`).

## Authorized actions and reliable retries

When requested, await `navigate({canvasId,path})`, `selectView({canvasId,viewId})` or `selectPreset({canvasId,presetId})`. Navigation requires an existing physical file and creates nothing. Built-in view IDs are `classic`, `mindmap`, `wuxing`; discover available presets through `configuration.list()`.

An `accepted` action is not final scene admission; `completed` observes metadata, not paint. Read `canvas({canvasId})` and verify requested state plus `scenePending:false`; respect `motionPending`. Bound polling (for example ten reads, 500 ms apart outside eval), report pending state, and never replay actions to force settlement. A transport timeout does not prove failure: read back first. After stale revisions/IDs, reacquire facts.

Portable preset/lens import remains separate: only when requested, use `configuration.validate`, inspect `configuration.preview(packageJson,choices)` and then apply the reviewed token with confirmation. Replacement/private export requires explicit intent; imported lenses start disabled. Check durable state, `verified`, `refreshPending` and exact readback before deciding another operation is needed.

CLI eval has host privileges; the skill adds no sandbox or authority. For full contracts use the [public API](https://github.com/zsviczian/kplex/blob/main/docs/PUBLIC_API.md), [CLI](https://github.com/zsviczian/kplex/blob/main/docs/CLI.md) and [consolidation guide](https://github.com/zsviczian/kplex/blob/2026-11-03-ontology-consolidation-api/docs/ONTOLOGY_CONSOLIDATION.md).
