/**
 * File/CLI boundary for the shared release-metadata policy. Local verification is read-only;
 * release preparation replaces only a validated ordinary dist manifest, before attestation.
 */
import {readFile, writeFile, appendFile} from "node:fs/promises";
import {resolve} from "node:path";
import {pathToFileURL} from "node:url";
import {validateReleaseMetadata} from "./releaseMetadata.mjs";

/** Identify malformed JSON by its metadata file rather than leaking an opaque parser failure. */
async function readJson(root, path) {
  try {return JSON.parse(await readFile(resolve(root, path), "utf8"));}
  catch (error) {throw new Error(`Cannot read valid ${path}: ${error instanceof Error ? error.message : "unknown failure"}`);}
}

/** Validate all inputs before any output write; beta preparation cannot hide a wrong built manifest. */
export async function checkReleaseRepository({root = process.cwd(), tag, prepareDist = false, checkDist = false, githubOutput} = {}) {
  if (prepareDist && tag === undefined) throw new Error("Preparing a release requires an explicit tag");
  const paths = ["manifest.json", "manifest-beta.json", "package.json", "package-lock.json", "versions.json"];
  const [manifest, betaManifest, packageJson, packageLock, versions] = await Promise.all(paths.map(
    /** Metadata reads are independent and never mutate dependency or release records. */ path => readJson(root, path)));
  const data = {manifest, betaManifest, packageJson, packageLock, versions};
  const result = validateReleaseMetadata(data, {tag});
  if (prepareDist || checkDist) {
    const shippedManifest = await readJson(root, "dist/manifest.json");
    // The ordinary build embeds the stable numeric identity. Validate its exact artifact before
    // selecting a beta description, so preparation cannot conceal an unrelated/wrong build.
    validateReleaseMetadata({...data, shippedManifest}, prepareDist ? {} : {tag});
    if (prepareDist && result.prerelease) await writeFile(resolve(root, "dist/manifest.json"), `${JSON.stringify(result.manifest, null, 2)}\n`);
    validateReleaseMetadata({...data, shippedManifest: await readJson(root, "dist/manifest.json")}, {tag});
  }
  if (prepareDist && githubOutput) await appendFile(githubOutput, `is_prerelease=${result.prerelease}\n`);
  return result;
}

/** Parse only the bounded packaging modes; tag values remain data, never shell expressions. */
async function main(args) {
  const options = {tag: process.env.KPLEX_RELEASE_TAG};
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === "--prepare-dist") options.prepareDist = true;
    else if (arg === "--dist") options.checkDist = true;
    else if (arg === "--tag" && index + 1 < args.length) options.tag = args[++index];
    else throw new Error(`Unsupported argument: ${arg}`);
  }
  if (options.prepareDist) options.githubOutput = process.env.GITHUB_OUTPUT;
  const result = await checkReleaseRepository(options);
  console.log(`Release metadata valid: ${result.baseVersion} (${result.prerelease ? "prerelease" : "stable"})`);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main(process.argv.slice(2)).catch(/** A refused release never reaches attestation or publication. */ error => {
    console.error(error instanceof Error ? error.message : "Release metadata validation failed");
    process.exitCode = 1;
  });
}
