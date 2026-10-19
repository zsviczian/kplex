/** Release policy and real no-publish CLI fixtures share the production metadata owner. */
import assert from "node:assert/strict";
import test from "node:test";
import {mkdtemp, mkdir, readFile, writeFile, rm, readdir} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {spawnSync} from "node:child_process";
import {validateReleaseMetadata} from "../scripts/releaseMetadata.mjs";
import {checkReleaseRepository} from "../scripts/check-release-metadata.mjs";

const cli = fileURLToPath(new URL("../scripts/check-release-metadata.mjs", import.meta.url));

/** Use a future version and rich locked records so policy cannot accidentally hardcode today's release. */
function metadata() {
  const manifest = {id: "k-plex", name: "K-Plex", version: "3.2.1", minAppVersion: "1.13.0", description: "Stable", isDesktopOnly: false};
  const packageJson = {name: "k-plex", version: "3.2.1", license: "AGPL-3.0-only", dependencies: {react: "^19.1.1"}, devDependencies: {obsidian: "1.13.0"}};
  return {
    manifest, betaManifest: {...manifest, description: "Beta"}, packageJson,
    packageLock: {name: packageJson.name, version: packageJson.version, lockfileVersion: 3, packages: {
      "": structuredClone(packageJson),
      "node_modules/obsidian": {version: "1.13.0", resolved: "https://registry.npmjs.org/obsidian/-/obsidian-1.13.0.tgz", integrity: "sha512-preserved", license: "MIT"},
      "node_modules/react": {version: "19.1.1", resolved: "https://registry.npmjs.org/react/-/react-19.1.1.tgz", integrity: "sha512-also-preserved", license: "MIT"},
    }}, versions: {"3.1.0": "1.12.0", "3.2.1": "1.13.0"},
  };
}

for (const [tag, prerelease] of [[undefined, false], ["3.2.1", false], ["v3.2.1", false], ["3.2.1-beta-1", true], ["v3.2.1-rc.1", true], ["3.2.1-0.a-1", true]]) {
  test(`shared metadata policy selects ${String(tag)}`, () => {
    const data = metadata(), before = structuredClone(data);
    const result = validateReleaseMetadata(data, {tag});
    assert.equal(result.prerelease, prerelease);
    assert.equal(result.baseVersion, "3.2.1");
    assert.deepEqual(result.manifest, prerelease ? data.betaManifest : data.manifest);
    assert.deepEqual(data, before, "Pure validation never mutates metadata or dependency records");
  });
}

for (const tag of ["", "V3.2.1", "vv3.2.1", "3.2", "03.2.1", "3.2.1-", "3.2.1-rc..1", "3.2.1-01", "3.2.1-rc.01", "3.2.1+build", "3.2.1-rc.1+build", "3.2.2", "3.2.2-beta-1", "3.2.1\n", "$(touch injection)"]) {
  test(`shared metadata policy refuses malformed or mismatched tag ${JSON.stringify(tag)}`, () => {
    assert.throws(() => validateReleaseMetadata(metadata(), {tag}), /tag/i);
  });
}

