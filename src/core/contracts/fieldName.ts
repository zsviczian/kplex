/**
 * Canonical property normalization and configured ontology mapping grammar shared by selection,
 * editing and presentation. Six reciprocal groups support forward/inverse pairs; directional
 * Hidden and exclusions remain literal. These pure helpers never acquire sources or write notes.
 */
/** Normalize a physical field for matching while retaining display spelling in its separate value. */
export const normalizeFieldName = (name: string): string => name.toLowerCase().replace(/\s+/g, "-").trim();

/**
 * Structured representation of a configured ontology hierarchy entry,
 * preserving raw spelling alongside canonical forward and optional inverse forms.
 */
export type HierarchyFieldMapping = Readonly<{
  raw: string;
  forward: string;
  normalizedForward: string;
  inverse?: string;
  normalizedInverse?: string;
}>;

/**
 * Parse an ontology hierarchy field entry that may define forward/inverse names via slash syntax (e.g. "replies to/replied by").
 * When a single slash separates two non-empty tokens, both forward and inverse fields are parsed and normalized.
 * Escaped slashes (e.g. "a\/b") or multiple/consecutive slashes (e.g. "a//b", "a/b/c") are treated as literal single entries.
 *
 * @param entry The configured field string from hierarchy settings.
 * @param allowInverse False for directional Hidden/exclusions, whose names stay literal.
 * @returns The parsed mapping with forward and optional inverse fields.
 */
