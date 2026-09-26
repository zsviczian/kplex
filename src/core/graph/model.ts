/** Exact semantic identity. Core code must never derive kind, path, extension or case rules from it. */
export type NodeId = string & { readonly __nodeId: unique symbol };

export const nodeId = (value: string): NodeId => value as NodeId;

export type GraphNodeKind = "document" | "attachment" | "container" | "tag" | "url" | "unresolved";
export type GraphResolution = "resolved" | "unresolved";

/** Optional file semantics used by consumers such as lens evaluation; absence is meaningful. */
export type FileFacet = Readonly<{
  name: string;
  extension: string;
  path: string;
  mtime: number | null;
}>;

/** Host-free read DTO. It deliberately excludes mutable neighbour maps and host objects. */
export type GraphNodeView = Readonly<{
  id: NodeId;
  name: string;
  kind: GraphNodeKind;
  resolution: GraphResolution;
  url: string | null;
  aliases: readonly string[];
  tags: readonly string[];
  noteType: string | null;
  primaryStyleTag: string | null;
  styleTags: readonly string[];
  maxLabelLength: number;
  file?: FileFacet;
}>;
