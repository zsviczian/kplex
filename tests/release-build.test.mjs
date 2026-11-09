/** Exercise the real production bundler across clean Git, dirty Git and source-archive inputs. */
import assert from "node:assert/strict";
import test from "node:test";
import {copyFile, mkdir, mkdtemp, readFile, rm, symlink, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {spawnSync, spawn} from "node:child_process";

/** Fail with captured build/Git diagnostics instead of accepting a missing tool or partial build. */
function run(root, executable, args) {
  const result = spawnSync(executable, args, {cwd: root, encoding: "utf8", timeout: 30000});
  assert.equal(result.status, 0, String(result.error ?? result.stderr ?? result.stdout));
}

test("production artifacts are identical with clean, dirty and absent Git metadata", async () => {
  const root = await mkdtemp(join(tmpdir(), "kplex-release-build-"));
  try {
    await mkdir(join(root, "src"));
    await mkdir(join(root, "empty-hooks"));
    await copyFile(new URL("../esbuild.config.mjs", import.meta.url), join(root, "esbuild.config.mjs"));
    await writeFile(join(root, "manifest.json"), JSON.stringify({id: "k-plex", version: "3.2.1"}));
    await writeFile(join(root, "styles.css"), ".test { display: block; }\n");
    await writeFile(join(root, ".gitignore"), "node_modules/\ndist/\n");
    await writeFile(join(root, "src/main.ts"), 'export const build = __KPLEX_BUILD_ID__; export const script = () => document.createElement("script");');
    await symlink(fileURLToPath(new URL("../node_modules", import.meta.url)), join(root, "node_modules"), process.platform === "win32" ? "junction" : "dir");
    run(root, "git", ["init", "--quiet"]);
    run(root, "git", ["add", "."]);
    run(root, "git", ["-c", "user.name=Release test", "-c", "user.email=release@example.invalid", "-c", "commit.gpgsign=false",
      "-c", `core.hooksPath=${join(root, "empty-hooks")}`, "commit", "--quiet", "-m", "Fixture"]);
    run(root, process.execPath, ["esbuild.config.mjs", "production"]);
    const clean = await readFile(join(root, "dist/main.js"));
    assert.match(clean.toString(), /3\.2\.1/);
    assert.doesNotMatch(clean.toString(), /source-archive|\.dirty|createElement\(["']script["']\)/);
    assert.match(clean.toString(), /createElement\("template"\)/, "Reproducibility must preserve React script hardening");
    run(root, process.execPath, ["esbuild.config.mjs", "production"]);
    assert.deepEqual(await readFile(join(root, "dist/main.js")), clean, "Repeated release builds are byte-identical");
    run(root, process.execPath, ["esbuild.config.mjs", "local"]);
    const localClean = (await readFile(join(root, "dist/main.js"))).toString();
    const cleanIdentity = localClean.match(/3\.2\.1\+[a-f0-9]{12}\.local\.\d{8}T\d{9}Z/)?.[0];
    assert(cleanIdentity, "Clean local identity includes Git revision and UTC timestamp");
    assert.equal(localClean.replace(cleanIdentity, "3.2.1"), clean.toString(), "Local builds preserve all production optimizations and hardening");
    await writeFile(join(root, "untracked.txt"), "Unrelated checkout change\n");
    run(root, process.execPath, ["esbuild.config.mjs", "production"]);
    assert.deepEqual(await readFile(join(root, "dist/main.js")), clean);
    run(root, process.execPath, ["esbuild.config.mjs", "local"]);
    const localDirty = (await readFile(join(root, "dist/main.js"))).toString();
    assert.match(localDirty, /3\.2\.1\+[a-f0-9]{12}\.dirty\.local\.\d{8}T\d{9}Z/);
    await rm(join(root, ".git"), {recursive: true});
    run(root, process.execPath, ["esbuild.config.mjs", "production"]);
    assert.deepEqual(await readFile(join(root, "dist/main.js")), clean);
    run(root, process.execPath, ["esbuild.config.mjs", "local"]);
    const archive = (await readFile(join(root, "dist/main.js"))).toString();
    assert.match(archive, /3\.2\.1\+source-archive\.local\.\d{8}T\d{9}Z/);
    run(root, process.execPath, ["esbuild.config.mjs", "local"]);
    assert.notEqual((await readFile(join(root, "dist/main.js"))).toString(), archive, "Actual local builds receive distinct timestamps");
    run(root, process.execPath, ["esbuild.config.mjs", "production"]);
    assert.deepEqual(await readFile(join(root, "dist/main.js")), clean, "Local builds never contaminate source-archive releases");
    assert.deepEqual(await readFile(join(root, "dist/manifest.json")), await readFile(join(root, "manifest.json")));
    assert.deepEqual(await readFile(join(root, "dist/styles.css")), await readFile(join(root, "styles.css")));
  } finally {await rm(root, {recursive: true, force: true});}
});

test("development watch refreshes identity on actual source rebuilds", {timeout: 45000}, async () => {
  const root = await mkdtemp(join(tmpdir(), "kplex-watch-build-"));
  let child;
  /** Wait only for this owned fixture's generated output; retain the established build deadline. */
  const output = async previous => {
    const deadline=Date.now()+10000;
    while(Date.now()<deadline){
      try{const text=await readFile(join(root,"dist/main.js"),"utf8"),id=text.match(/3\.2\.1\+source-archive\.local\.\d{8}T\d{9}Z/)?.[0];if(id&&id!==previous)return id;}catch{ /* The owned watch build may not have emitted its first artifact yet. */ }
      await new Promise(resolve=>setTimeout(resolve,50));
    }
    throw Error("Owned watch build did not complete");
  };
  try{
    await mkdir(join(root,"src"));
    await copyFile(new URL("../esbuild.config.mjs",import.meta.url),join(root,"esbuild.config.mjs"));
    await writeFile(join(root,"manifest.json"),JSON.stringify({id:"k-plex",version:"3.2.1"}));
    await writeFile(join(root,"styles.css"),".test{}\n");
    await writeFile(join(root,"src/main.ts"),"export const build=__KPLEX_BUILD_ID__;export const value=1;");
    await symlink(fileURLToPath(new URL("../node_modules",import.meta.url)),join(root,"node_modules"),process.platform==="win32"?"junction":"dir");
    child=spawn(process.execPath,["esbuild.config.mjs"],{cwd:root,stdio:"ignore",windowsHide:true});
    const first=await output();
    await writeFile(join(root,"src/main.ts"),"export const build=__KPLEX_BUILD_ID__;export const value=2;");
    assert.notEqual(await output(first),first);
  }finally{
    if(child&&child.exitCode===null){const done=new Promise(resolve=>child.once("exit",resolve));child.kill();await done;}
    await rm(root,{recursive:true,force:true});
  }
});

test('release workflow keeps the deterministic production command and never invokes local builds',async()=>{
  const workflow=await readFile(new URL('../.github/workflows/release.yml',import.meta.url),'utf8');
  const manifest=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));
  assert.match(workflow,/npm run build(?:\s|$)/);assert(!workflow.includes('build:local'));assert(!workflow.includes('esbuild.config.mjs local'));
  assert.match(manifest.scripts.build,/esbuild\.config\.mjs production$/);assert.match(manifest.scripts['build:local'],/esbuild\.config\.mjs local$/);
});
