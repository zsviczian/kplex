# K-Plex architecture

This records the boundary being built by the [refactor plan](../Refactor%20plan.md). E00 adds the first production presentation seam under `src/core/contracts/`, `src/core/plex/` and `src/adapters/obsidian/`; the graph, indexing, lens and most UI runtime still live in the legacy paths. A passing architecture check proves only the migrated roots and their reachable imports are host-clean, not that the remaining graph or UI is host-independent.

```mermaid
flowchart TB
  main["Obsidian main.ts / composition"] --> host["adapters/obsidian"]
  main --> app["application"]
  main --> features["ui/features"]
  host --> app
  host --> graph["core/graph"]
  features --> app
  features --> plex["core/plex"]
  features --> components["ui/components"]
  app --> plex
  app --> graph
  plex --> graph
  graph --> contracts["core/contracts"]
  features --> lang["lang"]
  host --> lang
```

Arrows mean **may import**, not call direction. A capability interface belongs in the lowest layer that needs it. For example, an application navigation port is defined by application code and implemented by the Obsidian adapter; application code does not import that adapter. React feature content may use a graph read contract but may not classify relationships again. Portable components may use React and standard DOM APIs but not Obsidian, domain policy or plugin state.

| Layer | Owns | May depend on |
| --- | --- | --- |
| `src/lang/` | English source catalog and host-free typed lookup/formatting | Lang only |
| `src/core/contracts/` | Small shared host-free values when actually needed | Itself |
| `src/core/graph/` | Identities, evidence, source compilation, relationship meaning, queries | Graph and contracts |
| `src/core/plex/` | Projection policy, predicates, pure layout strategies and semantic-to-physical gate mapping | Plex, graph and contracts |
| `src/application/` | Use cases, revisions, intent coordination and narrow host ports | Application and core |
| `src/ui/components/` | Domain-independent React interaction mechanics | Components, React and ReactDOM |
| `src/ui/features/` | Portable feature presentation | Features, components, application, core, lang, React and ReactDOM |
| `src/adapters/obsidian/` | Vault/source collection, writes, storage, native shells and lifecycle binding | Other layers, lang and Obsidian |
| `src/main.ts` | Plugin lifecycle and composition | Other layers and Obsidian |

The checker walks static imports and re-exports, type-only imports, literal `import()` types, literal dynamic imports and `require()` calls, resolving aliases through `tsconfig.json`. It rejects unresolved/nonliteral loading, forbidden host imports/globals, Obsidian DOM helper calls and wrong-direction edges in migrated layers. A portable root cannot import an unmigrated legacy file: migrate or introduce a narrow host-free contract first. Adapter-to-core imports are allowed. New layer cycles fail. The real `npm run build` remains necessary for full TypeScript and Obsidian-type validation; the checker does not prove runtime portability, behavior or a working second host.

No grandfathered migrated edges exist. E00 contributes four migrated production roots: the host-free presentation contract, pure routing/profile policy, pure Obsidian fact classifier and Obsidian presentation adapter. Legacy `src/index/`, `src/lens/`, most of `src/ui/` and `src/settings.ts` still have Obsidian coupling. `src/ui/viewProfile.ts` is a compatibility facade over the migrated profile selector and is intended to retire with the remaining migration facades at C25. C03–C05 migrate UI mechanics; C08–C20 migrate graph, application and Plex contracts; C21–C24 move intent and host shells. Record any temporary exact-edge exception with its reason and retirement checkpoint before adding it; the current checker has no such exception mechanism.

