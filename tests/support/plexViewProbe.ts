/** Test-only non-Classic consumer. Never imported by the production registry or selector. */
import type {PlexViewDefinition, PlexProjection} from "../../src/core/plex/views/contracts";
import {nodeId} from "../../src/core/graph/model";

/** Three arbitrary areas, repeated canonical identity, separate root/attention and a decorative connector. */
export function createProbeViewDefinition(paths: {root: string; repeated: string} = {root: "Root.md", repeated: "Repeated.md"}): PlexViewDefinition {
return {
  id: "test.situated", version: 1, labelKey: "Situated probe", icon: "orbit",
  capabilities: {sections: false, descendants: false, editor: true, compact: false}, defaultState: null,
  configuration: {version: 1, fields: {ridgeOffset: {defaultValue: 0,
    validate: value => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 50}}},
  restoreState: value => value && typeof value === "object" ? value : null,
  project(input): PlexProjection | null {
    const attention = input.read.node(input.attention), root = input.read.node(nodeId(paths.root)), repeated = input.read.node(nodeId(paths.repeated));
    if (!attention || !root || !repeated || !input.read.isCurrent()) return null;
    const relation = input.read.relations(root.id, "child").items.find(row => row.node.id === repeated.id);
    return {attention: attention.id, layoutRoot: root.id, entry: "look-here", editor: "look-here", frame: "look-here", coverage: input.read.coverage,
      truncated: false, occurrences: [
        {id: "look-here", nodeId: attention.id, areaId: "harbor", representation: "thought"},
        {id: "layout-root", nodeId: root.id, areaId: "ridge", representation: "thought", ports: {left: "child"}},
        {id: "repeat-above", nodeId: repeated.id, areaId: "grove", groupingPartition: "upper", representation: "thought", ports: {right: "parent"}, role: "child", relation},
        {id: "repeat-below", nodeId: repeated.id, areaId: "harbor", groupingPartition: "lower", representation: "thought", role: "child", relation},
      ], edges: [
        {id: "guide", kind: "decorative", source: "layout-root", target: "look-here", sourcePort: "top", targetPort: "left"},
        ...(relation ? [{id: "real-child", kind: "semantic" as const, source: "layout-root", target: "repeat-above", sourceNode: root.id,
          targetNode: repeated.id, sourcePort: "left" as const, targetPort: "right" as const, relation}] : []),
      ]};
  },
  layout(projection, measurements, _preferences, _editor, context) {
    const coordinates = {"look-here": {x: 190, y: 70}, "layout-root": {x: -180, y: 40}, "repeat-above": {x: 70, y: -170}, "repeat-below": {x: 260, y: 180}, "extra-above": {x: 150, y: -170}};
    return {positions: new Map(measurements.map(measured => {
      const occurrence = projection.occurrences.find(row => row.id === measured.id)!;
      const members = occurrence.synthetic?.members.map(id => coordinates[id as keyof typeof coordinates]).filter(Boolean) ?? [];
      const point = coordinates[measured.id as keyof typeof coordinates] ?? {x: members.reduce((sum, row) => sum + row.x, 0) / members.length,
        y: members.reduce((sum, row) => sum + row.y, 0) / members.length};
      const offset = context?.configuration?.status === "available" ? Number(context.configuration.values.ridgeOffset) : 0;
      return [measured.id, {...point, x: point.x + (measured.id === "layout-root" ? offset : 0), width: measured.width, height: measured.height}];
    })), areas: [
      {id: "harbor", labelKey: "Harbor", bounds: {x: 100, y: 0, width: 300, height: 300}},
      {id: "ridge", labelKey: "Ridge", bounds: {x: -300, y: -40, width: 260, height: 240}},
      {id: "grove", labelKey: "Grove", bounds: {x: -30, y: -250, width: 260, height: context?.areaHeights.groveHeight ?? 160}, heightPreference: {key: "groveHeight", minimum: 120, maximum: 360}, resizeEdge: "bottom",
        viewport: {x: -30, y: -230, width: 260, height: Math.max(72, (context?.areaHeights.groveHeight ?? 160) - 40), contentTop: -260, contentHeight: 300, initialScrollTop: 30},
        reflow: {columns: 1, rowGap: 10, columnGap: 12}},
    ]};
  },
};
}

/** Default finite IDs are local to isolated browser/unit fixtures. */
export const probeViewDefinition = createProbeViewDefinition();
