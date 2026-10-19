# Saved center and history during startup

Baseline: main `98843fc6fcfd`. Scope: restore saved navigation without waiting for broad catalog/index readiness; retain existing indexing and settings ownership.

## Cause and correction

Settings already contain the saved center and chronological history when plugin load completes. The UI previously discarded history rows whose pages were not yet available, and omitted the entire footer on its loading surface. This made correctly loaded settings look delayed.

The fallback owner searched older history for any available graph page before startup could establish that the requested center was missing. An early tag could therefore replace a temporarily unavailable saved note; the App effect could persist that replacement. The root-only persistence guard did not protect against a non-root history replacement.

The correction:

- During partial startup, only the requested center can satisfy fallback. After readiness, genuine deletion still falls back through history and then the root.
- The loading and graph surfaces share one history footer. All fourteen saved slots appear immediately; unavailable targets remain disabled and upgrade to their normal titles/icons when published.
- Before view registration and again at layout readiness, prime existing saved notes, attachments and folders through the existing filename/folder availability owner. Use exact native lookups, shared facet construction, identity validation and ordinary catalog replacement. This does not create semantic relations or grant write completeness.
- A missing startup center keeps the loading surface rather than showing a temporary root.

The fallback defect predates #179. Its actual implementation reproduces the premature-tag result deterministically. #179 did not change this fallback or the footer, and unchanged startup theme initialization requests no optional saved-settings refresh. The particular recent PR/timing change that exposed the latent race has not been established; this report does not claim a bisected introducing commit.

## Validation

The unmodified production runtime, with a temporary scalar-only observer appended to `main.js`, retained the correct center in the observed restart: the intermittent tag substitution was not reproduced natively in that trial. Its loaded settings contained forty history entries. No production notes were read or changed by diagnostic scripts.

The first candidate exposed a further native boundary: the native file tree was empty during plugin load. Priming alone therefore did not meet immediate-history behavior. That failed candidate and its observations are retained privately. Rendering saved slots independently and retaining the loading center address that boundary.

Focused checks: 86 passed, including actual React history rendering with all targets unavailable, later slot activation, provisional-root rejection, the actual plugin fallback, exact file deletion/replacement, idempotent priming, and forbidden inventory/body/storage access.

`npm run verify:obsidian` passed: release checks, architecture (7), core (130), official lint, main tests (1,129), UI (185), sources (334), browser sources (639), actual TypeScript/production build, and exact-build native smoke on `kplex-test-small`. No failures, cancellations or skips. Host: Node 22.22.2, Windows 10.0.26200, Obsidian 1.14.4 / installer 1.14.0. The staged main SHA-256 was `7f034ae8e119919361737e60d45929442beb2e18cdbde34764bb857cadec98aa`.

The final loading markup reuses the existing main-column/graph-area layout; no stylesheet change or deployment is needed. After that adjustment, the complete UI group (185) and official lint passed again. Its regression mounts the actual production loading JSX and history footer. The full runner's final build/native smoke also used this markup.

The revised native candidate retained forty saved settings entries and displayed all fourteen footer slots while the center was still loading. The first observed rendered center was the expected saved note; the saved-center identity remained correct throughout. The observer exported only counts, booleans and elapsed times, not note text or saved paths. These are functional observations, not a comparative performance result.

The final exact-build repeat verified fourteen slots at the bottom of the loading surface and then the graph, with unchanged saved identity and the correct first center. An initial occluded-window capture was retained as functional DOM evidence only; the subsequent foreground repeat recorded `document.hidden === false` in both states. Production settings remained byte-for-byte unchanged. Deployment touched `main.js` only; the original bundle and all diagnostic outcomes are retained privately. Temporary observers are excluded from source and the installable bundle.

## Startup neighborhood continuity

The follow-up report described parents, then children, a repeated children phase with flicker, and finally siblings. A foreground trace of the original `226e007` runtime reproduced the incremental populations and two retire/replace windows for the finite current-center cover. It did **not** capture painted removal of parents/children in that trial: React could coalesce the short gaps. Animation observations showed entrance effects for new nodes, not a replay of every existing node during those repeated publications.

The confirmed gap is in `GraphIndex.refreshVisibleHostMetadataPreviews()`: even a startup metadata-resolution event with unchanged source revision deleted the readable body-defined cover before its asynchronous replacement existed. Holding that actual replacement producer in the existing real Chromium/IndexedDB startup fixture makes the defect deterministic: 37 visible children become zero while the replacement is pending. This test fails on the original runtime.

The correction keeps the existing finite cover readable only during the pending startup replacement. It does not renew its certificate, grant relationship-write readiness, add a watchdog, delay publication or change animation policy. The original source/policy and captured native identity/stat checks still apply. Known same-stat edits, unknown revision jumps and unnotified native changes reject the predecessor; unavailable replacement input retires it at completion. A center cannot bypass these checks by borrowing itself as a neighbor. The successful private successor replaces the predecessor normally.

All 209 focused startup/preview/on-demand/recovery/motion cases pass, including held replacement, same-stat source change, unknown revision, native stat/identity replacement and unavailable metadata. The real production build and official lint pass. The candidate foreground production trace retained three parents and 37 children across both replacement publications, then added siblings without removing those parent/child DOM elements. The normal later refinement from 44 to 42 siblings remained. No measured performance improvement or universal absence of startup flicker is claimed; the deterministic failure establishes the corrected boundary, and the native trace establishes continuity in the observed restart.

The follow-up full `npm run verify:obsidian` passed release checks, architecture (7), core (130), official lint, main (1,129), UI (185), sources (334), browser sources (640), actual build and exact-build native smoke on `kplex-test-small`. Zero failures, cancellations or skips. The tested/staged main SHA-256 was `2bf57fb13cfea51f17995862c9a2bb512385666cfc2fe4c5a34094af80e395ce`; runtime source is `226e007` plus this continuity patch. Host versions remain Node 22.22.2, Windows 10.0.26200 and Obsidian 1.14.4 / installer 1.14.0.

Temporary observers collect only scalar counts, opaque object identities, revision flags and animation facts. Production deployment changes `main.js` only; diagnostic scripts do not acquire note text or write notes. Settings remained byte-for-byte unchanged. Original/candidate bundles, failed/passing tests and all captured traces stay private, with originals retained. Temporary runtime observers are removed after measurement.

## Limits and manual acceptance

Filename availability is not relationship completeness. Relationships continue through existing local/semantic publications. No reader sharing, receipt, parser, persistence schema, source inventory or indexing scheduler change is included. No comparative performance claim is made.

This correction does not shorten Obsidian's native-tree initialization. The saved center can remain loading until its native identity is available; it must not silently become a different history entry during that interval.

Unresolved saved targets show their persisted identity with an unavailable icon until their real graph/native owner exists; they are not fabricated into valid notes. Native macOS and physical mobile restart acceptance remain untested.

Prioritized acceptance: restart with a saved note and older tags in history; confirm all saved footer slots appear on the first K-Plex surface, the center never changes to an older tag, and displayed children stay visible through unchanged preview replacement while siblings arrive later. Then delete a saved center in a disposable vault and confirm fallback still works after readiness. Repeat on macOS/mobile and with multiple restored Plex views.
