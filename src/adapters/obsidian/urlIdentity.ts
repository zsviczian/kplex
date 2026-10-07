/**
 * Host-bound web URL identity normalization shared by source adapters and navigation. The standard
 * URL parser owns authority syntax; Markdown discovery remains in core/parser. These pure adapter
 * helpers perform no I/O, retain path/query/fragment case, and leave malformed lexical input intact.
 */
import { nodeId } from "../../core/graph/model";
import type { SourceTargetRef } from "../../core/graph/source";

/**
 * Normalize HTTP(S) scheme/host spelling and the optional root slash to one graph identity.
 * Standard URL serialization also handles IDN hosts and default ports. Path, query and fragment
 * remain case-sensitive; malformed or non-web input is returned trimmed without guessing a scheme.
 */
export function canonicalWebUrl(raw: string): string {
  const value = raw.trim();
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return value;
    const serialized = parsed.href;
    // URL serialization inserts a root slash. Dropping only that slash keeps authority roots and
    // ordinary root links identical, without collapsing a case-sensitive non-root path.
    if (parsed.pathname !== "/") return serialized;
    const rootSlash = serialized.indexOf("/", parsed.protocol.length + 2);
    return serialized.slice(0, rootSlash) + serialized.slice(rootSlash + 1);
  } catch {
    return value;
  }
}

/** Return the canonical web origin used as a parent, or null for malformed/non-web lexical input. */
export function webUrlOrigin(raw: string): string | null {
  try {
    const parsed = new URL(raw);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.origin : null;
  } catch {
    return null;
  }
}

/**
 * Adapt an explicitly resolved web target from historical neutral facts to current URL identity.
 * Internal/pathless/malformed targets keep their exact supplied identity. This adapter mints the
 * web identity from semantic URL facts, never recovers a path or kind by inspecting an opaque ID.
 */
export function canonicalWebTarget(target: SourceTargetRef): SourceTargetRef {
  if (target.entity.kind !== "url" || target.resolvedBy !== "url") return target;
  const raw = target.entity.semanticPath ?? target.rawTarget;
  if (!webUrlOrigin(raw)) return target;
  const url = canonicalWebUrl(raw);
  return { ...target, entity: { ...target.entity, id: nodeId(url), semanticPath: url } };
}

/** Supply a distinct root-parent fact for a valid web subpath; roots have no origin self-edge. */
export function webUrlOriginTarget(target: SourceTargetRef): SourceTargetRef | undefined {
  if (target.entity.kind !== "url" || target.resolvedBy !== "url") return undefined;
  const url = canonicalWebUrl(target.entity.semanticPath ?? target.rawTarget), origin = webUrlOrigin(url);
  if (!origin || origin === url) return undefined;
  return { entity: { id: nodeId(origin), kind: "url", state: "materialized", semanticPath: origin },
    rawTarget: origin, resolvedBy: "url" };
}
