# SI4 exact selected-title input proof

**Status: reviewed missing-contract finding, not an implemented reader or accepted checkpoint.** This is the
negative branch of the selected-title assignment. The current contracts do not authenticate all
inputs to one exact candidate's full-build title. No production route, selector, source schema or
existing certificate is changed. In particular, `complete-neighborhood-relations` and the separate
center-gate certificate must not be interpreted as title or sorted-list certificates.

## Inventory before implementation

The title policy is owned by `src/index/GraphIndex.ts`, not by source replay. The active full path is
`GraphBuilder.build()` → structural collection → all host links → Markdown metadata in
`vault.getMarkdownFiles()` order → structural finalization → compiler finalization →
`bindCompiledGraph()`. The binder copies each compiled node's name and ordered aliases and binds its
physical file through the structural collector. `titleFor()` then reads selected properties from
**live** `metadataCache.getFileCache(page.file)?.frontmatter`, not the compiler's metadata input.
Consequently, the name, aliases and selected scalar may have different observation owners.

| Entry point | Inputs and callers |
| --- | --- |
| `displayNameFromConfiguredFields()` | Captured presentation settings, ordered `page.aliases`, live frontmatter for the bound file. Called only by `titleFor()` and the staged-settings branch of `makeSearchEntry()`. |
| `titleFor()` | Selected display name or `page.name`, plus a local memoization signature. Used by ordinary search-entry construction, sorting, the Obsidian graph-read adapter, layout, PlexGraph, App pinned/history items, ContentPane, RelationModal, RelationshipExplanationModal, NewRelatedNoteModal and RelationPopover. Both `.ts` and `.tsx` NewRelatedNoteModal files contain calls; this inventory does not introduce either as a new consumer. |
| `sortNeighbours()` | Title; file mtime/ctime or semantic mtime; **raw** `page.neighbours.size`; original input-array index. Called by `relationView()`, the sibling branch of `getNeighborhood()` and `SectionExpansion`. |
| `refreshDisplayNames()` / presentation publication | Capture presentation settings and clear/rebuild title/search state through the existing publication owner. These do not create an exact source/MetadataCache title certificate. |

`titleFor()` memoizes using mtime, renderAlias, nameFields, nodeTitleScript, first alias and base name.
That is an optimization, **not** an authenticated selected-property revision: later aliases and
frontmatter values are absent from the key. Tests use a fresh full-built or full-bound GraphIndex
for every final-policy expectation, rather than an old published page or its title cache.

### Canonical selection, including non-obvious negatives

1. `renderAlias === false`, or no nonblank comma-separated `nameFields`, skips configured display
   names. The fallback is the compiled page name, not a guessed basename from an opaque NodeId.
2. Requested fields are trimmed, empty tokens removed and tried in order. Normalization is exactly
   `normalizeFieldName`: lowercase, replace whitespace runs with `-`, then trim. In a **raw key**,
   leading/trailing whitespace therefore becomes hyphens; requested tokens have already been trimmed.
3. A requested normalized `alias` or `aliases` uses the first nonblank `page.aliases` entry. It does
   not look up an arbitrary case-normalized alias property in live frontmatter. Canonical aliases
   come from `mergeFileMetadata`: `frontmatter.aliases ?? frontmatter.alias`, recursively flattened
   string arrays, trimmed nonempty strings, preserved order and duplicates. An empty array or other
   non-nullish unusable plural value suppresses singular fallback; a null plural value does not.
4. Every other requested field uses `Object.entries(frontmatter)` encounter order. The first
   normalized matching key decides that field. An unusable value stops that key search: a later
   duplicate normalized key is **not** a second chance. The next *requested* field can still win.
5. String values are trimmed. Arrays are searched recursively, depth first, for the first nonempty
   string. Numbers, booleans, null and objects do not become titles. The exact raw key `position` is
   excluded; `Position` is not. Inline fields do not supply configured title properties.
6. `nodeTitleScript` is deliberately never executed. It remains in presentation/cache identity;
   adding a new reader is not authorization to run it.