| New feature | First owner and check |
| --- | --- |
| Relationship source or ontology rule | Obsidian adapter collects facts; graph compiler/resolver owns meaning and evidence. Compare canonical declarations and decisions. |
| Shared URL referrers | Source records preserve each declaring note for one URL identity; graph read contracts retain all relationships. Showing multiple referrers around a centered URL is [feature request #26](https://github.com/zsviczian/kplex/issues/26), outside refactor scope. |
| Search or lens operator | Graph read/query or Plex predicate contract; preserve ranking/filter ordering and lazy property reads. |
| Condensed, expanded, rotated or mindmap view | Projection policy decides included semantic nodes; layout strategy maps roles to positions/gates. Mode changes must not rebuild graph semantics. |
| Toolbar action or modal | Portable component/feature for reusable interaction, application intent for action, native shell for Obsidian workspace or Vault effects. |
| Device-dependent action or shortcut hint | Host adapter supplies device/input/OS facts and available actions; portable presentation selects applicable affordances and formats catalog copy from the actual shortcut. |
| Another PKM host | A new adapter implements existing narrow ports and supplies normalized facts; no host-specific parsing of opaque core IDs. |

The localization boundary now has an English source catalog and typed translator under `src/lang/`. `src/adapters/obsidian/localization.ts` reads the host language with Obsidian's typed `getLanguage()` export and constructs the translator; missing locales/keys fall back to English. Portable feature presentation can receive/use the translator without importing Obsidian. Core graph semantics do not import UI translations. L00 migrates only representative production copy; L01 will enforce catalog use for all remaining plugin-owned user-facing copy. Console diagnostics remain English, and no non-English translation is part of this refactor.

The environment boundary is established by E00. `src/core/contracts/presentationEnvironment.ts` defines host-free device, key-convention, input-mode and host-action facts; `src/core/plex/viewPresentation.ts` owns pure command/routing decisions and the explicit `phone` → persisted `mobile` layout-key mapping. `src/adapters/obsidian/presentationEnvironmentFacts.ts` holds the pure Obsidian flag/viewport classifier, and `src/adapters/obsidian/presentationEnvironment.ts` reads those facts at the host boundary. `src/main.ts` composes a fresh environment when routing commands/views or selecting profiles, so there is no process-wide mutable platform singleton. Existing desktop/tablet/phone command and layout behavior remains the production policy, while graph semantics, indexing and iOS memory policy stay outside this presentation contract. Mobile keyboard presence is reported as `unknown` when the host cannot detect an attached keyboard; future shortcut hints must not treat that as a confirmed absence. L00 pairs catalog copy with `src/core/plex/shortcutPresentation.ts`, which formats the actual shortcut convention, such as Command/Option on macOS or Control/Alt on Windows. A future host supplies its own environment facts and available actions. Device class does not imply keyboard, pointer, touch or pop-out support; physical phone/tablet checks remain separate from desktop emulation.

Run `npm run verify` before review. It runs architecture self-tests/checker, the restricted host-free core type/runtime lane, official Obsidian ESLint, the aggregate behavioral tests and the production build. `npm run verify:obsidian` is a separate, strict, explicitly configured exact-build test-vault lane; it is not part of portable CI.

## C08 graph contracts

`src/core/graph/model.ts` introduces an exact opaque `NodeId` and a readonly `GraphNodeView` with explicit kind/resolution and optional plain file metadata. Core must not infer paths, case rules or kind from an ID. `src/core/graph/settings.ts` describes only the values used by today's legacy semantic-index signature; presentation metadata still present in that signature is separated in C18 rather than reinterpreted in C08.

`src/adapters/obsidian/graphContracts.ts` maps a legacy `GraphPage` or settings object at the host boundary. Mapping one node is bounded: it creates a small view/file facet and shares existing metadata arrays through readonly types. These types do not freeze legacy data or establish revision guarantees. C09 must bind view validity to the repository's publication boundary before a production consumer adopts them. No current production consumer uses this adapter yet; legacy graph identity, settings persistence and snapshot schemas remain authoritative and unchanged. `check:core` covers all core `.ts`/`.tsx` files with ES2021 only and no DOM/Node ambient types; clean-process runtime tests exercise opaque IDs, while adapter tests cover every legacy node kind and the narrow settings mapping.
