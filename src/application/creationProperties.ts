/** Operation-local creation values, separate from display definitions and semantic indexing.
 * Unset controls produce no writes; only currently offered rows contribute to a saved draft. */
import {normalizeFieldName} from "../core/contracts/fieldName";
import type {NodeProperty} from "../core/plex/nodeProperties";

export type CreationPropertyKind = "text" | "number" | "checkbox" | "date" | "datetime-local" | "list";
export type CreationPropertyValue = string | number | boolean | readonly string[];
export type CreationMetadata = Readonly<{noteType: string | null; properties: readonly Readonly<{field: string; value: CreationPropertyValue}>[]}>;

/** Reject impossible local calendar/time values without applying a timezone or normalizing a bad date. */
function validCalendarValue(value: string, datetime: boolean): boolean {
  const match = (datetime ? /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/ : /^(\d{4})-(\d{2})-(\d{2})$/).exec(value);
  if (!match) return false;
  const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return year > 0 && month >= 1 && month <= 12 && day >= 1 && day <= days[month - 1]
    && (!datetime || Number(match[4]) <= 23 && Number(match[5]) <= 59 && Number(match[6] ?? 0) <= 59);
}

/** Creation accepts the native finite scalar/string-list types, never complex or nonfinite values. */
export function supportedCreationPropertyValue(value: unknown): value is CreationPropertyValue {
  return typeof value === "string" || typeof value === "boolean" || typeof value === "number" && Number.isFinite(value)
    || Array.isArray(value) && Array.from(value).every(/** Sparse slots become undefined and must not become YAML null entries. */ item => typeof item === "string");
}

/** Share normalized draft identity across common/type refinements while filtering obsolete type rows. */
export function creationPropertyValues(rows: readonly NodeProperty[], drafts: Readonly<Record<string, string>>,
  kind: (field: string) => CreationPropertyKind): CreationMetadata["properties"] {
  return rows.filter(/** Display visibility does not decide whether a creation field exists. */ row => row.creationVisible !== false).flatMap<CreationMetadata["properties"][number]>(/** Only active normalized drafts cross the creation boundary; obsolete type drafts remain local. */ row => {
    const raw = drafts[normalizeFieldName(row.field)];
    if (typeof raw !== "string" || !raw.trim()) return [];
    const value = raw.trim(), type = kind(row.field);
    if (type === "number") {
      const number = Number(value);
      if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value) || !Number.isFinite(number)) throw new Error(row.field);
      return [{field: row.field, value: number}];
    }
    if (type === "checkbox") {
      if (value !== "true" && value !== "false") throw new Error(row.field);
      return [{field: row.field, value: value === "true"}];
    }
    if (type === "date" && !validCalendarValue(value, false)
      || type === "datetime-local" && !validCalendarValue(value, true)) throw new Error(row.field);
    return [{field: row.field, value: type === "list" ? value.split(/\r?\n/).map(/** Each authored line is one list value; commas inside labels stay literal. */ item => item.trim()).filter(Boolean) : value}];
  });
}