No substitute selector is implemented in the tests. All expected presentation is obtained from the
production `GraphIndex.titleFor()`, with explicit assertions that characterize its current policy.

## Input ownership and the first missing premises

| Input | Existing evidence | What is still missing for a title certificate |
| --- | --- | --- |
| Exact physical identity / base file name | Structural entity fact and current bound TFile; source physical identity/stat and host fence | Retain the exact producer ID and binding; never derive identity from path text. A relation's candidate existence alone does not authenticate its own metadata. |
| Ordered aliases | Durable `metadata` family, replayed by the canonical compiler | Read the candidate's own complete metadata family under its selected head, even when its relation was supplied only by another owner. No all-owner scan is needed for this individual input. |
| Arbitrary configured scalar/array | Live frontmatter. Durable `values` intentionally retains reference-bearing values, not a generic property mirror; `field-name` facts preserve names but not every scalar payload | A bounded, complete **selected** live observation tied to the same physical incarnation, parsed source version and source head, including explicit absence and first-match order. |
| Missing MetadataCache | `getFileCache()` can return null; replay already returns `pending-metadata` | A null cache is pending, not evidence of absent fields. A non-null cache without frontmatter is an absence proof only after its completion/current-version premise is established. |
| Tag/container labels | Canonical structural/compiler facts, tag paths and captured `showFullTagName` | Replay exact current structural support under the captured semantic policy. A partial or prior published synthetic name is not authority. |
| URL labels | Canonical body-URL facts retain label/occurrence and owner. Compiler chooses the first meaningful label across owners | Complete supporting-owner coverage **and the full builder's source encounter order**, not just the catalog's structural encounter order. See the executable counterexample below. |

Settings-only source reuse is appropriate: acquiring every note or copying all frontmatter to storage
would violate this slice. The characterization suite guards ready cached requests against Markdown
reads, parser calls and source replacement; these are tests of existing contracts, **not** evidence
that a new exact-title capability was implemented.

## Counterexample: complete URL support, wrong source order

Use two unchanged notes, both linking to `https://example.com/path`:

- Markdown inventory order: `Nested/First.md` with `[First label](...)`, then `Root.md` with
  `[Second label](...)`.
- Root children: folder `Nested`, then `Root.md`; the folder contains `Nested/First.md`.

`ObsidianStructuralSourceCollector` emits the root file's document entity before descending into the
nested folder. `SourceContributorDiscovery.rebuild()` assigns its `source` row's `order` as each such
document entity arrives. Discovery sorts selected source owners by that order. In contrast,
`GraphBuilder.collectMarkdownSources()` uses the Markdown inventory order. The structural digest
observes the host streams but does not encode an authenticated per-source Markdown ordinal or prove
that the two orders are equal.

The executable fixture uses the **actual full GraphBuilder**, actual source acquisition/replay,
actual normalized compiler and actual GraphIndex binder/selector. With all supporting owners present,
the full build titles the URL `First label`; replay in catalog source order titles it `Second label`.
Replaying those same complete owners in Markdown order restores parity. This is a title-input gap,
not merely the separate stable-neighbor tie-order problem. Sorting owner IDs lexically, using whichever
owner supplied the center edge, taking a label from the current graph, or merging only nonempty labels
would introduce a second semantics and is not a fix.

## Live MetadataCache: stability is not parse-completion evidence

`ObsidianSourceAcquisition.captureForReplay()` checks file identity/path/stat, acquisition file and
host revisions, cache **object identity**, resolver environment and demand before/after its awaited
digest. It requires a previously acquired non-dirty source. These are useful invalidation fences.
The `changed` listener currently consumes only the file argument, and `resolved` invalidates the host.
There is no stored per-file metadata-completion token relating a particular cache payload to the
source body/head version. Resolver-environment hashing is not a selected-title payload commitment.

