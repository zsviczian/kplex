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

## Private evidence and source references

Runtime/tests/tooling checkpoint: `e8e8814744ebc8eb1beb43a8674a5951b91be9be`.
The receipts also record hashes of the exact dirty integrated source used for the
build. Reproduction uses the existing native hover command and explicit Small-vault
variables documented in CONTRIBUTING; build/stage the real plugin first.

Verified durable backup, outside temporary storage:
`%LOCALAPPDATA%/KplexValidation/alt-hover-crosslinks-181-20261018-1792348500765`.
38 files / 8,645,196 bytes; raw receipts, both native runs, initial failed fixture
and negative controls, exact built artifacts and source ZIP. Copy hashes match the
originals; ZIP 545 entries pass CRC and per-file SHA-256 verification. HANDOFF and
temporary scripts containing it are excluded. Manifest SHA-256:

```text
381e9879634ca0a01b5f04df9bf08af2b39bb4fa7aad8d98188a9321931d95c8
```

Originals remain intact in temporary storage. Evidence includes disposable-vault
configuration/local metadata and remains private; no archive was published.
The maintainer requested completion then pause for their own testing/merge;
PR181 stays draft. CI may run asynchronously; no final CI-green claim is made here.

## Child-gate tooltip follow-up

The maintainer reported that the child-gate hint obstructed the graph below it.
Gates already declared `data-tooltip-position="top"`; the shared tooltip owner
ignored it. That owner now honors the top preference, with the existing viewport/
canvas-boundary fallback when above cannot fit. Other unmarked controls retain
their placement policy. Delay, modifier gating and accessibility are unchanged.

Eight tooltip Chromium tests pass, including preferred-above placement despite
available space below and fallback at the top edge. Full Obsidian lint, real build
and exact staging1792349032305 pass. The existing node-only native tooltip lane
1792349051302 passes8 scenarios, now asserting child-gate hints above in main,
popout and returned-main views, with actual Settings opt-out/on. Configuration and
workspace restore; sanity1792349085739 repeats107files/88Markdown, no dialogs/
controllers and captureoff. This focused follow-up does not rerun or supersede
the earlier crosslink matrix. Raw receipts remain private in Temp; the earlier
verified backup remains unchanged. No next PR, merge or release.

New installed main SHA-256 (CSS/manifest unchanged):
`f40ff506c3a8990c98493d46b77ef1e4cebdb219085ed3a278812d0f1bc19a0d`.