const invalidMetadata = [
  ["package name", data => {data.packageJson.name = "other";}],
  ["package version", data => {data.packageJson.version = "9.0.0";}],
  ["package license", data => {data.packageJson.license = "MIT";}],
  ["lock name", data => {data.packageLock.name = "other";}],
  ["lock version", data => {data.packageLock.version = "9.0.0";}],
  ["lock root name", data => {data.packageLock.packages[""].name = "other";}],
  ["lock root version", data => {data.packageLock.packages[""].version = "9.0.0";}],
  ["lock root license", data => {data.packageLock.packages[""].license = "MIT";}],
  ["lock root dependencies", data => {data.packageLock.packages[""].dependencies.react = "20.0.0";}],
  ["missing version map entry", data => {delete data.versions["3.2.1"];}],
  ["wrong version map minimum", data => {data.versions["3.2.1"] = "1.12.0";}],
  ["malformed version map", data => {data.versions["v3.2.0"] = "1.13.0";}],
  ["malformed version-map minimum", data => {data.versions["3.1.0"] = "^1.13.0";}],
  ["non-numeric stable", data => {data.manifest.version = "3.2.1-beta-1";}],
  ["leading-zero stable", data => {data.manifest.version = "03.2.1";}],
  ["trailing-newline stable", data => {data.manifest.version = "3.2.1\n";}],
  ["trailing-newline minimum", data => {data.manifest.minAppVersion = "1.13.0\n";}],
  ["trailing-newline version-map key", data => {data.versions["3.2.1\n"] = "1.13.0";}],
  ["different beta base", data => {data.betaManifest.version = "3.2.2";}],
  ["different beta identity", data => {data.betaManifest.id = "other";}],
  ["different beta minimum", data => {data.betaManifest.minAppVersion = "1.12.0";}],
  ["Obsidian dependency", data => {data.packageJson.devDependencies.obsidian = data.packageLock.packages[""].devDependencies.obsidian = "1.12.0";}],
  ["locked Obsidian version", data => {data.packageLock.packages["node_modules/obsidian"].version = "1.12.0";}],
  ["missing lock root", data => {delete data.packageLock.packages[""];}],
  ["array metadata", data => {data.versions = [];}],
];
for (const [label, change] of invalidMetadata) {
  test(`shared metadata policy refuses ${label}`, () => {
    const data = metadata(); change(data);
    const before = structuredClone(data);
    assert.throws(() => validateReleaseMetadata(data));
    assert.deepEqual(data, before, "Failed validation has no mutation side effects");
  });
}

test("exact shipped manifest follows the validated tag channel", () => {
  const data = metadata();
  assert.doesNotThrow(() => validateReleaseMetadata({...data, shippedManifest: data.manifest}));
  assert.doesNotThrow(() => validateReleaseMetadata({...data, shippedManifest: data.betaManifest}, {tag: "v3.2.1-beta-1"}));
  assert.throws(() => validateReleaseMetadata({...data, shippedManifest: data.manifest}, {tag: "v3.2.1-beta-1"}), /Shipped manifest/);
  assert.throws(() => validateReleaseMetadata({...data, shippedManifest: {...data.manifest, extra: true}}), /Shipped manifest/);
});

/** Each fixture owns only a fresh temporary directory; tracked metadata is never changed by tests. */
async function fixture(run) {
  const root = await mkdtemp(join(tmpdir(), "kplex-release-metadata-"));
  const data = metadata();
  try {
    await mkdir(join(root, "dist"));
    for (const [file, value] of Object.entries({"manifest.json": data.manifest, "manifest-beta.json": data.betaManifest,
      "package.json": data.packageJson, "package-lock.json": data.packageLock, "versions.json": data.versions, "dist/manifest.json": data.manifest}))
      await writeFile(join(root, file), `${JSON.stringify(value, null, 2)}\n`);
    return await run(root, data);
  } finally {await rm(root, {recursive: true, force: true});}
}

/** Compare complete owned inputs, including lockfile transitive hashes, URLs and third-party licenses. */
async function snapshot(root) {
  const files = (await readdir(root)).filter(file => file.endsWith(".json")).concat("dist/manifest.json");
  return Object.fromEntries(await Promise.all(files.map(async file => [file, await readFile(join(root, file), "utf8")])));
}

/** Launch the actual CLI without a shell or inherited release/output environment. */
function invoke(root, args = [], extraEnv = {}) {
  const env = {...process.env, ...extraEnv};
  delete env.KPLEX_RELEASE_TAG; delete env.GITHUB_OUTPUT;
  Object.assign(env, extraEnv);
  return spawnSync(process.execPath, [cli, ...args], {cwd: root, env, encoding: "utf8", timeout: 10000});
}

test("actual CLI read-only check and stable dist preparation preserve every metadata/dependency byte", async () => fixture(async root => {
  const before = await snapshot(root);
  for (const args of [[], ["--dist"], ["--tag", "v3.2.1", "--prepare-dist"]]) {
    const result = invoke(root, args);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /3\.2\.1 \(stable\)/);
  }
  assert.deepEqual(await snapshot(root), before);
}));