The [official public declarations](https://raw.githubusercontent.com/obsidianmd/obsidian-api/master/obsidian.d.ts)
checked on 2026-09-30 expose nullable `getFileCache`, `changed(file, data, cache)` after indexing,
`resolve(file)` for link resolution and the aggregate `resolved` event. They explicitly exclude
renames from `changed`; Vault rename needs its own observer. They do not expose a parsed-source
revision in `getFileCache` or promise an immutable cache object. Main-agent review confirmed these
signatures in the installed `obsidian@1.13.0` declarations; neither declaration check is a native
scheduling experiment. The repository's startup link-count/quiet-time heuristic likewise
is not an exact per-file property-absence certificate.

Two host-double traces expose the precise missing guarantee; neither asserts that native Obsidian
actually performs this ordering or mutates caches silently:

- After Vault `modify`, acquisition can be called with a new parsed body while `getFileCache()` still
  returns the old non-null cache. Acquisition clears dirty state after replacement, and replay capture
  is subsequently ready without a MetadataCache `changed` completion for that edit. The existing
  contract therefore cannot itself distinguish a current no-frontmatter cache from an older one.
- Mutating a non-Date scalar in place without an event preserves the current cache reference,
  physical facts and environment. A prior capture's `isCurrent()` remains true while a fresh full
  GraphIndex selects a different title. Native immutability/event-order guarantees, if available,
  must be established explicitly rather than inferred from TypeScript's return type.

This does not reinterpret accepted relation/gate certificates or prove a native product bug. It
shows why those contracts cannot silently be widened to certify a same-source-head live scalar or
its absence. A weaker “whatever getFileCache currently returns” display read is not the requested
source-bound proof, even if it matches one synchronous full-builder observation.

## Smallest sound correction (design only)

### A. One exact-ID, source-bound selected-metadata observation

Keep this in the Obsidian adapter. The future portable title input must receive only finite immutable
selected data plus opaque evidence, never a TFile, MetadataCache object, body string or arbitrary
frontmatter mirror. The exact candidate's ID must be resolved through certified physical facts.

The host needs a per-incarnation completion observation that binds: exact file identity and physical
revision, acquisition/source head revision, a particular completed MetadataCache payload, and a
monotonic metadata revision. Capture the public `changed(file, data, cache)` completion inputs and
correlate them with the acquisition's body observation **before** treating a scalar/absence as
current. A callback alone, timestamp equality alone, or hashing old cache values alone is not enough:
a later edit may already be pending. The main-agent probe below must establish the native ordering
and startup completion guarantee. If that correlation is unavailable, retain pending; do not label
currentness from the absence of a notification.

At startup, register observation before acquisition. Reused durable heads and a non-null startup
cache do not manufacture a completion observation. Bootstrap must use a documented host completion
barrier with per-file/source correlation, or an acquisition-time verified correlation. Body reading,
parsing or head writing to establish this belongs to acquisition, not a settings-only title request.
After a modify/rename/replacement/delete or metadata event, invalidate immediately; no later completion
may clear a newer pending revision. Missing cache, unbound completion, changed head or dirty journal
remain pending/stale through the existing failure vocabulary. Policy changes invalidate only the
presentation request; they must not force a new source head for already proven inputs.

Observe only the requested keys plus the canonical alias/base inputs. Preserve raw key order and the
first normalized match, including a present-but-unusable value separately from an absent key. An
observation must explicitly distinguish complete-absent, complete-present and incomplete. A negative
requires a complete scan of the eligible keys, not just a missing lookup result from a prefix.

Bound **work as well as the returned title**: admit finite field count/field bytes, frontmatter keys,
raw-key bytes, visited array items/depth and string bytes before copying/descending. Existing
`Object.entries()` eagerly materializes all properties; simply invoking it and checking title length
afterward is not bounded. A future canonical selector extraction needs a budget-aware traversal and
shared decision logic, while preserving the existing synchronous public behavior. Reject over-budget
input as unsupported/pending; never truncate a value or silently skip an earlier matching key. Host
metadata must be ordinary data with a proven no-mutation interval, or the adapter must validate a
selected immutable projection; invoking untrusted getters is not a bounded observation contract.

The request captures independent semantic revision, presentation revision (`renderAlias`, ordered
`nameFields`, `nodeTitleScript`), clean root/journal, all selected source heads, host/completion token,
exact identity and demand. Recheck all after decoding, selection, every cooperative yield and **after
the final awaited head/root validation or lease release**. A final-await cancellation exposes no title,
not an empty string. Existing replay finality patterns can be reused; they do not supply the missing
metadata-completion premise by themselves.

### B. An authenticated full-builder source-order coordinate

During the already-authorized full contributor/catalog acquisition, capture the Markdown inventory
ordinal for each exact source under the same structural boundary/host stamp used by the full builder.
Commit that coordinate in the authenticated derivative catalog and validate uniqueness/completeness;
version/rebuild its strict row codec rather than silently redefining an old v2 `order`. Preserve
structural fact order separately. Source-family payloads need not change for a title-only correction.
No settings-time `getMarkdownFiles()` or all-owner scan is permitted.

An exact URL read then discovers the complete bounded label-support incidence for that exact URL
(and any canonical origin support required by the compiler), validates every selected owner/head and
replays them in that authenticated order using the existing compiler. Record order within an owner
comes from validated source families. Empty support is authoritative only from a complete current
range. A hot support range remains unsupported until the separate continuation contract exists.
This coordinate concerns source-label precedence; it does **not** settle full-scene neighbor insertion
order, degree counts or top-N ties. Full-build phase ordering must also be preserved or separately
proved immaterial for the selected label; a Markdown ordinal is necessary, not permission to assume
all per-owner interleavings match the full compiler.

## Review and native evidence required

The new portable suite is a characterization of the boundary and counterexamples. It uses production
modules with explicit host and memory-storage doubles, not real IndexedDB or proof of native cache
scheduling. The order case uses production catalog rebuild with explicit durable-coordinate doubles;
those envelopes do not turn memory heads into durable evidence.

Minimum native probe for the validation agent: on the same build/runtime, register Vault create,
modify, rename, delete and MetadataCache changed/resolved observers before startup acquisition. For
one note record an ordinal, exact TFile identity/stat, cache object identity, cache payload/absence,
completion callback data correlation and acquisition/head revision at each event/read. Probe initial
startup without frontmatter, an edit adding/removing a dormant scalar, aliases/array changes, rapid
successive/equal-stat edits and rename/delete/recreate. Establish whether a changed callback can carry
an older body than current file state, and whether cache mutation is observable before invalidation.
The observation must be correlated to the actual acquisition input, not merely an eventual title.
Do not log an entire user's vault or add permanent product instrumentation for this proof.

Separately use two nested/root Markdown files with distinct labels for one URL. Record both actual
host enumeration orders and the fresh full-build label. A native equality in that small vault does not
prove the public orders always coincide; the executable legal-host counterexample still requires a
contract or recorded coordinate. No maintainer manual workflow is needed: the slice has no consumer.

Main-agent review on Node 22.22.3 with real dependencies passes the 35/35 characterization suite,
all source tests 186/186, architecture 7/7, core 60/60, Obsidian lint and production build.
Installed `obsidian@1.13.0` declarations expose nullable `getFileCache()` and `changed(file, data, cache)`;
they still do not supply a source-correlated completion token. Full `verify` fails the unchanged
strict URL-heavy timer at 70.9 ms against 50 ms. Obsidian CLI is installed but Obsidian was not
running, so the native event-order probe remains pending. See [the review](validation/settings-independent-indexing-si4-selected-title-review-2026-09-30.md).
Source/Chromium/full-dependency validation does not replace that host probe. Changed-host BREF-1, raw candidate degrees, stable
neighbor order, hot-range continuation, SI4b1/SI4b2/SI4c/SI5 and C15–C26 remain open/paused as previously
recorded. No title reader is claimed ready and no UI/search/settings/publication wiring is added.
