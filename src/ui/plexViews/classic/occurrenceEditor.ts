/** Compass occurrence identity and measured native-editor footprint. The existing Classic
 * layout still owns geometry; shared bindings/native lifecycle own document content. */
import type {PlexEditorBinding} from "../../../application/PlexEditorBindings";
import type {GraphPage, Neighborhood, PositionedNode} from "../../../types";
import type {HostPlexScene} from "../scene";

export type ClassicEditorLayout = Readonly<{binding: PlexEditorBinding; page: GraphPage}>;

/** Section-owned note copies retain canonical identity; headings and groups never bind editors. */
export function classicEditorIdentity(node: Pick<PositionedNode, "page">): string | null {
  return !node.page.transient ? node.page.path : node.page.transient.kind === "section-target" ? node.page.transient.actualPath ?? null : null;
}
/** Role plus current center distinguishes duplicate notes in different Compass areas without
 * relying on array positions, coordinates or a second relationship classification. */
export function classicEditorKey(node: Pick<PositionedNode, "page" | "role">, center: string): string | null {
  const identity = classicEditorIdentity(node);
  const key = identity ? JSON.stringify(["classic-editor", center, node.role, identity]) : null;
  return key && key.length <= 4096 ? key : null;
}
/** Override only this exact occurrence's measured rectangle before existing area packing. */
export function measureClassicEditor(node: PositionedNode, center: string, editor?: ClassicEditorLayout): void {
  if (editor && classicEditorKey(node, center) === editor.binding.occurrenceId && node.page.file === editor.page.file)
    Object.assign(node, editor.binding.dimensions);
}
/** Bind only an unambiguous real displayed occurrence. Canonical edge paths/evidence remain
 * unchanged; physical endpoints follow the same actual node chosen by the Classic renderer. */
export function bindClassicEditor(scene: HostPlexScene, center: string, editor?: ClassicEditorLayout): HostPlexScene {
  if (!editor) return scene;
  const candidates = scene.nodes.filter(node => classicEditorKey(node, center) === editor.binding.occurrenceId
    && classicEditorIdentity(node) === editor.binding.target.nodeId && node.page.file === editor.page.file);
  if (candidates.length !== 1) return {...scene, boundEditors: []};
  candidates[0].occurrenceId = editor.binding.occurrenceId;
  const endpoint = (path: string, role?: string): PositionedNode | undefined => {
    const rows = scene.nodes.filter(node => node.page.path === path);
    return rows.find(node => role && node.role === role) ?? rows[rows.length - 1];
  };
  for (const edge of scene.edges) {
    const source = endpoint(edge.sourcePath, edge.sourcePath === center ? "center" : undefined);
    const target = endpoint(edge.targetPath, edge.isCrossLink ? undefined : edge.role);
    if (source?.occurrenceId) edge.sourceOccurrence = source.occurrenceId;
    if (target?.occurrenceId) edge.targetOccurrence = target.occurrenceId;
  }
  return {...scene, boundEditors: [editor]};
}
/** Filter reflow cannot discard the live native document's exact canonical role occurrence. */
export function retainClassicEditor(original: Neighborhood, filtered: Neighborhood, binding?: PlexEditorBinding): Neighborhood {
  if (!binding) return filtered;
  const fields = {parents: "parent", children: "child", leftFriends: "left", rightFriends: "right", siblings: "sibling"} as const;
  const next = {...filtered};
  for (const field of Object.keys(fields) as Array<keyof typeof fields>) {
    const shown = new Set(filtered[field]);
    next[field] = original[field].filter(row => shown.has(row)
      || JSON.stringify(["classic-editor", original.center.path, fields[field], row.page.path]) === binding.occurrenceId);
  }
  return next;
}
