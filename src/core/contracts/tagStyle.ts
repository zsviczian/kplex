/** One persisted style per tag. Legacy note-type dictionaries exist only at this migration boundary. */
type Style = Record<string, unknown>;

/** Display one leading hashtag while preserving authored spelling and historical prefix matching. */
export function tagStyleKey(value: string): string {const name = value.trim().replace(/^#+/, "").trim();return name ? `#${name}` : "";}

/** Tag style identities are independent of hashtag spelling and case; matching remains prefix-based. */
export function matchesStyleTag(tag: string, prefix: string): boolean {return tag.toLowerCase().startsWith(prefix.toLowerCase());}

/** Narrow decoded containers before merging their own JSON properties. */
function record(value: unknown): value is Record<string, unknown> {return !!value && typeof value === "object" && !Array.isArray(value);}

/** Merge explicit legacy type attributes over tag attributes, preserving order, extensions and absence.
 * The result contains neither a second dictionary nor contextual overrides. Inputs stay untouched. */
export function migrateTagStyles(tags: unknown, order: unknown, types?: unknown): {tagNodeStyles: Record<string, Style>; tagStyleList: string[]} {
  const tagStyles = record(tags) ? tags : {}, typeStyles = record(types) ? types : {};
  const names = new Map<string, string>(), styles = new Map<string, Style>();
  const priority: string[] = [], ordered = new Set<string>();
  /** Keep normalization linear even for large imported style collections. */
  const prioritize = (key: string): void => {if (key && !ordered.has(key)) {ordered.add(key);priority.push(key);}};
  /** First tag priority wins spelling and overlapping tag attributes; type values override later. */
  const add = (name: string, value: unknown, type: boolean): string => {
    const key = tagStyleKey(name), identity = key.toLowerCase();if (!key) return "";
    const chosen = names.get(identity) ?? key;names.set(identity, chosen);
    const current = styles.get(chosen) ?? {}, incoming = record(value) ? Object.fromEntries(Object.entries(value).filter(([, field]) => field !== undefined)) : {};
    styles.set(chosen, type ? {...current, ...incoming} : {...incoming, ...current});return chosen;
  };
  for (const name of Array.isArray(order) ? order : []) if (typeof name === "string") {
    const key = add(name, Object.prototype.hasOwnProperty.call(tagStyles, name) ? tagStyles[name] : undefined, false);
    prioritize(key);
  }
  for (const [name, value] of Object.entries(tagStyles)) prioritize(add(name, value, false));
  for (const [name, value] of Object.entries(typeStyles)) prioritize(add(name, value, true));
  return {tagNodeStyles: Object.fromEntries(styles), tagStyleList: priority};
}
