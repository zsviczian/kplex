# Settings-independent indexing SI2 acceptance — 2026-09-29

SI2 is accepted on `indexing-optimization-v2`. Production source collection now records reference-bearing frontmatter and inline values independently of ontology and image selectors. Full compilation and incremental patch preparation use one policy selector before graph materialization. Unassigned candidates remain dormant and the same facts can be replayed under another policy without changing producer output.

## Review correction

The returned frame protocol marked the last payload chunk but did not prove that all candidates for a multi-target value had arrived. A producer could therefore declare its last batch while silently omitting later candidates. Review added a `final` marker to the last `reference-candidate`, made the decoder require both payload and candidate terminal markers, and added full/patch rejection coverage for truncated and post-final candidate sequences. No partial frame can now publish or reach patch entity lookup.

## Accepted behavior

- The Obsidian reference collector has no ontology or image settings input. It preserves exact and normalized field names, surface, occurrence identity/location, lexical target/subpath and explicit host-resolved identity.
- One physical value owns one bounded shared payload. Target candidates do not duplicate it. The queue retains its 256-record cap, adds a 256 KiB estimated-byte flush and limits payload chunks to 16,384 UTF-16 code units.
- One portable selector handles full and patch builds. Dormant candidates cannot materialize nodes, URLs or ghosts, create declarations/ownership, or request missing published targets.
- Exact duplicate and normalized-equivalent settings retain assignment order and multiplicity. Existing frontmatter precedence, conflicting inline evidence and evidence/search goldens remain unchanged.
- Image-only, prose-plus-image and ontology-plus-image reconciliation uses the same neutral candidates and exact host occurrence counts.
- Version-3 fingerprints include references in unassigned fields, exclude ontology/image policy, ignore unrelated non-reference values, and stream the shared payload once.
- SI2 persists no source facts. Ontology/image changes still request a full semantic rebuild. Durable facts are SI3 and settings-only reinterpretation is SI4.

## Automated verification

Final verification used Node **22.22.3**, npm **10.9.7**, the installed dependencies and the real Obsidian declarations.

- `npm run verify` passed: seven architecture tests, 58 migrated roots, 103 reachable files, zero violations, 60 core tests, official Obsidian lint, 133 aggregate Node tests, seven Chromium DOM tests, real typecheck and production build.
- The unchanged indexing, search, evidence, restore-watchdog, incremental-patch and strict timing assertions passed. The SI2 suite directly covers neutral replay, dormancy, ordering/multiplicity, exact image suppression, dense payload bounds, neutral fingerprints, cancellation and malformed/truncated frames.
- `git diff --check` passed.

Two early nested native attempts hit different pre-existing strict timer guards while the large Obsidian renderer competed for CPU; both runs are recorded as failed and are not acceptance evidence. With K-Plex disabled during the nested portable phase, the complete `npm run verify:obsidian:migration` lane passed.

## Native evidence

Obsidian **1.14.3 (installer 1.14.0)** loaded the exact reviewed build in the disposable `kplex-test` vault. The migration runner passed real import/persistence, node/link style managers, unchanged legacy-style save, rendered graph styles, plugin reload, cleanup and JavaScript-error checks. Source and installed artifact hashes matched:

- `main.js`: `85965ccccec6374f84567958a8d22f41119ed4fe61e51c0ab3374bc5bac682c0`
- `manifest.json`: `e3bb9a35215af97f6a3394cf7fc8f7d2142bae06de94bb112fef5a05819cda62`
- `styles.css`: `e9da76ff7840cea44b77912963977f1fe2ab762b69a9853d047712d7b3270494`

Owned native notes then exercised one unassigned frontmatter reference, one unassigned inline reference and one image reference:

1. Under the original policy, all three had only independent `obsidian-link` evidence and no ontology evidence.
2. Assigning both fields as parents produced `frontmatter-ontology` and `inline-ontology` parent evidence from the same note contents. Assigning the image selector suppressed the single generic image-link declaration exactly.
3. Moving both fields to the right-friend/challenger policy removed parent evidence and produced right-role evidence. Restoring the image selector restored the generic image-link declaration.

The final cleanup restored settings, deleted all four owned files, removed the test controller and reached an authoritative ready graph of **20,015 Markdown files, 20,703 nodes and 715,032 evidence declarations**. `dev:errors` reported no errors.

The right-friend settings change still invoked `full-rebuild:settings` and took about 145 seconds on the 1.9 GB fixture. This is expected SI2 behavior and is not a performance acceptance result. It demonstrates why SI4 is required before the product can claim settings-independent indexing.

## Manual and next checkpoint

No maintainer manual test blocks SI2. It changes no UI and no durable storage path; portable and native owned-note tests cover its behavior. Physical iPad/Android lifecycle, memory and interruption tests remain SI5/release gates.

The next reasonable offline checkpoint is **SI3 alone**. It introduces IndexedDB schema, atomic per-source heads, migration and crash recovery. Combining it with SI4 would mix persistence/recovery defects with settings-read consistency and make either failure class difficult to isolate.
