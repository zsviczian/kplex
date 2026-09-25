# K-Plex architecture

This records the boundary being built by the [refactor plan](../Refactor%20plan.md). As of C02a, production still runs from `src/main.ts`, `src/index/`, `src/lens/`, `src/ui/` and `src/settings.ts`. None of the proposed portable directories contains production modules yet. The checker guards files added there; its current zero-root pass is not evidence that today's graph or UI is host-independent.

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
```

Arrows mean **may import**, not call direction. A capability interface belongs in the lowest layer that needs it. For example, an application navigation port is defined by application code and implemented by the Obsidian adapter; application code does not import that adapter. React feature content may use a graph read contract but may not classify relationships again. Portable components may use React and standard DOM APIs but not Obsidian, domain policy or plugin state.

| Layer | Owns | May depend on |
| --- | --- | --- |
| `src/core/contracts/` | Small shared host-free values when actually needed | Itself |
| `src/core/graph/` | Identities, evidence, source compilation, relationship meaning, queries | Graph and contracts |
| `src/core/plex/` | Projection policy, predicates, pure layout strategies and semantic-to-physical gate mapping | Plex, graph and contracts |
| `src/application/` | Use cases, revisions, intent coordination and narrow host ports | Application and core |
| `src/ui/components/` | Domain-independent React interaction mechanics | Components, React and ReactDOM |
| `src/ui/features/` | Portable feature presentation | Features, components, application, core, React and ReactDOM |
| `src/adapters/obsidian/` | Vault/source collection, writes, storage, native shells and lifecycle binding | Other layers and Obsidian |
| `src/main.ts` | Plugin lifecycle and composition | Other layers and Obsidian |

The checker walks static imports and re-exports, type-only imports, literal `import()` types, literal dynamic imports and `require()` calls, resolving aliases through `tsconfig.json`. It rejects unresolved/nonliteral loading, forbidden host imports/globals, Obsidian DOM helper calls and wrong-direction edges in migrated layers. A portable root cannot import an unmigrated legacy file: migrate or introduce a narrow host-free contract first. Adapter-to-core imports are allowed. New layer cycles fail. The real `npm run build` remains necessary for full TypeScript and Obsidian-type validation; the checker does not prove runtime portability, behavior or a working second host.

No grandfathered migrated edges exist at C02a. Legacy `src/index/`, `src/lens/`, `src/ui/` and `src/settings.ts` still have Obsidian coupling. C03–C05 migrate UI mechanics; C08–C20 migrate graph, application and Plex contracts; C21–C24 move intent and host shells. Record any temporary exact-edge exception with its reason and retirement checkpoint before adding it; the current checker has no such exception mechanism.

| New feature | First owner and check |
| --- | --- |
| Relationship source or ontology rule | Obsidian adapter collects facts; graph compiler/resolver owns meaning and evidence. Compare canonical declarations and decisions. |
| Shared URL referrers | Source records preserve each declaring note for one URL identity; graph read contracts retain all relationships. Showing multiple referrers around a centered URL is [feature request #26](https://github.com/zsviczian/kplex/issues/26), outside refactor scope. |
| Search or lens operator | Graph read/query or Plex predicate contract; preserve ranking/filter ordering and lazy property reads. |
| Condensed, expanded, rotated or mindmap view | Projection policy decides included semantic nodes; layout strategy maps roles to positions/gates. Mode changes must not rebuild graph semantics. |
| Toolbar action or modal | Portable component/feature for reusable interaction, application intent for action, native shell for Obsidian workspace or Vault effects. |
| Device-dependent action or shortcut hint | Host adapter supplies device/input/OS facts and available actions; portable presentation selects applicable affordances and formats catalog copy from the actual shortcut. |
| Another PKM host | A new adapter implements existing narrow ports and supplies normalized facts; no host-specific parsing of opaque core IDs. |

The localization boundary is planned, not implemented yet: L00 will provide English language files and a typed translation capability to React features and Obsidian shells. The host supplies the language; core graph semantics do not import Obsidian or UI translations. L01 will enforce catalog use for all plugin-owned user-facing copy. Console diagnostics remain English, and no non-English translation is part of this refactor.

The environment boundary is also planned. Existing Obsidian UI already distinguishes desktop, tablet and phone for view profiles and command routing; its persisted phone profile key is `mobile`. E00 will preserve that behavior while moving device, OS/key convention, input capability and host-feature facts behind a narrow adapter-provided presentation contract. Portable UI may use those facts to select available actions and present correct instructions, but graph semantics and pure layout do not inspect Obsidian platform globals. L00 will pair translated copy with a formatter for the actual shortcut convention, such as Command/Option on macOS or Control/Alt on Windows. A future host supplies its own environment facts and available actions. Device class does not imply keyboard, pointer, touch or pop-out support; physical phone/tablet checks remain separate from desktop emulation.

Run `npm run verify` before review. It runs architecture self-tests/checker, official Obsidian ESLint, the aggregate behavioral tests and the production build. `npm run verify:obsidian` is a separate, strict, explicitly configured exact-build test-vault lane; it is not part of portable CI.
