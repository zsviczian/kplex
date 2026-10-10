/**
 * Bounded, versioned Markdown diagnostics for explicit user sharing. The application formatter
 * projects unknown passive host snapshots into safe DTOs, then produces one exact preview/clipboard
 * string. It has no host, clipboard, timer, logging, enumeration or network dependency.
 */
import { SUPPORT_PLUGIN_LIMIT } from "./supportCustomizationProjection";
import { SESSION_EVENT_CODES, SESSION_EVENT_CATEGORIES, SESSION_EVENT_OUTCOMES, SESSION_EVENT_LIMIT,
  SUPPORT_PHASES, supportCode, supportCount, supportDuration, supportField } from "./SessionEventRecorder";
import { projectSupportEnvironment, projectSupportIndex, projectSupportPreferences, projectSupportStartup,
  supportIsoTime, supportRows, supportRowCount } from "./supportReportProjection";

export const SUPPORT_REPORT_BYTE_LIMIT = 32 * 1024;
export const SUPPORT_REPORT_FORMAT_VERSION = 1;
export type SupportReportInput = Readonly<{
  capturedAt: unknown; indexReport: unknown; environment: unknown; indexingPreferences: unknown; startup: unknown; session: unknown;
}>;

/** Re-project a supplied snapshot; forged event arrays, extra properties and error payloads stay private. */
function supportEvents(input: unknown) {
  const events: Array<{ code: string; atMs: number; phase?: string; outcome?: string; category?: string; durationMs?: number; count?: number }> = [];
  for (const row of supportRows(supportField(input, "events"), SESSION_EVENT_LIMIT)) {
    const code = supportCode(supportField(row, "code"), SESSION_EVENT_CODES), atMs = supportCount(supportField(row, "atMs"));
    if (code === "unavailable" || atMs === null) continue;
    const event: typeof events[number] = { code, atMs };
    const phase = supportCode(supportField(row, "phase"), SUPPORT_PHASES), outcome = supportCode(supportField(row, "outcome"), SESSION_EVENT_OUTCOMES);
    const category = supportCode(supportField(row, "category"), SESSION_EVENT_CATEGORIES), durationMs = supportDuration(supportField(row, "durationMs")), count = supportCount(supportField(row, "count"));
    if (phase !== "unavailable") event.phase = phase;
    if (outcome !== "unavailable") event.outcome = outcome;
    if (category !== "unavailable") event.category = category;
    if (durationMs !== null) event.durationMs = durationMs;
    if (count !== null) event.count = count;
    events.push(event);
  }
  const eventsCaptureStatus = supportCode(supportField(input, "eventsCaptureStatus"), ["active", "disabled", "disposed"]);
  // A disabled/retired recorder cannot truthfully claim retained observations, even if input is forged.
  if (eventsCaptureStatus !== "active") events.length = 0;
  return { events, eventsCaptureStatus, droppedEvents: supportCount(supportField(input, "droppedEvents")),
    oldestEventsOmitted: eventsCaptureStatus === "active" ? Math.max(0, supportRowCount(supportField(input, "events")) - SESSION_EVENT_LIMIT) : 0,
    retainedBytes: supportCount(supportField(input, "retainedBytes")) };
}

/** Emit one pasteable ASCII representation, whose character count is its exact UTF-8 clipboard size. */
function formatSupportReport(report: unknown): string {
  return `## K-Plex support report\n\n\`\`\`json\n${JSON.stringify(report, null, 2).replace(/[\u007f-\uffff]/g, /** Preserve intentional Unicode metadata while retaining an exact ASCII byte bound. */ character => `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`)}\n\`\`\`\n`;
}

/**
 * Remove the fewest ordered rows needed for the final byte budget using bounded binary search.
 * Large plugin manifests must not trigger hundreds of repeated megabyte serializations. All rows
 * are already copied safe DTOs; the supplied updater changes only this private report projection.
 */
function trimSupportRows<T>(report: unknown, rows: T[], oldest: boolean, update: (rows: T[], omitted: number) => void): string {
  let low = 0, high = rows.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    update(oldest ? rows.slice(middle) : rows.slice(0, rows.length - middle), middle);
    if (formatSupportReport(report).length <= SUPPORT_REPORT_BYTE_LIMIT) high = middle;
    else low = middle + 1;
  }
  update(oldest ? rows.slice(low) : rows.slice(0, rows.length - low), low);
  return formatSupportReport(report);
}

