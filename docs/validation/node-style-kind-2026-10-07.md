# Creating property-value and tag-prefix node styles

The reported Add style form had no tag-style creation path. Existing tagNodeStyles could be
edited, but Add always saved a noteTypeStyles entry. Vault tag hints were displayed with a hashtag
and selected without it because that form was in property mode. Live small-vault inspection
confirms8 tag styles,0 property styles and no selector in the Add form. An initial probe used the
wrong modal document/close selector; subsequent capture used the owning settings document and
closed all opened dialogs without saving.

The shared editor now offers Style type: Property value or Tag prefix for creation. Existing styles
show their fixed family. Switching the new style's type updates help/labels/placeholder/suggestions
without reconstructing appearance controls. New/renamed tag prefixes accept a name with or without
its hashtag and save exactly one #; empty/bare# prefixes cannot save. Property input retains its
existing normalization. Suggestions collect both families in one indexed-page pass; tag-mode hints
contain only tags/configured prefixes and retain # upon selection.

Tag saves use the existing tagNodeStyles dictionary and tagStyleList order. New prefixes append;
renaming preserves the existing matching slot. Unchanged imported keys/alpha/order are preserved.
Property styles stay in noteTypeStyles, and same-name styles in the other family remain independent.
Save/delete reacquire current settings. The existing primary-style-tag prefix matcher and property
override precedence are unchanged; no second resolver, note-body scan, schema change or new semantic
index behavior is introduced. No C15–C26 work.

The existing strict localization contract requires all styles.* entries in every bundled locale.
Catalog changes add two captions and replace imported-only wording with general tag-style wording;
parameter names/fallback policy stay unchanged.

Main reviewed the implementation and focused form/migration regression return. First full verification
passed on frozen278 inputs `185ed888…` (7/69/296/18/333/410, scanner0errors/one existing warning,
real build). Exact first main `8230b08d…` passed native smoke and tag creation/property creation/
suggestions/hash validation/locked tag rename. Unchanged imported-tag Save then failed exact
storage equality: a missing prefix became an empty string. This failed native attempt is retained,
not an accepted pass. Settings/enablement bytes were restored. Immediate cleanup saw1 editor;
subsequent Cancel and independent audit found0 editors/managers/controllers. Final harness waits
for actual retirement rather than inferring it from a close request.

Main corrected draft serialization to add the prefix override only when the input changed. An
unchanged absent prefix remains inherited; existing explicit prefixes stay via the initial spread,
and clearing a nonempty prefix still saves empty text.21 focused form/migration regressions pass,
including exact storage equality and actual resolver inheritance. Independent read-only review
approved the correction. Final frozen 278 inputs `65d4c667456f8ab87034ae8492e847cd7280eff8281e6f34d80cf61324dc1ea7`
passed complete `npm run verify` on Node22.22.2: architecture7/core69/Node297/UI18/portable333/
browser410; no browser failures/skips/cancellations, scanner0errors/one unchanged activeLeaf
deprecation warning, actual installed-types production build. The mandatory20,015-owner publication
case passed in271.810s. Exact main.js `236399f5df626eb52286bbe00ca62107a295b4345b2ef81e8e50e397a206c5cc`
passed serial native smoke on Obsidian1.14.4(installer1.14.0), with registered command, rendered
K-Plex and no captured JavaScript errors. Installed and built artifact hashes match.

Final native acceptance in kplex-test-small passed all four real-form scenarios: tag creation and
draft retention, actual tag suggestion selection/hashtag validation, independent property creation,
locked tag editing/normalized rename with retained priority, and unchanged imported-style Save.
Original settings and enabled-plugin bytes were restored exactly; dialogs/controllers/wrappers
were removed/restored. No notes were modified. The tested final build remains deployed there.

A second native attempt passed functional checks/cleanup but failed a temporary diagnostic asserting
zero graph notifications (27 observed). That failed attempt remains recorded. Source review showed
existing On-demand render-settings refresh recomposes local scopes and publishes notifications;
subscribe events are not a full-build counter. Independent offline read-only review agrees. Final
native attribution directly observed zero rebuild/rebuildProgressively/plugin.rebuildIndex calls
and unchanged semantic policy, retaining27 notifications descriptively. Production source, regression
oracles and bounds were not changed for this attribution correction. The full suite retains its
stronger portable settings-independence assertions; native acceptance claims no full-index rebuild
or policy invalidation, not zero local graph work.

Desktop functional acceptance is complete. Physical-device touch, community-theme coverage and
performance/paint timing were not measured or claimed. No additional runtime/test changes followed
the final source freeze; documentation-only closeout rechecks that identity.
The [evidence](node-style-kind-2026-10-07.json) will record exact results and limitations.
No Git action requested in this feature round; production vault is untouched.