export function parseHierarchyFieldMapping(entry: string, allowInverse = true): HierarchyFieldMapping {
  const trimmed = entry.trim();
  if (!allowInverse) return {raw: entry, forward: entry, normalizedForward: normalizeFieldName(entry)};
  if (trimmed.includes("\\/")) {
    const unescaped = trimmed.replace(/\\\//g, "/");
    return {
      raw: entry,
      forward: unescaped,
      normalizedForward: normalizeFieldName(unescaped),
    };
  }
  if (trimmed.includes("//") || !trimmed.includes("/")) {
    return {
      raw: entry,
      forward: entry,
      normalizedForward: normalizeFieldName(entry),
    };
  }
  const parts = trimmed.split("/");
  if (parts.length === 2 && parts[0].trim().length > 0 && parts[1].trim().length > 0) {
    const forward = parts[0].trim();
    const inverse = parts[1].trim();
    return {
      raw: entry,
      forward,
      normalizedForward: normalizeFieldName(forward),
      inverse,
      normalizedInverse: normalizeFieldName(inverse),
    };
  }
  return {
    raw: entry,
    forward: entry,
    normalizedForward: normalizeFieldName(entry),
  };
}

export type HierarchyRole = "parent" | "child" | "left" | "right" | "previous" | "next";

export type RoleHierarchyData = {
  parents: string[];
  children: string[];
  leftFriends: string[];
  rightFriends: string[];
  previous: string[];
  next: string[];
};

/**
 * Return all valid field names for a specific hierarchy role, unpacking forward and reciprocal
 * inverse terms declared in opposite or symmetric roles.
 *
 * @param hierarchy The hierarchy collections.
 * @param role The target relationship role.
 * @returns Array of unique field names appropriate for this role.
 */
export function ontologyFieldsForHierarchyRole(hierarchy: RoleHierarchyData, role: HierarchyRole): string[] {
  const directList = role === "parent" ? hierarchy.parents
    : role === "child" ? hierarchy.children
    : role === "left" ? hierarchy.leftFriends
    : role === "right" ? hierarchy.rightFriends
    : role === "previous" ? hierarchy.previous : hierarchy.next;

  const oppositeRole = role === "parent" ? "child"
    : role === "child" ? "parent"
    : role === "previous" ? "next"
    : role === "next" ? "previous"
    : role;

  const oppositeList = oppositeRole === "parent" ? hierarchy.parents
    : oppositeRole === "child" ? hierarchy.children
    : oppositeRole === "left" ? hierarchy.leftFriends
    : oppositeRole === "right" ? hierarchy.rightFriends
    : oppositeRole === "previous" ? hierarchy.previous : hierarchy.next;

  const result: string[] = [];
  const seen = new Set<string>();

  for (const entry of directList ?? []) {
    const mapping = parseHierarchyFieldMapping(entry);
    if (mapping.normalizedForward && !seen.has(mapping.normalizedForward)) {
      seen.add(mapping.normalizedForward);
      result.push(mapping.forward);
    }
  }
  if (oppositeRole !== role) {
    for (const entry of oppositeList ?? []) {
      const mapping = parseHierarchyFieldMapping(entry);
      if (mapping.inverse && mapping.normalizedInverse && !seen.has(mapping.normalizedInverse)) {
        seen.add(mapping.normalizedInverse);
        result.push(mapping.inverse);
      }
    }
  } else {
    for (const entry of directList ?? []) {
      const mapping = parseHierarchyFieldMapping(entry);
      if (mapping.inverse && mapping.normalizedInverse && !seen.has(mapping.normalizedInverse)) {
        seen.add(mapping.normalizedInverse);
        result.push(mapping.inverse);
      }
    }
  }
  return result;
}

export type OntologyFieldRole = "parent" | "child" | "left" | "right" | "previous" | "next" | "hidden" | "excluded";

export type MutableHierarchyData = {
  hidden: string[];
  parents: string[];
  children: string[];
  leftFriends: string[];
  rightFriends: string[];
  previous: string[];
  next: string[];
  exclusions?: string[];
};

/** Accept the existing plural setting-group aliases at this settings-edit boundary. */
function normalizeTargetRole(role: OntologyFieldRole | "parents" | "children" | "leftFriends" | "rightFriends"): OntologyFieldRole {
  switch (role) {
    case "parents": return "parent";
    case "children": return "child";
    case "leftFriends": return "left";
    case "rightFriends": return "right";
    default: return role;
  }
}

/** Return the owned mutable role list, initializing only missing compatibility fields. */
function getRoleList(hierarchy: MutableHierarchyData, role: OntologyFieldRole): string[] {
  switch (role) {
    case "parent": return (hierarchy.parents ??= []);
    case "child": return (hierarchy.children ??= []);
    case "left": return (hierarchy.leftFriends ??= []);
    case "right": return (hierarchy.rightFriends ??= []);
    case "previous": return (hierarchy.previous ??= []);
    case "next": return (hierarchy.next ??= []);
    case "hidden": return (hierarchy.hidden ??= []);
    case "excluded": return (hierarchy.exclusions ??= []);
  }
}

/** Preserve symmetric lateral roles and invert only hierarchical/chronological endpoints. */
function reciprocalRoleForGroup(role: OntologyFieldRole): OntologyFieldRole {
  switch (role) {
    case "parent": return "child";
    case "child": return "parent";
    case "previous": return "next";
    case "next": return "previous";
    case "left": return "left";
    case "right": return "right";
    default: return role;
  }
}

/**
 * Reassign an ontology field or slash pair into a target hierarchy role.
 * Preserves the other half of an existing slash pair when only one half is reassigned,
 * preventing silent data loss or duplicate conflicting mappings.
 *
 * @param hierarchy The mutable hierarchy settings data.
 * @param field The field or slash pair being assigned.
 * @param targetRole The destination ontology role.
 * @param options Literal mode accepts an actual physical property name, never configured pair syntax.
 */
export function reassignFieldInHierarchy(
  hierarchy: MutableHierarchyData,
  field: string,
  targetRole: OntologyFieldRole | "parents" | "children" | "leftFriends" | "rightFriends",
  options: Readonly<{literal?: boolean}> = {},
): MutableHierarchyData {
  const trimmed = field.trim();
  if (!trimmed) return hierarchy;
  const destinationRole = normalizeTargetRole(targetRole);
  const roles: OntologyFieldRole[] = ["hidden", "parent", "child", "left", "right", "previous", "next", "excluded"];
  const reciprocal = destinationRole !== "hidden" && destinationRole !== "excluded";
  const inputMapping = options.literal
    ? {raw: trimmed, forward: trimmed, normalizedForward: normalizeFieldName(trimmed), inverse: undefined, normalizedInverse: undefined}
    : parseHierarchyFieldMapping(trimmed, reciprocal);
  // Physical writers pass literal mode explicitly. Adding one escape before every slash also
  // preserves a literal backslash-slash: parsing removes only the newly added escape character.
  const targetEntry = options.literal && reciprocal ? trimmed.replaceAll("/", "\\/") : trimmed;
  const selected = new Set([inputMapping.normalizedForward, inputMapping.normalizedInverse].filter(
    /** Empty inverse tokens cannot select unrelated settings entries. */ (name): name is string => !!name));
  const preserved: Array<{role: OntologyFieldRole; entry: string}> = [];
  const sortRoles = new Set<OntologyFieldRole>([destinationRole]);
  for (const role of roles) {
    const list = getRoleList(hierarchy, role), kept: string[] = [];
    for (const entry of list) {
      const mapping = parseHierarchyFieldMapping(entry, role !== "hidden" && role !== "excluded");
      const forwardSelected = selected.has(mapping.normalizedForward);
      const inverseSelected = !!mapping.normalizedInverse && selected.has(mapping.normalizedInverse);
      if (!forwardSelected && !inverseSelected) { kept.push(entry); continue; }
      // Splitting a pair retires only selected fields. Preserve every unrelated half under the
      // role it already meant, even when the new pair intersects two different existing pairs.
      if (!forwardSelected) preserved.push({role, entry: mapping.forward});
      if (mapping.inverse && !inverseSelected) preserved.push({role: reciprocalRoleForGroup(role), entry: mapping.inverse});
    }
    if (kept.length !== list.length) list.splice(0, list.length, ...kept);
  }
  for (const {role, entry} of preserved) {
    const normalized = normalizeFieldName(entry);
    const present = role === "hidden" || role === "excluded"
      ? getRoleList(hierarchy, role).some(/** Directional groups compare literal physical names. */ value => normalizeFieldName(value) === normalized)
      : ontologyFieldsForHierarchyRole(hierarchy, role).some(/** Existing effective assignments need no duplicate singleton. */ value => normalizeFieldName(value) === normalized);
    if (!present) { getRoleList(hierarchy, role).push(entry); sortRoles.add(role); }
  }
  getRoleList(hierarchy, destinationRole).push(targetEntry);
  // Only appended-to roles use the established editor ordering. Other arrays retain precedence
  // and their first-choice defaults, including roles that merely lost a selected field.
  for (const role of sortRoles) getRoleList(hierarchy, role).sort(/** Sort a newly extended role without reordering unrelated settings. */
    (a, b) => a.localeCompare(b, undefined, {sensitivity: "base"}));
  return hierarchy;
}