/**
 * Read already-retained facts synchronously and return the exact preview/copy bytes within 32 KiB.
 * Unknown inputs become explicit unavailable values. Oldest events are omitted first, followed by
 * active plugin entries from the end, then oldest detailed startup rows and decisions if needed; no field is shortened into misleading data.
 * Names and versions are bounded explicit metadata fields; all other strings use finite vocabulary.
 * Unicode is escaped before sizing, so exact bytes require no TextEncoder or arbitrary serializers.
 */
export function createSupportReport(input: SupportReportInput): string {
  const captured = supportEvents(supportField(input, "session"));
  const report = { formatVersion: SUPPORT_REPORT_FORMAT_VERSION, capturedAt: supportIsoTime(supportField(input, "capturedAt")),
    index: projectSupportIndex(supportField(input, "indexReport")), environment: projectSupportEnvironment(supportField(input, "environment")),
    indexingPreferences: projectSupportPreferences(supportField(input, "indexingPreferences")), startup: projectSupportStartup(supportField(input, "startup")),
    eventsCaptureStatus: captured.eventsCaptureStatus, rawConsoleCaptureStatus: "unsupported", events: captured.events,
    eventsSummary: { droppedEvents: captured.droppedEvents, retainedBytes: captured.retainedBytes },
    truncation: { oldestEventsOmitted: 0, oldestStartupPhasesOmitted: 0, oldestStartupOverlapsOmitted: 0, oldestIndexDecisionsOmitted: 0, activePluginsOmitted: 0 },
    limits: { outputBytes: SUPPORT_REPORT_BYTE_LIMIT, sessionEvents: SESSION_EVENT_LIMIT, activePlugins: SUPPORT_PLUGIN_LIMIT } };
  report.truncation.oldestEventsOmitted = captured.oldestEventsOmitted;
  report.truncation.activePluginsOmitted = report.environment.activePluginsOmitted ?? 0;
  report.truncation.oldestStartupPhasesOmitted = report.startup.phasesOmitted;
  report.truncation.oldestStartupOverlapsOmitted = report.startup.overlapsOmitted;
  report.truncation.oldestIndexDecisionsOmitted = "decisionsOmitted" in report.index ? report.index.decisionsOmitted ?? 0 : 0;
  let formatted = formatSupportReport(report);
  if (formatted.length > SUPPORT_REPORT_BYTE_LIMIT && report.events.length) {
    const previouslyOmitted = report.truncation.oldestEventsOmitted;
    formatted = trimSupportRows(report, report.events, true, /** Apply oldest-event omission only to the private projected report. */ (rows, omitted) => {
      report.events = rows; report.truncation.oldestEventsOmitted = previouslyOmitted + omitted;
    });
  }
  if (formatted.length > SUPPORT_REPORT_BYTE_LIMIT && report.environment.activePlugins.length) {
    const previouslyOmitted = report.truncation.activePluginsOmitted;
    formatted = trimSupportRows(report, report.environment.activePlugins, false, /** Keep the deterministic plugin prefix and name every omitted record. */ (rows, omitted) => {
      report.environment.activePlugins = rows; report.truncation.activePluginsOmitted = previouslyOmitted + omitted;
      report.environment.activePluginsOmitted = report.truncation.activePluginsOmitted;
    });
  }
  while (formatted.length > SUPPORT_REPORT_BYTE_LIMIT) {
    if (report.startup.phases.length) { report.startup.phases.shift(); report.truncation.oldestStartupPhasesOmitted++; }
    else if (report.startup.overlaps.length) { report.startup.overlaps.shift(); report.truncation.oldestStartupOverlapsOmitted++; }
    else if ("decisions" in report.index && report.index.decisions?.length) { report.index.decisions.shift(); report.truncation.oldestIndexDecisionsOmitted++; }
    else {
      // Fixed allowlisted scalar sections fit well within the bound. Keep this defensive terminal
      // result copyable if a future schema extension violates that invariant; never write oversized data.
      return formatSupportReport({ formatVersion: SUPPORT_REPORT_FORMAT_VERSION, capturedAt: report.capturedAt,
        reportStatus: "size-limit", eventsCaptureStatus: report.eventsCaptureStatus, rawConsoleCaptureStatus: "unsupported" });
    }
    formatted = formatSupportReport(report);
  }
  return formatted;
}
