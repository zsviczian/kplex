# PR #278: source gate intent, Link footer and recovery diagnostics

Implemented uncommitted on `2026-11-03-issue-277-creation-links-compass`, base
`c0e6166`, following the [CTA/Pins follow-up](cta-pins-follow-up-278-2026-11-04.md).

## User-facing changes

A connection drag now takes its relationship category from the source gate. The
destination gate selects the target note and cannot invert that category. The
source's rendered ports remain authoritative in flipped Compass orientation;
legacy Compass fallback is mirrored too. A held Alt/Ctrl/Cmd/Shift on a lateral
gate selects Previous instead of Friend, or Next instead of Challenger. Parent
and Child remain unchanged. The existing six independent remembered ontology
defaults are retained; no persisted setting migration or semantic reclassification
was introduced. History/pin eligibility keeps its existing physical membership
groups while passing the full temporal role to the composer.

The Link footer now shrinks to Cancel and Link. Removed the old reserved width,
separate Link dimensions/paint and the in-flow hidden label that displaced its
glyph. Both buttons use the shared icon sizing and native primary-action style.
Drawing availability still controls whether creation offers Excalidraw; there are
no hidden creation-button placeholders in linking mode.

## Diagnostic changes

Both Index diagnostics and Report bug now contain a bounded, sanitized `recovery`
section with:

- demanded/incomplete centers, active preparation count, dependency-pending count,
  foreground leases and a waiting-for-sources flag;
- source dependency/local/warm/restart authority, environment/resolver blockers,
  pending owner/referrer counts and last invalidation category;
- the active/last inventory phase, outcome, visited/total owners, elapsed time and
  source/scope/host revision deltas; completed deltas freeze at pass settlement;
- the active/last snapshot writer phase, outcome, page/evidence chunk counts and
  a finite exception class, including DataCloneError, AbortError and quota errors.

Capture adds no source reads, inventory enumeration, retries, timers or persistence.
The retained receipts are fixed-size and contain no paths, ontology values, content,
raw exception messages or dynamic keys. Both export paths share the same privacy
projection and existing 32 KB bound. No schema, cache format or dependency change.

## Actual validation

- Focused UI/composer/Compass checks: **92/92 passed**, including remembered fields
  for all six directions and compact linking with drawing availability on/off.
- Report contract/privacy/activity/clipboard checks: **49/49 passed**.
- Real Chromium IndexedDB recovery diagnostics: **2/2 passed**. A structured-clone
  failure retained the old active generation and reported DataCloneError/pages;
  cancellation remained distinct and an actual retry activated successfully.
  A real unscoped resolver event cancelled an inventory and reported changed scope;
  repeated capture did no source work.
- Architecture: **9/9**, 262 migrated roots/465 reachable files, zero violations;
  numeric guard 211 sources. Portable core **133/133**, official lint and actual
  installed-type production build passed under Node 22.22.2.
- Native `gate-defaults` receipt **JHSI35**: **20 trusted cases** covering both
  lateral destination gates, Friend/Challenger, Ctrl Previous/Next, Parent/Child
  empty drops and normal/flipped Compass; actual composer category and per-role
  defaults matched, then Cancel preserved the notes.
- Native `controls` receipt **XlaWQt**: native skin/CTA checks, aligned compact
  Cancel/Link with centered glyph and no reserved gap, with drawing availability
  on/off. Native recovery capture acquired no sources or priority leases.
- Final serial indexing fixture passed: startup admission/convergence, settings
  independence, watchdog and assertions 1-68/P1-P17, including existing timer-gap
  performance guards. The full long aggregate was not rerun for this follow-up.
- Final visual receipt **qM4Jh8** passed after parking the cursor before comparing
  base native skins. An intermediate attempt compared a hovered ontology field
  with an unhovered reference; its failed sample was retained. No appearance or
  geometry assertion was weakened. The final compact linking footer was directly
  reviewed in native dark theme; equal-sized Cancel/Link are adjacent and centered.

Both native lanes used exact artifacts in disposable Small, Obsidian 1.14.5,
117-file/98-Markdown baseline, with shared lock and exact configuration, enablement,
layout and fixture restoration. Physical mobile and macOS input remain separate.
No long aggregate suite is claimed for this follow-up.

## Delivery

At **15:54:16 Budapest**, the authorized binaries were deployed/hash-verified in
Zsolt's Brain for Sync, with no reload or writes to notes, settings, workspace or
manifest. Receipt: `.test-work/brain-ui-deployment.json`; prior binaries backed up
under `.test-work/deploy-backups/`.

- `main.js`: `5047b3843cfb8bbcfcda85d80f7debbe7f05798cc814b6f1f54c4ce858bef9ab`
- `styles.css`: `3db644c65547eeb9c2cb4e4b244048fcf74044b5ee5349576cbf6d3c3aaa1aa3`

Frozen input inventory: 985 source/test/build files, SHA-256
`41dfe98917fa1fb4ba732dda7ce02d36ccf5af0397e2c9fb762ab9d5b27cfaa7`.
Native receipts above match these delivered binary hashes. Both exports now include
the recovery section after the updated plugin has been loaded; the previous live
production instance was not forcibly replaced during the maintainer's work.

## Indexing judgment

The [Mac/Windows observation](index-recovery-observation-2026-11-04.md) establishes
recovery churn and a dependency-admission gap. It does not isolate the storage
exception or every inventory cancellation producer. This follow-up improves those
facts without changing recovery, publication guards or scheduling behavior. It
must not be presented as a fix for the Mac heat/full-rebuild problem. A recovery
behavior change still needs a failing disposable-vault reproduction and evidence
that source/identity/publication safety and earlier performance gains survive.
