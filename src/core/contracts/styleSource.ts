/** Exact appearance owners shared by renderer provenance and native settings navigation.
 * References identify configuration only; they never carry a plugin, graph or native window. */
export const STANDARD_NODE_COLOR_STYLES = ["baseNodeStyle", "centralNodeStyle", "inferredNodeStyle", "virtualNodeStyle", "siblingNodeStyle", "urlNodeStyle", "attachmentNodeStyle", "folderNodeStyle", "tagNodeStyle"] as const;
export const STANDARD_LINK_COLOR_STYLES = ["baseLinkStyle", "inferredLinkStyle", "folderLinkStyle", "tagLinkStyle"] as const;

export type StandardStyleKey = typeof STANDARD_NODE_COLOR_STYLES[number] | typeof STANDARD_LINK_COLOR_STYLES[number];
export type ElementStyleSource =
  | Readonly<{kind: "standard"; key: StandardStyleKey}>
  | Readonly<{kind: "tag" | "note-type" | "prefix"; key: string}>
  | Readonly<{kind: "ontology"; key: string}>
  | Readonly<{kind: "lens"; id: string; name: string}>;
