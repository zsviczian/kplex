/**
 * One release-metadata policy for local verification and tag-driven packaging. Obsidian manifests
 * and npm roots share a numeric base; only the release tag selects the beta channel. This owner
 * validates injected records without changing files or invoking a build/publication service.
 */
import {isDeepStrictEqual} from "node:util";

const numericVersion = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?![\s\S])/;
const releaseVersion = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?![\s\S])/;

/** Refuse malformed container inputs before inspecting fields or accepting a release channel. */
function object(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be a JSON object`);
  return value;
}

/** Keep diagnostics tied to the actual metadata owner, without silently repairing mismatches. */
function requireEqual(actual, expected, label) {
  if (!isDeepStrictEqual(actual, expected)) throw new Error(`${label} does not match`);
}

/** Normalize one optional lowercase v; prerelease identifiers follow SemVer without build metadata. */
export function releaseChannel(tag, baseVersion) {
  if (tag === undefined) return {baseVersion, prerelease: false};
  if (typeof tag !== "string") throw new Error("Release tag must be a string");
  const normalized = tag.startsWith("v") ? tag.slice(1) : tag;
  const match = releaseVersion.exec(normalized);
  if (!match || match[4]?.split(".").some(/** Numeric prerelease identifiers cannot have leading zeroes. */ part => /^\d+$/.test(part) && part.length > 1 && part.startsWith("0")))
    throw new Error("Release tag must be a numeric version with optional SemVer prerelease identifiers");
  requireEqual(`${match[1]}.${match[2]}.${match[3]}`, baseVersion, "Release tag base");
  return {baseVersion, prerelease: match[4] !== undefined};
}

/** Validate the complete release contract and optionally an exact selected shipped manifest. */
export function validateReleaseMetadata({manifest, betaManifest, packageJson, packageLock, versions, shippedManifest}, {tag} = {}) {
  const stable = object(manifest, "manifest.json"), beta = object(betaManifest, "manifest-beta.json");
  const pkg = object(packageJson, "package.json"), lock = object(packageLock, "package-lock.json");
  const root = object(object(lock.packages, "Lock packages")[""], "Lock root");
  const map = object(versions, "versions.json");
  if (typeof stable.version !== "string" || !numericVersion.test(stable.version)) throw new Error("Manifest version must be numeric x.y.z");
  if (typeof stable.minAppVersion !== "string" || !numericVersion.test(stable.minAppVersion)) throw new Error("Manifest minimum must be numeric x.y.z");
  if (typeof stable.id !== "string" || !stable.id) throw new Error("Manifest id is required");
  const {description: stableDescription, ...stableIdentity} = stable;
  const {description: betaDescription, ...betaIdentity} = beta;
  if (typeof stableDescription !== "string" || typeof betaDescription !== "string") throw new Error("Both manifest descriptions are required");
  requireEqual(betaIdentity, stableIdentity, "Stable/beta manifest identity and numeric base");
  requireEqual(pkg.name, stable.id, "Package name/manifest id");
  requireEqual(pkg.version, stable.version, "Package version/manifest base");
  requireEqual(pkg.license, "AGPL-3.0-only", "Project license");
  for (const key of ["name", "version"]) requireEqual(lock[key], pkg[key], `Lock ${key}`);
  for (const key of ["name", "version", "license"]) requireEqual(root[key], pkg[key], `Lock root ${key}`);
  for (const key of ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"])
    requireEqual(root[key], pkg[key], `Lock root ${key}`);
  const obsidian = pkg.devDependencies?.obsidian ?? pkg.dependencies?.obsidian;
  requireEqual(obsidian, stable.minAppVersion, "Obsidian dependency/manifest minimum");
  requireEqual(object(lock.packages["node_modules/obsidian"], "Locked Obsidian dependency").version, obsidian, "Locked Obsidian version");
  for (const [version, minimum] of Object.entries(map)) {
    if (!numericVersion.test(version) || typeof minimum !== "string" || !numericVersion.test(minimum))
      throw new Error("Version map entries must use numeric versions and minimums");
  }
  requireEqual(map[stable.version], stable.minAppVersion, "Version map current minimum");
  const channel = releaseChannel(tag, stable.version);
  const selectedManifest = channel.prerelease ? beta : stable;
  if (shippedManifest !== undefined) requireEqual(object(shippedManifest, "Shipped manifest"), selectedManifest, "Shipped manifest");
  return {...channel, manifest: selectedManifest};
}