test("ordinary CLI remains read-only when GitHub provides an output file", async () => fixture(async root => {
  const before = await snapshot(root), output = join(root, "github-output");
  const result = invoke(root, [], {GITHUB_OUTPUT: output});
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(await snapshot(root), before);
  await assert.rejects(readFile(output), {code: "ENOENT"});
}));

test("actual workflow CLI selects beta from env and emits its validated channel without publishing", async () => fixture(async (root, data) => {
  const before = await snapshot(root), output = join(root, "github-output");
  const result = invoke(root, ["--prepare-dist"], {KPLEX_RELEASE_TAG: "v3.2.1-beta-1", GITHUB_OUTPUT: output});
  assert.equal(result.status, 0, result.stderr);
  assert.equal(await readFile(output, "utf8"), "is_prerelease=true\n");
  assert.deepEqual(JSON.parse(await readFile(join(root, "dist/manifest.json"), "utf8")), data.betaManifest);
  assert.deepEqual(await snapshot(root), {...before, "dist/manifest.json": `${JSON.stringify(data.betaManifest, null, 2)}\n`});
  assert.equal(invoke(root, ["--tag", "3.2.1-beta-1", "--dist"]).status, 0);
  assert.deepEqual((await readdir(root)).sort(), ["dist", "github-output", "manifest-beta.json", "manifest.json", "package-lock.json", "package.json", "versions.json"].sort());
}));

for (const file of ["manifest.json", "manifest-beta.json", "package.json", "package-lock.json", "versions.json", "dist/manifest.json"]) {
  test(`malformed ${file} fails before preparation or workflow output writes`, async () => fixture(async root => {
    await writeFile(join(root, file), "{broken");
    const before = await snapshot(root), output = join(root, "github-output");
    const result = invoke(root, ["--tag", "3.2.1-beta-1", "--prepare-dist"], {GITHUB_OUTPUT: output});
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Cannot read valid/);
    assert.deepEqual(await snapshot(root), before);
    await assert.rejects(readFile(output), {code: "ENOENT"});
  }));
}

test("failed tag, missing tag, wrong build and metadata mismatch leave all fixture files unchanged", async () => fixture(async (root, data) => {
  for (const args of [["--prepare-dist"], ["--tag", "3.2.1+build", "--prepare-dist"], ["--wat"]]) {
    const before = await snapshot(root);
    assert.notEqual(invoke(root, args).status, 0);
    assert.deepEqual(await snapshot(root), before);
  }
  for (const [file, value] of [["dist/manifest.json", data.betaManifest], ["versions.json", {}]]) {
    await writeFile(join(root, file), JSON.stringify(value));
    const before = await snapshot(root);
    await assert.rejects(checkReleaseRepository({root, tag: "3.2.1-beta-1", prepareDist: true}));
    assert.deepEqual(await snapshot(root), before);
  }
}));

test("release workflow delegates tag/channel preparation before existing attestation and publication", async () => {
  const workflow = await readFile(new URL("../.github/workflows/release.yml", import.meta.url), "utf8");
  const prepare = workflow.indexOf("run: node scripts/check-release-metadata.mjs --prepare-dist");
  assert(prepare > workflow.indexOf("npm run build"));
  assert(prepare < workflow.indexOf("uses: actions/attest-build-provenance@v2"));
  assert(prepare < workflow.indexOf("uses: softprops/action-gh-release@v2"));
  assert.match(workflow, /KPLEX_RELEASE_TAG: \$\{\{ github\.ref_name \}\}/);
  assert.match(workflow, /prerelease: \$\{\{ steps\.release-metadata\.outputs\.is_prerelease == 'true' \}\}/);
  assert.doesNotMatch(workflow, /cp manifest-beta|\[\[|run:.*github\.ref_name/);
  for (const action of ["actions/checkout@v5", "actions/setup-node@v5", "actions/attest-build-provenance@v2", "softprops/action-gh-release@v2"])
    assert(workflow.includes(`uses: ${action}`));
  for (const permission of ["id-token: write", "contents: write", "attestations: write"]) assert(workflow.includes(permission));
});
