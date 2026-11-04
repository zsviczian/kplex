/** Compass presentation preferences use the existing validated type-wide configuration writer.
 * Missing historical data inherits the original orientation without saving an implicit default. */
import type {PlexViewConfiguration, PlexViewConfigurationSchema} from "../configuration";

export const classicConfigurationSchema: PlexViewConfigurationSchema = {version: 1, fields: {
  flipEastWest: {defaultValue: false, validate: /** Only an explicit boolean changes horizontal presentation. */ (value): boolean => typeof value === "boolean"},
}};

/** Unavailable or absent configuration retains safe legacy orientation; it never changes semantics. */
export function classicFlipped(configuration?: PlexViewConfiguration): boolean {
  return configuration?.status !== "unavailable" && configuration?.values.flipEastWest === true;
}
