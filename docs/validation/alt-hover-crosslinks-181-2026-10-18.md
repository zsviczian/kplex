# Alt/Option crosslink preview — PR181

Implemented on `2026-10-18-alt-hover-crosslinks`. Merged main without rewriting
history; after the maintainer merged PR180, integrated `main@e95d3db` through
`7d0a014` and retargeted this draft to main. PR177 and PR180 behavior is retained.
No setting, command, schema, source/indexing change or new relationship classifier.

## Delivered behavior and boundaries

With Cross-links disabled, trusted mouse Alt/Option hover temporarily projects
eligible displayed crosslinks incident to the node, or the exact hovered physical
gate. Incoming endpoints keep the normal projection's ID, orientation and style.
Existing structural edges remain. With Cross-links enabled, the ordinary edge set
is retained without duplicates; matching edges receive the existing highlight.
Explicit previews remain visible at zero ordinary crosslink opacity and during Find.

The shared `HoverHighlight` owner publishes an optional modifier candidate only
for trusted mouse node/gate input. Stationary key transitions and held-key entry
work in both hover settings. Release restores the original ordinary-hover deadline;
leave, blur, document/native-leaf hiding, navigation, retired rows, gesture takeover
and teardown use the existing retirement path. Gate tooltips, area outlines and
connector hover do not opt into crosslink projection. No second listener/timer owner.

`appendVisibleCrossLinks` retains one edge factory and structural-pair deduplication.
The focused path visits the hovered adjacency and earlier incident endpoints to
preserve normal canonical orientation, rather than testing every displayed pair.
Unchanged key repeats do not query again. It uses the existing displayed persistent
endpoints and `visibleRelationshipsWithin` policy; it does not fetch neighbors,
change filters, add hidden nodes, scroll, fit or change the center. Section/transient
sources are excluded. Expanded mini-occurrences retain their existing separate
interaction policy; they do not acquire a connection-hover handler in this PR.

The transient edge list enters the existing lens/style/highlight/SVG pipeline.
Node geometry memos and semantic gate totals do not depend on the modifier. Extra
paths have no pointer hit target, avoiding hover oscillation. Only active-view
presentation changes; no setting or note write is part of the preview.

## Actual verification

Node **22.22.2**, installed dependencies and actual Obsidian types:

- 60 hover/layout/UI tests pass, including native CDP mouse/key input for the
  shared owner, independently specified gate/edge sets, canonical incoming
  orientation, bounded adjacency visits, filtering/clipping, synthetic/touch/pen
  exclusion, deadline restoration, mounted SVG/CSS, Find with zero opacity,
  native-leaf hiding and disposal. Mounted projection uses the actual production
  effects/memos/renderer around finite host inputs; it is not a complete native app.
- Two source-backed Chromium/IndexedDB tests pass in actual Eager and On-demand
  owner modes: published ontology adjacency, identical ordinary/focused edges,
  absent-endpoint exclusion, no reads/parses/publication/policy changes or semantic
  notifications. Host file/metadata APIs are explicit test doubles.
- 23 filtered-gate, tooltip and motion regressions; architecture 7/core 130;
  full Obsidian lint and real production build pass.
- Removing focused projection fails the mounted edge-set assertion. Removing the
  explicit Find highlight fails the mounted highlight assertion. Original runtime
  source was restored byte-for-byte after each control.
- An initial broader UI run passed 59/60: the rename rendering fixture lacked
  the new explicit null preview input. After correcting that test boundary, all
  60 pass. Earlier failed receipts remain private; no production failure is hidden.

Native **Windows 11 / Obsidian 1.14.4 (installer 1.14.0)**, Electron 43.3.0,
Chrome 150.0.7871.212, native Node 24.18.1; authorized `kplex-test-small` only.
Exact-build staging/smoke passed (`1792348138137`). This run intentionally performs
build/smoke only and must not be described as the complete `verify:obsidian` suite.

The final shared native hover lane (`1792348226865`) passes **11 scenarios**:
actual Settings durable on/off, existing main/popout node/gate/connector hover,
ordinary delay, disabled-crosslink node/four-gate/incoming previews in both modes,
independent main/popout preview and owning-window blur, and enabled-crosslink
deduplication. Trusted Electron movement/key input targets actual rendered controls.
Node DOM, geometry, camera and gate-count text stay unchanged across key transitions.

| Guarded native hover work | Modifier required | Ordinary delayed | Main/popout |
| --- | ---: | ---: | ---: |
| Vault read/cachedRead | 0 | 0 | 0 |
| Parser / source acquire | 0 / 0 | 0 / 0 | 0 / 0 |
| Semantic refresh / search preparation | 0 / 0 | 0 / 0 | 0 / 0 |
| Settings writes | 0 | 0 | 0 |

Fixture/preference setup is explicitly excluded: the final run records 20 reads,
13 acquisitions and 2 semantic refreshes; popout setup adds zero. These are functional
operation counts, not CPU, allocation, memory, latency or throughput comparisons.
No comparative performance test was run while the maintainer encoded video.

Final sanity `1792348322853` restores original **107 files / 88 Markdown**, settings/
workspace bytes, no dialogs/controllers, desktop mode and debugger capture off.
No personal-vault access, raw publication, release or merge of PR181.

Exact staged artifact SHA-256:

```text
main.js       dd01303b8b00cf001090e816af5d0dcbb32a5099dfd0ed7cc1fae3e587622d8f
styles.css    0135225519ad680cace5c7a35e8eab8388a3c6e6a8ead1a10a49f337324b106a
manifest.json 19d9ecce5557733e0ff0f2e27155e635c30158c3cfa6fbca0f11c16e4dedfd2c
```

## Remaining acceptance

At the maintainer's request, the complete `npm run verify` / `verify:obsidian`
campaign and combined matrix are deferred to PR147; focused success is not a full
platform acceptance. Highest-value remaining checks:

1. Native Keep/Reflow lenses, Quick lens/area filters, folded sections and expanded
   provenance with scrolling/clipping and structural sibling links.
2. Actual Eager native session, straight/curved connectors, arrow reversal/custom
   lens styles and both themes; trusted drag/pan/resize and live target retirement.
3. macOS Option/menu behavior, popout migration and physical phone/tablet regressions.

Preserve source/paint separation when extending this work. Broader reflow request
#20 and separate Settings-close freeze #179 remain outside this PR.
