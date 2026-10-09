/**
 * Carries a recoverable partial note-creation outcome across the Obsidian writer/UI boundary.
 * The writer retains the exact created file; consumers must recover that file rather than create again.
 */
import type { TFile } from "obsidian";

/** A physical file exists even though its initial metadata or relationship has not completed. */
export class PartialRelatedFileError extends Error {
  /** Preserve file identity and original failure without implying rollback or safe automatic retry. */
  constructor(readonly file: TFile, readonly cause: unknown) {
    super(cause instanceof Error ? cause.message : String(cause));
    this.name = "PartialRelatedFileError";
  }
}
