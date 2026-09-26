import { MetadataParser } from "./MetadataParser";

/**
 * Legacy class name retained for compatibility. All parsing is owned by the portable parser and
 * production MetadataParser boundary; this wrapper intentionally contains no parser grammar.
 */
export class MetadataParseWorker extends MetadataParser {}
