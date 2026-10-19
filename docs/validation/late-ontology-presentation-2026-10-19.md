# Stationary Plex updates after late ontology processing

Baseline: main `73b0589fbb9f`. Branch: `fix/late-ontology-presentation`.

## Confirmed cause

The reported device incident could not be repeated interactively after restart. A controlled reproduction through the actual GraphIndex, GraphBuilder, compiler and Chromium IndexedDB does reproduce its essential failure: the canonical graph has a defined ontology relationship, but the stationary visible center still selects an older local cover containing an inferred relationship. Navigating away retires that cover, explaining why returning corrects the view.

Ordinary incremental publication invalidated local read covers and count proofs in `publishIncrementalFile()`. Progressive ingestion called the shared `commitPreparedFile()` directly and therefore skipped that handling. Its normal batched notification reached subscribers, but their reads still selected the old cover. Additional notifications alone could not repair it.

The regression establishes a real local baseline, starts progressive ingestion, acquires the center once, then admits a late incoming body-ontology owner. Ten genuine source commits trigger the existing notification batch while an unrelated final native read remains held. The canonical relationship is defined, but the original runtime still returns inferred (`2`) for the displayed center. This is the failing assertion; the test does not manufacture graph relations, source readiness or notifications.

## Correction and scope

Move the existing local-cover/count invalidation into the shared per-file commit owner. Ordinary and progressive publication now run the same handling before their respective notifications. The existing finite center producer prepares any required successor; no additional scheduler, watchdog, semantic classifier, whole-vault scan or settings writer is introduced. Compilation precedence and notification batching remain unchanged.

The completed startup-continuity correction remains in place. Source/policy/native identity guards, exact relationship-write authority and producer cancellation remain separate from read presentation. Full current Eager graphs continue to skip local handling. On-demand and ordinary patches retain their established handling through the shared owner.

Two regressions cover an inferred parent becoming a defined parent without membership changes, and a bidirectional inferred relation becoming a defined parent. Both require the normalized ontology definition, a subscriber observation, the same single active demand and unfinished background ingestion. The center and late source are each read once; refreshing the displayed cover adds no duplicate native body read in these fixtures. These are functional work-count checks, not CPU/memory or latency benchmarks.

The user's English “One-sided layout” edit is retained and translated into German, Spanish, French, Japanese, Dutch, Russian and Traditional Chinese. The README navigation labels match. Persisted keys and layout behavior are unchanged.

## Verification

The broader focused run passed 239 cases across on-demand/progressive publication, foreground startup, host previews, localization, viewport fitting and recovery. Both final late-ontology variants also pass independently.

`npm run verify:obsidian` passed release checks, architecture (7), core (130), official lint, main (1,129), UI (185), sources (334), browser sources (642), actual TypeScript/production build and exact-build native smoke. Zero failures, cancellations or skips. Host: Node 22.22.2, Windows 10.0.26200, Obsidian 1.14.4 / installer 1.14.0. Tested/staged main SHA-256: `b218c18fb12d285b07419e69551b594c1f6ad4ac83bc7e19faaa4a678e0cddd8`.

The existing `scripts/testing/obsidian/ontologyInput.mjs` lane passed all seven cases in each actual session mode, On-demand and Eager. It exercised trusted Settings typing, idle/blur/close submission, stationary parent updates in main/sidebar/popout, failed storage and retry, synthetic composition, saved-refresh-pending, saving without a Plex, and reload. Both reports verified exact artifact identity and byte-for-byte configuration restoration; owned fixtures and temporary controls were removed. These native Settings tests complement the held progressive-publication regression; they do not claim a native reproduction of the original intermittent indexing incident.

No personal vault is accessed or deployed for this checkpoint. Native fixture work is restricted to the existing disposable `kplex-test-small` vault. Raw local outcomes are retained privately; none are published as note/cache payloads.

## Remaining acceptance

The controlled failure identifies a concrete cause matching the reported workaround; it does not establish that every historical device incident used this path. Native ontology Settings checks exercise live reclassification separately from the held progressive-ingestion fixture. macOS and physical mobile acceptance remain pending.

Priorities: observe a stationary center while late incoming ontology is processed and confirm role/label/style updates without navigation; confirm ordinary startup populations remain continuous; repeat the stationary case on macOS and a physical phone/tablet.
