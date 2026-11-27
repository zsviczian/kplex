import {nodeId, type GraphNodeView, type NodeId} from "../core/graph/model";
import {LinkDirection, RelationType, type Role} from "../core/graph/relations";
import type {PlexViewRead, PlexViewRelation} from "../core/plex/views/contracts";

const reverseRole = {parent: "child", child: "parent", left: "right", right: "left", previous: "next", next: "previous"} as const;
type PublishedRole = keyof typeof reverseRole;
export type PublicationFixture = Readonly<{
  version: 1;
  title: string;
  entry: string;
  nodes: readonly Readonly<{id: string; title: string; text?: string}>[];
  /** Already resolved relationship facts. The inverse uses the same role pairing as Compass. */
  relations: readonly Readonly<{source: string; target: string; role: PublishedRole; label?: string}>[];
}>;

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function text(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function relationshipRole(value: unknown): value is PublishedRole {
  return typeof value === "string" && Object.getOwnPropertyDescriptor(reverseRole, value) !== undefined;
}

/** Own the local fixture's incidence once. No corpus enumeration or source reads enter Compass. */
export function readPublication(value: unknown) {
  const fixture = record(value);
  if (fixture?.version !== 1) throw new Error("Unsupported publication fixture version");
  if (!text(fixture.title) || !text(fixture.entry) || !Array.isArray(fixture.nodes) || !Array.isArray(fixture.relations)) {
    throw new Error("Invalid publication fixture");
  }
  const nodes = new Map<string, GraphNodeView>();
  const bodies = new Map<NodeId, string>();
  const none: readonly string[] = Object.freeze([]);
  for (const value of fixture.nodes as unknown[]) {
    const row = record(value);
    if (!row || !text(row.id) || !text(row.title) || nodes.has(row.id) || (row.text !== undefined && typeof row.text !== "string")) {
      throw new Error("Invalid or duplicate publication node");
    }
    const id = nodeId(row.id);
    nodes.set(id, Object.freeze({id, name: row.title, kind: "document", resolution: "resolved", url: null,
      aliases: none, tags: none, styleTags: none, noteType: null, primaryStyleTag: null, maxLabelLength: 30}));
    if (typeof row.text === "string") bodies.set(id, row.text);
  }
  const entry = nodes.get(fixture.entry)?.id;
  if (!entry) throw new Error("Missing publication entry node");

  const adjacency = new Map<NodeId, Map<Role, PlexViewRelation[]>>();
  const add = (source: GraphNodeView, target: GraphNodeView, role: Role, direction: LinkDirection, definition?: string) => {
    let roles = adjacency.get(source.id);
    if (!roles) adjacency.set(source.id, roles = new Map<Role, PlexViewRelation[]>());
    let rows = roles.get(role);
    if (!rows) roles.set(role, rows = []);
    rows.push(Object.freeze({node: target, role, relationType: RelationType.DEFINED, direction, definition}));
  };
  const admitted = new Set<string>();
  for (const value of fixture.relations as unknown[]) {
    const row = record(value);
    if (!row || !text(row.source) || !text(row.target) || !relationshipRole(row.role) || (row.label !== undefined && typeof row.label !== "string")) {
      throw new Error("Invalid publication relationship");
    }
    const source = nodes.get(row.source), target = nodes.get(row.target);
    if (!source || !target) throw new Error("Missing publication relationship endpoint");
    const inverse = reverseRole[row.role];
    const key = JSON.stringify([source.id, row.role, target.id]);
    if (source === target || admitted.has(key)) throw new Error("Invalid or duplicate publication relationship");
    admitted.add(key);
    admitted.add(JSON.stringify([target.id, inverse, source.id]));
    add(source, target, row.role, LinkDirection.TO, row.label);
    add(target, source, inverse, LinkDirection.FROM, row.label);
  }
  const collator = new Intl.Collator("en", {numeric: true});
  const compare: PlexViewRead["compare"] = (a, b) => collator.compare(a.name, b.name) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  for (const roles of adjacency.values()) {
    for (const rows of roles.values()) Object.freeze(rows.sort((a, b) => compare(a.node, b.node)));
  }
  const empty: readonly PlexViewRelation[] = Object.freeze([]);
  const read: PlexViewRead = {
    coverage: "local", isCurrent: () => true, node: id => nodes.get(id) ?? null,
    relations(id, role, maximum) {
      if (!nodes.has(id)) return {items: empty, coverage: "unavailable", truncated: false};
      const rows = adjacency.get(id)?.get(role) ?? empty;
      const truncated = maximum !== undefined && rows.length > maximum;
      return {items: truncated ? rows.slice(0, maximum) : rows, coverage: "local", truncated};
    },
    evidence: () => ({coverage: "unavailable", value: null}), compare, corpus: {available: false, reason: "unsupported"},
  };
  return {title: fixture.title, entry, read, body: (id: NodeId) => bodies.get(id)};
}

export type Publication = ReturnType<typeof readPublication>;
