# Reviewed ontology consolidation

This workflow supports agents helping with hundreds of ontology fields. It separates a proposed spelling/synonym/language change from a genuine semantic change, an inverse pair from a coincidental name similarity, and configuration changes from physical note edits. It does **not** run a migration or authorize one. Start with an explicitly selected scope and obtain approval for exact mappings, collision policy, private backup destination and write phases.

The [root skill](https://github.com/zsviczian/kplex/blob/2026-11-03-ontology-consolidation-api/skill.md) retains connection, coverage, authorization and retry safeguards. Read the [public API contract](https://github.com/zsviczian/kplex/blob/2026-11-03-ontology-consolidation-api/docs/PUBLIC_API.md) and [CLI argument-array guide](https://github.com/zsviczian/kplex/blob/2026-11-03-ontology-consolidation-api/docs/CLI.md) for transport details. These draft links address this implementation branch; after acceptance the stable locations are the corresponding paths on `main`. The recipe below is executable JavaScript for a trusted local Obsidian script/CLI eval, with synthetic paths only. It is not a new plugin API or a second field parser.

## Inventory, mappings and authority

Verify `vault info=path` before reading private content. In eval use the existing public API, and discover all requested optional capabilities:

```js
const api = window.kplexApi?.v1;
const advertised = api?.capabilities();
if (!advertised?.ok) throw new Error('K-Plex API is unavailable');
for (const operation of ['ontologyDocuments', 'inspectOntologyOccurrences',
  'previewOntologyConfiguration', 'applyOntologyConfiguration']) {
  if (!advertised.value.operations.includes(operation) || typeof api[operation] !== 'function') {
    throw new Error(`Missing capability: ${operation}`);
  }
}
const inventory = api.ontology({limit: 2048});
if (!inventory.ok || inventory.truncated) throw new Error('Ontology inventory is incomplete');
```

Descriptions are independent, literal wording for each exact physical field. Preserve useful alternative names in descriptions; they become searchable suggestion text, **not parser aliases**. Matching ranks physical name, partner name, then that candidate's own description, and inserts only its canonical physical name. Do not infer an inverse meaning from the other endpoint's description or manufacture pairs to maximize pair count.

Prepare a private table containing old exact names, proposed canonical names, normalization collisions, roles, genuine inverse endpoints, description text, discovered scope/coverage and rationale. For example:

| Old exact name | Canonical name | Intent | Description |
| --- | --- | --- | --- |
| `Cites old` | `Cites` | Reviewed synonym | References an earlier source; formerly Cites old. |
| `Cited by` | `Cited by` | Genuine inverse | Later sources referencing this note. |

Never run a blanket replacement over note text. Existing body mentions, code/comments, values and inverse captions are not editable key declarations. Inspect exact physical names even if normalized identities coincide. `Parent Name` and `parent-name` can identify one assignment: changing its configured spelling is a rename of that identity, not creation followed by removal. Removing the former exact spelling after renaming is rejected; keep the canonical assignment and its migrated description.

## Discover candidates, then inspect each file once

`ontologyDocuments` is explicit bounded lookup over existing neutral-source postings. It includes physical unassigned/non-link/semantically overridden usages where those facts are recorded. A hit is only a **candidate**: it does not prove exact spelling, occurrence count or current source content. Keep each response's coverage, partial/truncated state and continuation with the audit. Changed revisions, expired cursors, cancellation and reload require reacquisition rather than ignoring errors or treating a missing tail as complete.

Collect candidate paths across mappings, deduplicate paths, then call inspection once per file with **all mapped fields** (at most 512). Process files serially or under the advertised concurrency bound, and write receipts incrementally rather than retaining an entire vault in memory. All ordinary graph/GraphQL reads remain passive; the new asynchronous inspection is separate.

```js
// One bounded request at a time; record candidates in your authorized private audit sink.
let cursor;
do {
  const page = await api.ontologyDocuments({field: 'Cites old', limit: 100, cursor});
  if (!page.ok) throw new Error(page.error.code);
  // Record page.value.documents, page.coverage and exact source/configuration revisions.
  // Empty pages can have continuation because actual work is bounded.
  cursor = page.value.cursor ?? undefined;
} while (cursor);
```

Each page scans at most 512 raw posting entries and authenticates at most 16 selected metadata sources. It can return fewer than the maximum 100 documents, including an empty page with continuation. Cursors are single-use, expire within a fixed two-minute traversal lifetime and belong to one provider/revision/field; at most eight traversals are retained, with one lookup in flight. `exhausted` and `postingComplete` are distinct from `wholeVaultComplete`, which remains conservatively false. `partial:true` and cached/incomplete coverage remain honest after the posting ends. `requireComplete:true` refuses this uncertainty; it does not trigger a scan.

```js
const fields = ['Cites old', 'Cites', 'Cited by'];
const path = '__ontology_consolidation_example__/Source.md';
const inspected = await api.inspectOntologyOccurrences({path, fields, limit: 1024});
if (!inspected.ok) throw new Error(inspected.error.code);
if (!inspected.value.complete || inspected.value.truncated || inspected.value.unsupported.length) {
  throw new Error('This file needs review; do not prepare replacements from incomplete inspection');
}
// Persist only the authorized private review data; do not print note bodies or values.
const sourceSnapshot = inspected.value.snapshot.id;
```

Inspection reads one selected **saved** Markdown file and parses the requested fields in one pass. Its snapshot is SHA-256 over the exact saved UTF-8 content; mtime/size are supporting freshness facts, not write authority. Pass `expectedSnapshot` when rechecking a known saved source. Body `keyRange` uses zero-based, end-exclusive UTF-16 indices into the exact original JavaScript string; line is one-based, column zero-based UTF-16. CRLF, BOM and surrogate pairs remain original coordinates. Never substitute legacy evidence offsets.

Frontmatter occurrences expose an exact top-level `yamlKey` and `keyRange:null`: a **logical locator**, not a replacement span. Unsupported/malformed/ambiguous YAML, masked keys, oversized inputs and truncation require a skip or separate review. Inspection does not expose note bodies/values or write notes. A complete inspection describes that supported file only.

Exhausting a cached posting is not whole-vault completeness. Missing/stale/unindexed/unknown sources mean an empty result cannot prove a field unused. For an **explicitly authorized bounded source audit**, use `app.vault.getMarkdownFiles()`, filter an approved folder/list, enforce a file/byte/time budget, and inspect each selected file once for all mapped fields. Save scope and progress, stop at the budget, and resume from receipts. Do not scan the vault once per field or use metadata-cache keys as an authoritative raw replacement map.

## Preview and apply configuration separately

Inventory references in lenses, style conditions, default fields, scripts and other authored configuration. Report dependent references for a separately approved change; this API does not silently rewrite them. Keep old assignments until physical migration is verified in the intended scope.

```js
const edits = [
  {kind: 'assign', field: 'Cites', role: 'parent', partner: 'Cited by', createPartner: true,
    description: 'References an earlier source; formerly Cites old.',
    partnerDescription: 'Later sources referencing this note.'},
  {kind: 'describe', field: 'Cited by', description: 'Later sources referencing this note.'},
];
const preview = api.previewOntologyConfiguration({edits});
if (!preview.ok) throw new Error(preview.error.code);
if (preview.value.state !== 'ready') {
  throw new Error(JSON.stringify(preview.value.conflicts));
}
// Return preview.value.changes/before/after for review. This step saves nothing.
```

Each batch has at most 128 intents and is validated as a whole. An invalid intent prevents the whole batch from acquiring an apply token. `assign` accepts canonical roles plus optional partner and independent descriptions; `partner:null` unpairs. `describe` sets one exact configured field's independent description; an empty string clears it. `remove` retires that exact assignment only. Pairing compatible existing roles and description-only edits are presentation changes; semantic role/recognition changes use the existing refresh path. No configuration operation rewrites note keys or creates reciprocal note declarations.

After explicit approval issue a **separate** eval using the returned token:

```js
const applied = await window.kplexApi.v1.applyOntologyConfiguration({
  previewId: 'RETURNED_REVIEWED_PREVIEW_ID', confirm: true,
});
if (!applied.ok) throw new Error(applied.error.code);
if (applied.value.state !== 'saved' || !applied.value.verified) {
  throw new Error('Inspect current ontology before continuing; do not replay the write');
}
// Check exact readback. refreshPending:true still means the save is already durable.
```

Apply readback has `readbackScope:'reviewed-endpoints'`: it contains only affected canonical definitions, with removed fields absent, rather than exporting the entire vocabulary. If readback becomes unavailable or exceeds its budget after saving, the receipt remains `state:'saved'` with `verified:false`, `readback:null` and `configurationRevision:null`. Do not replay apply; inspect current ontology before continuing.

Previews are bounded, expire after five minutes and are single-use; reload/incoming changes/stale relevant configuration invalidate reviews, including A→B→A changes. The existing queued writer preserves unrelated settings and unknown keys. Never edit `data.json` or use mutable plugin internals. Timeouts/uncertain receipts require readback and a fresh reviewed plan, not blindly repeated apply.

## Review and back up the source

Use exact `getFileByPath(path)` rather than enumerating to find a known file. `metadataCache.getFileCache(file)` can lag file contents; it is useful context, not a safe raw-key map. Read source explicitly under the approved scope, keep a private backup and review the actual diff before writes. `cachedRead` is appropriate for inspection; a later write must compare current content, not trust cache freshness. The following helpers prepare **data-only plans**, never parse ontology syntax or touch storage.

The documentation regression executes these exact helper blocks against disposable synthetic fixtures. If you copy them into another script, retain the guards and adapt only the approved scope, mapping, audit sink and backup destination.

<!-- tested-example: body-plan -->
```js
/** Hash the exact inspected source using the browser's public cryptography API. */
async function sourceDigest(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

/** Build exact, non-overlapping body key edits from K-Plex's canonical inspection only. */
async function prepareBodyPlan(text, inspection, mappings) {
  if (mappings.length > 128 || !inspection.complete || inspection.truncated || inspection.unsupported.length) {
    throw new Error('Incomplete or over-budget review');
  }
  if (await sourceDigest(text) !== inspection.snapshot.id) throw new Error('Stale inspected source');
  const byName = new Map();
  for (const mapping of mappings) {
    if (byName.has(mapping.from)) throw new Error('Duplicate old-name mapping');
    byName.set(mapping.from, mapping.to);
  }
  const edits = [];
  for (const occurrence of inspection.occurrences) {
    if (occurrence.syntax === 'frontmatter' || !byName.has(occurrence.name)) continue;
    const range = occurrence.keyRange, replacement = byName.get(occurrence.name);
    if (!range || !Number.isInteger(range.start) || !Number.isInteger(range.end) ||
        range.start < 0 || range.end > text.length || range.start >= range.end ||
        text.slice(range.start, range.end) !== occurrence.name) throw new Error('Unsafe key range');
    if (replacement !== occurrence.name) edits.push({...range, before: occurrence.name, after: replacement});
  }
  edits.sort((a, b) => b.start - a.start);
  let after = text, nextStart = text.length;
  for (const edit of edits) {
    if (edit.end > nextStart) throw new Error('Overlapping key ranges');
    after = after.slice(0, edit.start) + edit.after + after.slice(edit.end);
    nextStart = edit.start;
  }
  return {path: inspection.path, snapshot: inspection.snapshot.id, before: text, after, edits};
}
```

Keep plans, backups and values private and bounded; CLI output should summarize path/phase/hash/count rather than dump source text. Canonical target spellings must first pass the ontology configuration preview; the helper does not invent another spelling validator. Body synonym merges can leave repeated declarations of the new key: preserve their separate values, inspect their semantics, and review any value merging separately.

## YAML and body are serial phases

Public `app.fileManager.processFrontMatter(file, callback)` owns YAML editing. It can reserialize formatting, comments, quoting and ordering; **do not promise byte-identical YAML**. Preserve scalar/list/map types and unrelated properties. Detect malformed/duplicate/non-mapping YAML through canonical inspection before preparing changes. If an old and canonical key coexist, reject by default; merging distinct values or changing types requires a reviewed explicit policy. A synonym is not authority to discard one value.

In a locally bundled Obsidian plugin/helper, use the supported `getFrontMatterInfo` and `parseYaml` exports when preparing a private reviewed YAML-value snapshot from saved source. Import them with `import {getFrontMatterInfo, parseYaml} from 'obsidian'` through that helper's normal plugin build (keep `obsidian` external); Obsidian supplies the module when loading the plugin. **Plain CLI eval cannot resolve `require('obsidian')`.** CLI API calls and `app.fileManager.processFrontMatter` work directly without resolving that module. Do not install another plugin merely to gain access. For the runnable CLI-only synthetic example below, the reviewed values are explicit fixture data. These YAML facilities are not another ontology grammar; never use `metadataCache` as value authority or add an ad-hoc parser. The helper checks the entire reviewed parsed mapping before making any mutation, rejects exact target/mapping collisions, and preserves native values without stringifying them into replacements:

<!-- tested-example: yaml-plan -->
```js
/** Compare same-realm native YAML data with bounded traversal and no accessor invocation.
 * Aliased/cyclic objects and unsupported types require review rather than implicit serialization. */
function sameReviewedYaml(first, second) {
  const pending = [[first, second]], seenFirst = new WeakSet(), seenSecond = new WeakSet();
  let work = 0;
  while (pending.length) {
    if (++work > 16384) throw new Error('YAML review exceeds value budget');
    const [a, b] = pending.pop();
    if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') {
      for (const value of [a, b]) {
        if (value !== null && !['string', 'number', 'boolean', 'object'].includes(typeof value)) {
          throw new Error('Unsupported YAML value');
        }
      }
      if (!Object.is(a, b)) return false;
      continue;
    }
    if (seenFirst.has(a) || seenSecond.has(b)) throw new Error('Aliased or cyclic YAML review');
    seenFirst.add(a); seenSecond.add(b);
    const prototypeA = Object.getPrototypeOf(a), prototypeB = Object.getPrototypeOf(b);
    if (prototypeA === Date.prototype || prototypeB === Date.prototype) {
      if (prototypeA !== prototypeB || !Object.is(Date.prototype.getTime.call(a), Date.prototype.getTime.call(b))) return false;
      for (const key in a) if (Object.hasOwn(a, key)) throw new Error('Unsupported decorated YAML date');
      for (const key in b) if (Object.hasOwn(b, key)) throw new Error('Unsupported decorated YAML date');
      continue;
    }
    const array = Array.isArray(a);
    if (array !== Array.isArray(b)) return false;
    for (const prototype of [prototypeA, prototypeB]) {
      if (array ? prototype !== Array.prototype : prototype !== null && prototype !== Object.prototype) {
        throw new Error('Unsupported YAML object type');
      }
    }
    if (array && (a.length > 16384 - work || b.length > 16384 - work)) throw new Error('YAML review exceeds value budget');
    if (array && a.length !== b.length) return false;
    let countA = 0, countB = 0;
    for (const key in a) {
      if (!Object.hasOwn(a, key)) continue;
      if (++work > 16384) throw new Error('YAML review exceeds value budget');
      countA++;
      const left = Object.getOwnPropertyDescriptor(a, key), right = Object.getOwnPropertyDescriptor(b, key);
      if (!left || !right || !right.enumerable) return false;
      if (!Object.hasOwn(left, 'value') || !Object.hasOwn(right, 'value')) throw new Error('YAML accessors are unsupported');
      pending.push([left.value, right.value]);
    }
    for (const key in b) {
      if (!Object.hasOwn(b, key)) continue;
      if (++work > 16384) throw new Error('YAML review exceeds value budget');
      countB++;
    }
    if (countA !== countB) return false;
  }
  return true;
}

/** Reject a stale YAML review or implicit collision before changing any native property. */
function applyYamlRenames(frontmatter, reviewed, mappings) {
  if (mappings.length > 128 || !sameReviewedYaml(frontmatter, reviewed)) {
    throw new Error('Stale or over-budget YAML review');
  }
  const changes = [], sources = new Set(), targets = new Set();
  for (const {from, to} of mappings) {
    if (sources.has(from) || targets.has(to)) throw new Error('Mapping collision');
    sources.add(from); targets.add(to);
    if (from === to || !Object.hasOwn(frontmatter, from)) continue;
    if (Object.hasOwn(frontmatter, to)) throw new Error('YAML target already exists');
    changes.push({from, to, value: frontmatter[from]});
  }
  for (const {from, to, value} of changes) {
    Object.defineProperty(frontmatter, to, {value, enumerable: true, writable: true, configurable: true});
    delete frontmatter[from];
  }
  return changes.map(({from, to}) => ({from, to}));
}
```

The CLI-only example uses known reviewed YAML values for the disposable synthetic source used by this guide's regression: `Cites old: ["[[One]]", "[[Two]]"]`, `Unrelated: 7`, and `Keep: true`. These are data supplied for review, not values inferred from text. It performs no writes or runtime module resolution; the native frontmatter callback later checks that current values still exactly match. For arbitrary notes obtain the review through a locally bundled supported YAML helper or explicit human-reviewed native values. Keep it in the same trusted local session, or preserve scalar types explicitly in a private receipt; a JSON round trip alone turns dates into strings and cannot preserve every YAML value type.

<!-- tested-example: yaml-review -->
```js
const file = app.vault.getFileByPath('__ontology_consolidation_example__/Source.md');
if (!file) throw new Error('Selected file is unavailable');
const inspected = await window.kplexApi.v1.inspectOntologyOccurrences({
  path: file.path, fields: ['Cites old', 'Cites'], limit: 1024,
});
if (!inspected.ok || !inspected.value.complete) throw new Error('Unsupported or incomplete inspection');
const saved = await app.vault.read(file);
if (await sourceDigest(saved) !== inspected.value.snapshot.id) throw new Error('Source changed');
const reviewedYaml = {'Cites old': ['[[One]]', '[[Two]]'], Unrelated: 7, Keep: true};
// Present exact old/new keys and native values for review, back up saved, then separately:
// await writeReviewedYaml(app, file, reviewedYaml, [{from: 'Cites old', to: 'Cites'}], assertExclusiveSavedFile);
```

Exact YAML spellings can differ while sharing K-Plex's normalized identity. Review all original exact keys in that group; do not combine them automatically. The canonical ontology validator remains the authority for normalized assignment/spelling collisions. The YAML helper rejects duplicate exact targets and existing exact keys; it deliberately does not reimplement K-Plex normalization or an implicit value-merge policy.

Before file writes, establish **exclusive saved-file ownership** for each selected native file: close its editors in every main/popout window, including K-Plex embedded editors, sidepanels and companion-plugin panels outside the native workspace tree. The workspace check below sees only native workspace Markdown leaves; it **cannot detect all embedded editors**. The writers therefore require a caller-supplied synchronous `assertExclusiveSavedFile(path,file)` capability returning exactly `true` only while that independently established ownership still holds. Missing, false or asynchronous verification fails closed. A path prefix or an empty workspace-leaf list is not proof of ownership. These runnable examples target private synthetic notes kept closed; do not turn the fixture's established-ownership callback into a general always-true callback.

If public APIs cannot establish exclusive ownership for an arbitrary document, defer background migration or use the explicitly selected public `Editor` with its same-buffer/lifetime guards. For that selected live editor, use `Editor.getValue`, `offsetToPos`, `transaction`/`replaceRange`; do not mix background writes with unsaved buffers or guess private dirty flags. Physical IME and touch editing require separate acceptance.

<!-- tested-example: guarded-writes -->
```js
/** Supplementary workspace-tree check only; embedded editors need separate ownership proof. */
function assertNoOpenMarkdown(app, path) {
  for (const leaf of app.workspace.getLeavesOfType('markdown')) {
    if (leaf.view.file?.path === path) throw new Error('Defer an open Markdown document');
  }
}

/** Require explicit, synchronous source ownership plus exact native file identity on every phase. */
function requireSavedFileOwnership(app, file, path, assertExclusiveSavedFile) {
  if (typeof assertExclusiveSavedFile !== 'function' || assertExclusiveSavedFile(path, file) !== true) {
    throw new Error('Exclusive saved-file ownership is unverified');
  }
  assertNoOpenMarkdown(app, path);
  if (file.path !== path || app.vault.getFileByPath(path) !== file) throw new Error('File identity changed');
}

/** Apply a separately approved YAML phase through the public native writer only. */
async function writeReviewedYaml(app, file, reviewed, mappings, assertExclusiveSavedFile) {
  const path = file.path;
  requireSavedFileOwnership(app, file, path, assertExclusiveSavedFile);
  await app.fileManager.processFrontMatter(file, frontmatter => {
    requireSavedFileOwnership(app, file, path, assertExclusiveSavedFile);
    applyYamlRenames(frontmatter, reviewed, mappings);
  });
  requireSavedFileOwnership(app, file, path, assertExclusiveSavedFile);
}

/** Compare the entire saved source synchronously inside Vault.process before exact body edits. */
async function writeReviewedBody(app, file, plan, assertExclusiveSavedFile) {
  requireSavedFileOwnership(app, file, plan.path, assertExclusiveSavedFile);
  if (plan.before === plan.after) {
    const current = await app.vault.read(file);
    requireSavedFileOwnership(app, file, plan.path, assertExclusiveSavedFile);
    if (current !== plan.before) throw new Error('Stale source; unchanged plan needs reinspection');
    return {state: 'unchanged', path: plan.path};
  }
  const written = await app.vault.process(file, current => {
    requireSavedFileOwnership(app, file, plan.path, assertExclusiveSavedFile);
    if (current !== plan.before) {
      throw new Error('Stale source or file identity');
    }
    return plan.after;
  });
  requireSavedFileOwnership(app, file, plan.path, assertExclusiveSavedFile);
  const readback = await app.vault.read(file);
  requireSavedFileOwnership(app, file, plan.path, assertExclusiveSavedFile);
  if (written !== plan.after || readback !== plan.after) throw new Error('Readback mismatch');
  return {state: 'saved', path: plan.path, snapshot: await sourceDigest(written), changes: plan.edits.length};
}
```

Record a private receipt before/after each phase, with exact file identity/path, original/target hashes, approved mappings, backup location, actual result and verification status. First apply approved configuration definitions; then YAML; **reread and reinspect** before preparing body edits. YAML serialization can move every body offset, even when only one property changes. Never reuse pre-YAML offsets. The `Vault.process` callback is synchronous: do not await inspections or hashes inside it. The full-text equality guard uses the reviewed source captured outside it.

The following is one source-local body phase **after** YAML and explicit approval; `app` is the host app supplied to the trusted script:

```js
const path = '__ontology_consolidation_example__/Source.md';
const file = app.vault.getFileByPath(path);
if (!file || file.extension !== 'md') throw new Error('Selected Markdown file is unavailable');
const currentInspection = await window.kplexApi.v1.inspectOntologyOccurrences({
  path, fields: ['Cites old', 'Cites', 'Cited by'], limit: 1024,
});
if (!currentInspection.ok) throw new Error(currentInspection.error.code);
const text = await app.vault.read(file);
const plan = await prepareBodyPlan(text, currentInspection.value, [{from: 'Cites old', to: 'Cites'}]);
// Show exact edits/diff, obtain approval, and create a private backup before this separate step:
// const receipt = await writeReviewedBody(app, file, plan, assertExclusiveSavedFile);
```

Do not persist an automatic rollback over concurrent edits. On readback failure, preserve the original backup and current file, stop that file's phase, and request/review recovery. Resume interrupted work from current source inspection and durable receipts: a completed YAML phase can coexist with an unstarted body phase. A second pass should produce zero old-name edits; skip `processFrontMatter` entirely when reinspection has no old exact YAML keys, avoiding needless serialization. Do not replay completed mutations merely to make the run look uniform.

## Verify before retiring assignments

Read back configuration and each changed file; re-inspect all mapped old/canonical names, check supported syntax and source identity, and compare representative relationship semantics where coverage permits. Verify canonical insertion through native suggestions (description query → exact canonical name), intended inverse meanings, independent descriptions and affected lens/style references. Audit permission never grants authority to fix those dependent references.

Only after the **approved scope** is verified should a separately reviewed configuration batch remove obsolete assignments:

```js
const retirement = window.kplexApi.v1.previewOntologyConfiguration({
  edits: [{kind: 'remove', field: 'Cites old'}],
});
// Inspect exact effects and require a separate explicit approval before apply.
```

If source coverage remains partial, report that limitation and retain old assignments unless the user approves a smaller, clearly bounded retirement scope. Configuration/file phases are not a vault-wide transaction. Do not claim exhaustive success from zero partial hits or remove the new canonical identity when the old spelling was normalization-equivalent.

## Verified Obsidian API references

Examples were checked against the installed `obsidian@1.13.0` declarations: `Vault.getMarkdownFiles`, `getFileByPath`, `read`, `cachedRead`, synchronous `process`, `FileManager.processFrontMatter`, `Workspace.getLeavesOfType` and the public `Editor` interface. Official sources:

- [Vault: inspection reads and guarded synchronous process](https://docs.obsidian.md/Plugins/Vault).
- [Official API-usage checklist: frontmatter, active Editor and background process](https://docs.obsidian.md/oo/plugin).
- [Public Editor abstraction](https://docs.obsidian.md/Plugins/Editor/Editor).
- [Obsidian CLI](https://help.obsidian.md/cli).

The recipe regression exercises production occurrence parsing plus collision/stale rejection, CRLF/Unicode slices, YAML-before-body reinspection, interruption/resume, unchanged unrelated values/body content and an idempotent second pass. A disposable native run establishes actual host serialization and file lifecycle; unit fixtures alone do not establish physical mobile/IME or cross-device Sync behavior.
