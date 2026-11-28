/** Decode the private settings compartment without overwriting future or unrecognized profiles. */
import {parsePublishProfile, type PublishProfile} from "./selection";

export type PublicationProfiles = Readonly<{version: 1; profiles: readonly PublishProfile[]}>;

/** Unsupported settings stay read-only until the owner can interpret their exact schema. */
export function readPublicationProfiles(value: unknown): PublicationProfiles | null {
  if (value === undefined) return {version: 1, profiles: []};
  if (!value || typeof value !== "object" || !("version" in value) || value.version !== 1
    || !("profiles" in value) || !Array.isArray(value.profiles) || value.profiles.length > 100) return null;
  try {
    const profiles = value.profiles.map(parsePublishProfile);
    return new Set(profiles.map(profile => profile.id)).size === profiles.length ? {version: 1, profiles} : null;
  } catch { return null; }
}
