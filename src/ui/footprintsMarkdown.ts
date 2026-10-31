/** Shared explicit Footprints export for the disclosure and canvas menu. The native view owns
 * visits; callers supply cached link formatting, the owning document and clipboard feedback lifetime. */
import type {PlexFootprints, FootprintVisit} from "../application/PlexFootprints";
import {ClipboardSession} from "../application/ClipboardSession";

/** Snapshot all visits in displayed newest-first order, retaining repeated occurrences. Starts no
 * write until the caller invokes copy synchronously in its trusted native handler. */
export function footprintsMarkdownSession(trail: PlexFootprints, formatLink: (visit: FootprintVisit) => string, document: Document): ClipboardSession {
  const lines: string[] = [];
  for (let ordinal = trail.length - 1; ordinal >= 0; ordinal--) {
    const visit = trail.at(ordinal);if (visit) lines.push(`- ${formatLink(visit)}`);
  }
  const owner = document.defaultView;
  return new ClipboardSession(lines.join("\n"), owner?.navigator.clipboard?.writeText
    ? /** Preserve the clipboard receiver and owning window. */ text => owner.navigator.clipboard.writeText(text) : null);
}
