/** Shared native property-owner eligibility for authored direction and external imports.
 * Graph placement and a filename alone never authorize frontmatter writes. */
import type {App, TFile} from "obsidian";
import type {GraphPage} from "../../types";

/** Return only the exact, live physical Markdown incarnation represented by this endpoint. */
export function eligibleRelationshipOwner(app: App, page: GraphPage): TFile | null {
  const file = page.file;
  return !page.transient && !page.isFolder && !page.isTag && !page.url && file?.extension === "md"
    && app.vault.getFileByPath(file.path) === file ? file : null;
}
