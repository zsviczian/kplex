/** Exact displayed-occurrence/native-document admission. Geometry never substitutes attention or a duplicate.
 * The native host supplies file-format eligibility; this boundary retains canonical/native incarnation checks. */
import type {PlexEditorBinding} from "../../application/PlexEditorBindings";
import type {PlexProjection, PlexViewDefinition, PlexViewRead} from "../../core/plex/views/contracts";
import type {GraphPage} from "../../types";
import {actionNodeRef} from "../../adapters/obsidian/actionNode";

export type OccurrenceEditorHost = Readonly<{bindings: readonly PlexEditorBinding[];
  /** The native owner verifies current Vault identity and supported native document representation. */
  supports: (page: GraphPage) => boolean}>;
export type AdmittedOccurrenceEditor = Readonly<{binding: PlexEditorBinding; page: GraphPage}>;

/** Reacquire the exact canonical/native incarnation without reading content or borrowing an alias after rename. */
export function resolveOccurrenceEditorPage(binding: PlexEditorBinding, source: {get: (id: string) => GraphPage | undefined},
  supports: (page: GraphPage) => boolean): GraphPage | null {
  const page = source.get(binding.target.nodeId), reference = page && actionNodeRef(page);
  return page && !page.transient && page.file && reference?.kind === "file"
    && reference.identity === binding.target.nodeId && page.file.path === binding.target.path
    && reference.fileIdentity === binding.target.fileIdentity && supports(page) ? page : null;
}

/** Pure/cache-only checks followed by a narrow native eligibility proof; no file reads or acquisition. */
export function admitOccurrenceEditors(definition: PlexViewDefinition, projection: PlexProjection, read: PlexViewRead,
  source: {get: (id: string) => GraphPage | undefined}, host?: OccurrenceEditorHost): ReadonlyMap<string, AdmittedOccurrenceEditor> {
  const admitted = new Map<string, AdmittedOccurrenceEditor>();
  if (!host?.bindings.length) return admitted;
  if (definition.editorHosting === undefined || host.bindings.length > 1) throw new Error("Unsupported editor binding host");
  for (const binding of host.bindings) {
    const occurrences = projection.occurrences.filter(row => row.id === binding.occurrenceId);
    const occurrence = occurrences[0];
    if (occurrences.length !== 1 || !occurrence.nodeId || occurrence.synthetic || occurrence.section || occurrence.representation !== "thought"
      || binding.viewId !== definition.id || occurrence.nodeId !== binding.target.nodeId || !read.node(occurrence.nodeId)) {
      throw new Error("Unavailable bound editor occurrence");
    }
    const page = resolveOccurrenceEditorPage(binding, source, host.supports);
    if (!page) throw new Error("Unavailable bound editor document");
    if (admitted.has(binding.occurrenceId)) throw new Error("Duplicate editor binding occurrence");
    admitted.set(binding.occurrenceId, {binding, page});
  }
  return admitted;
}
