# Ontology descriptions — implementation brief

**Implemented in PR #239; validation tracked in the PR.** The implementation extends the existing ontology settings and writer. See [the user guide](../ONTOLOGY_PAIRS.md) and the internal contract below. Native and device evidence must be reported separately; implementation alone is not acceptance.

## Goal
Let users write a short optional **description** for each configured ontology field explaining its meaning and appropriate usage. Display/edit in existing **Manage ontology** and **Add/change ontology** UIs and display descriptions within ontology suggesters, including connection ontology and inverse pair field selection. These descriptions will later help AI agents select the right Markdown relationship.

## Data/semantics
- Store descriptions **per physical field name**, not per direction, pair, inferred connector or display label. Each endpoint of an inverse pair can have its own wording. Description is authored text: never inferred from the name or synthesized by AI.
- Optional plain text bounded to 1,000 UTF-16 code units, matching native textarea `maxLength`. Preserve existing field names/escapes, role semantics and reciprocal pairing. Missing description on older settings means absent, without changing graph behavior.
- Role or pair changes retain descriptions for unchanged physical field identities; deleting an ontology assignment only changes its own configured description/definition, never note frontmatter or body.
- Extend the existing **versioned settings owner and serialized writer**, with compatible migration and no second settings model; preserve pending write conflicts and incoming cross-device settings.
- A description-only edit must change only the presentation/configuration projection and **not trigger semantic rebuilds, source work or Markdown reads**. Explicit Save/Cancel and atomic paired changes.
- Keep current native field editor/manager/suggester components, visible names and partner roles. Suggester displays concise descriptions beneath names (truncate visually, accessible full content); preserve search, keyboard use, mobile/popout and translations (UI labels localized; authored text remains literal).
- Offer editing independent descriptions of newly created and existing paired endpoints without accidentally overwriting partner data.

## API handoff
Expose a *pure internal read projection* of configured ontology fields (physical name, role, inverse partner, own description, configured vs discovered state) reusable by subsequent API PR. Do **not** publish a public GraphQL/CLI endpoint here.

`src/core/contracts/ontologyReadModel.ts` exports `ontologyReadModel(configuration, descriptions, discovered)` and bounded description helpers. The caller supplies the existing decoded configuration and any already available discovery inventory; the projection performs no discovery or graph reads. Entries retain exact physical names, established normalized assignment identity, all retained roles, inverse partner/role, own optional description and configured/discovered flags.

`settings.ontologyDescriptions` is an additive dictionary keyed by exact physical names. Old settings load an empty dictionary; invalid entries remain inert and oversized loaded text is bounded. This does not change ontology pairing version 1, semantic signatures, parser grammar or index/cache schemas. Descriptions are excluded from graph settings policy. The existing serialized ontology writer accepts hierarchy and description edits atomically, fences opening endpoint values and incoming owners, then notifies vocabulary presentation directly for a description-only change. Incoming description-only settings similarly use the existing notification path without graph refresh. Failed storage retains the draft; a durable save with failed notification reports saved/pending.

## Acceptance
- Create, edit, clear, reload and sync descriptions with save/cancel/error behavior.
- Both inverse fields may have distinct descriptions; all suggesters display relevant text while preserving current field ranking and keyboard selection.
- Existing vaults/migrations and note contents unchanged; zero extra indexing or reading on description updates; tests protect semantic revision.
- Real types, build, scanner, architecture and focused UI/native regression checks.

**Related:** [ontology pairs](../ONTOLOGY_PAIRS.md) and forthcoming public agent API. No note CRUD, no automatic LLM suggestion, no unrelated ontology redesign.
