/** Canonical property-key normalization shared by parser, collectors and graph semantics. */
export const normalizeFieldName = (name: string): string => name.toLowerCase().replace(/\s+/g, "-").trim();
