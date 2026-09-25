import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { runObsidianVerification, validateTarget } from "../scripts/testing/obsidian/runner.mjs";

async function fixture(fn) {
  const root = mkdtempSync(join(tmpdir(), "kplex-host-runner-test-"));
  const projectRoot = join(root, "project");
  const vaultPath = join(root, "kplex-test");
  const configDir = join(vaultPath, ".obsidian");
  const pluginDir = join(configDir, "plugins", "k-plex");
  const reportDir = join(root, "report");
  try {
    for (const dir of [join(projectRoot, "dist"), pluginDir]) mkdirSync(dir, { recursive: true });
    for (const [name, value] of Object.entries({
      "main.js": "new plugin bundle",
      "manifest.json": JSON.stringify({ id: "k-plex", version: "0.0.5" }),
      "styles.css": "new styles",
    })) writeFileSync(join(projectRoot, "dist", name), value);
    writeFileSync(join(pluginDir, "main.js"), "old plugin bundle");
    writeFileSync(join(pluginDir, "data.json"), "settings stay");
    writeFileSync(join(configDir, "community-plugins.json"), '["k-plex"]');
    return await fn({ root, projectRoot, vaultPath, configDir, pluginDir, reportDir, vaultName: "kplex-test" });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function fakeCli(target, options = {}) {
  const calls = [];
  const runCli = (vault, command, ...args) => {
    calls.push([vault, command, ...args]);
    assert.equal(vault, "kplex-test");
    if (command === "version") return "1.14.2\n";
    if (command === "help") return "version vault plugin:disable plugin:enable commands command dev:dom dev:errors";
    if (command === "vault") return `${options.reportedVault ?? target.vaultPath}\n`;
    if (command === "commands") return "k-plex:excalibrain-start\n";
    if (command === "dev:dom") return args.includes("total") ? options.domCount ?? "1\n" : options.domText ?? "K-Plex Welcome";
    if (command === "dev:errors") return options.errors ?? "No errors captured\n";
    return "OK\n";
  };
  return { calls, runCli };
}

test("requires an explicit, existing named test vault and config", async () => {
  assert.throws(() => validateTarget({}), /Set KPLEX_TEST_/);
  await fixture((target) => assert.equal(validateTarget(target).vault, realpathSync(target.vaultPath)));
});

test("verifies exact artifacts, preserves data and reports rendered smoke success", async () => {
  await fixture(async (target) => {
    const cli = fakeCli(target);
    let verified = false;
    const report = await runObsidianVerification({ ...target, runCli: cli.runCli, runVerify: () => { verified = true; }, source: { revision: "test" } });
    assert.equal(report.status, "passed");
    assert.equal(verified, true);
    assert.equal(readFileSync(join(target.pluginDir, "main.js"), "utf8"), "new plugin bundle");
    assert.equal(readFileSync(join(target.pluginDir, "data.json"), "utf8"), "settings stay");
    assert.deepEqual(report.artifacts.sourceHashes, report.artifacts.stagedHashes);
    assert.equal(JSON.parse(readFileSync(join(target.reportDir, "report.json"), "utf8")).status, "passed");
    assert(cli.calls.findIndex((call) => call[1] === "plugin:disable") < cli.calls.findIndex((call) => call[1] === "plugin:enable"));
  });
});

test("vault mismatch or failed portable verification blocks staging and reports failure", async () => {
  await fixture(async (target) => {
    const other = join(target.root, "other-vault");
    mkdirSync(other);
    let built = false;
    const wrongVault = await runObsidianVerification({ ...target, runCli: fakeCli(target, { reportedVault: other }).runCli, runVerify: () => { built = true; } });
    assert.equal(wrongVault.status, "failed");
    assert.match(wrongVault.error, /CLI targets/);
    assert.equal(wrongVault.scenarios[0].id, "preflight");
    assert.equal(built, false);
    assert.equal(readFileSync(join(target.pluginDir, "main.js"), "utf8"), "old plugin bundle");
    const failedBuild = await runObsidianVerification({ ...target, runCli: fakeCli(target).runCli, runVerify: () => { throw new Error("build failed"); } });
    assert.equal(failedBuild.status, "failed");
    assert.match(failedBuild.error, /build failed/);
    assert.equal(failedBuild.scenarios[0].id, "portable-verify");
    assert.equal(readFileSync(join(target.pluginDir, "main.js"), "utf8"), "old plugin bundle");
  });
});

test("unavailable CLI fails strict preflight without touching the plugin", async () => {
  await fixture(async (target) => {
    const report = await runObsidianVerification({ ...target, runCli: () => { throw new Error("CLI unavailable"); }, runVerify: () => { throw new Error("must not build"); } });
    assert.equal(report.status, "failed");
    assert.equal(report.scenarios[0].id, "preflight");
    assert.match(report.error, /CLI unavailable/);
    assert.equal(readFileSync(join(target.pluginDir, "main.js"), "utf8"), "old plugin bundle");
    assert.equal(existsSync(join(target.reportDir, "report.json")), true);
  });
});

test("missing render and captured JavaScript errors fail with a written report", async () => {
  await fixture(async (target) => {
    let tick = 0;
    const report = await runObsidianVerification({
      ...target, runCli: fakeCli(target, { domCount: "0\n" }).runCli, runVerify: () => {},
      now: () => (tick += 1000), wait: async () => {},
    });
    assert.equal(report.status, "failed");
    assert.match(report.error, /rendered-state assertion timed out/);
    assert.equal(existsSync(join(target.reportDir, "report.json")), true);
  });
  await fixture(async (target) => {
    const report = await runObsidianVerification({ ...target, runCli: fakeCli(target, { errors: "TypeError: broken" }).runCli, runVerify: () => {} });
    assert.equal(report.status, "failed");
    assert.match(report.error, /JavaScript errors/);
  });
});
