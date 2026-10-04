/**
 * Bridge frozen pre-SI2 test-only occurrence oracles into today's neutral source protocol. The
 * historic fixture deliberately retains its old family/provenance counts; it is not a producer.
 * Production collection, physical-value deduplication and payload sharing are tested independently
 * in reference-policy.test.mjs and ontology-source-collector.test.mjs. Never use this bridge in src.
 */
/** Adapt historical fixture occurrences only; independent production-collector tests own physical sharing coverage. */
export function neutralizeLegacyReferenceFixtures(records) {
  let ordinal = 0;
  return records.flatMap(record => {
    if (!["frontmatter-ontology", "inline-ontology", "presentation-link"].includes(record.kind)) return [record];
    const image = record.kind === "presentation-link";
    const p = record.provenance ?? {};
    const surface = image ? record.surface : record.kind === "frontmatter-ontology" ? "frontmatter" : "inline";
    const fieldName = p.fieldName ?? p.configuredFieldName ?? p.normalizedFieldName ?? (image ? "thumbnail" : "Parent");
    const valueId = `legacy-fixture:${ordinal}`;
    const base = { source: record.source, sourceRevision: record.sourceRevision, valueId };
    const text = p.rawValue ?? record.target.rawTarget ?? "";
    const chunks = [];
    for (let offset = 0; offset < text.length || offset === 0; offset += 16384) {
      chunks.push({ ...base, kind: "reference-payload", index: chunks.length,
        final: offset + 16384 >= text.length, text: text.slice(offset, offset + 16384) });
    }
    return [{ ...base, kind: "reference-value", fieldName,
      normalizedFieldName: p.normalizedFieldName ?? fieldName.toLowerCase().replace(/\s+/g, "-").trim(),
      surface, ordinal: ordinal++, origin: image && surface === "inline" ? "inline-map" : "physical",
      ...(image && surface === "inline" ? { inlineMapIndex: 0 } : {}),
      ...(p.location ? { location: p.location } : {}), ...(p.syntax ? { syntax: p.syntax } : {}),
    }, ...chunks, { ...base, kind: "reference-candidate", ordinal: 0, final: true, target: record.target,
      hostOccurrenceCount: record.hostOccurrenceCount ?? 0 }];
  });
}
