# PR #278: creation CTA and Pins spacing follow-up

The later [source-gate/Link/recovery follow-up](source-gate-recovery-diagnostics-278-2026-11-04.md)
records subsequent changes; results below retain their original artifacts.

Uncommitted on `2026-11-03-issue-277-creation-links-compass`, base `c0e6166`.
This follows the [shared UI validation](ui-harmonization-278-2026-11-04.md).

The remembered Markdown/Excalidraw action now uses native Obsidian `mod-cta`,
including while the name is empty and the button is disabled. Removed duplicate
custom CTA paint. The remembered shortcut/default selection and placeholder
behavior are unchanged. A Pins compact-row flex basis was overriding the shared
stacked field layout, turning horizontal widths into several hundred pixels of
vertical height. Compact row rules now exclude stacked fields and preserve the
existing toggle overrides. UI_RULES documents both requirements.

## Validation

- Before the fix: three focused regression cases failed for the missing disabled
  CTA and stacked field flex basis at 360/760 px. An initial fixture variable-name
  collision was corrected before that reproduction; it is not product evidence.
- Focused authoring/composer/UI ownership: **86/86** passed. Follow-up authoring,
  numeric Settings, periodic pins and lifecycle: **40/40** passed. The two commands
  overlap and must not be presented as 126 distinct cases.
- Official lint and production build with installed Obsidian types passed under
  Node 22.22.2. No new indexing aggregate was run for these UI-only changes;
  the earlier 3,980-case result retains its original artifact attribution.
- Native Controls receipt `UIFl8E`: both remembered types visibly accented while
  disabled and enabled, primary/shortcut agreement, no placeholder promotion,
  existing native input/dropdown skin and footer alignment checks passed.
- Native Pins receipt `gGpq78`: real declarative settings at 320/480/requested760
  (available700) px, light/dark, intrinsic field heights/gaps/full widths,
  unclipped headings, dependency toggles, persistence and zero source reads passed.
- An earlier native attempt measured a still-settling content area; bounded layout
  readiness was added before strict measurements. Another attempt was interrupted
  by foregrounding the production window for the requested observation. Both
  failures and cleanup were retained; the uninterrupted serial rerun passed.

Both native lanes used disposable `kplex-test-small`, Obsidian 1.14.5, baseline
117 files/98 Markdown. Shared app lock, artifact hashes and exact configuration,
enablement/layout/fixture restoration passed. Screenshots of the primary action
and repaired Pins fields were directly reviewed. The Controls receipt used the
preceding stylesheet; its only later difference scopes compact Pins flex rules.
The final Pins receipt matches the delivered stylesheet. JSON preserves actual
hashes instead of relabeling those runs.

At **15:15:30 Budapest**, the authorized `main.js` and `styles.css` were copied to
Zsolt's Brain and hash-verified. No production reload, note/settings/workspace or
manifest writes were performed. The native test vault's data was restored. Mac
and physical-mobile acceptance remain separate.

Final artifacts:

- `main.js`: `cc921ffd89a735f01c0fa9b1181618f2e79686e42dd27d4d7c5cb0c8283984f7`
- `styles.css`: `25b9cfd2dfbc189ec9135567f6a01af32ad4404cf88fe83d1182a655b0adcb00`

The simultaneously requested [live indexing investigation](index-recovery-observation-2026-11-04.md)
remains unresolved; these UI fixes do not address cache-recovery churn or the
active-center dependency-admission gap.
