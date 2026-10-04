/**
 * Tests K-Plex strict host-runner staging and failure paths with injected filesystem/CLI doubles.
 * Canonical command and DOM expectations match production; these tests do not launch Obsidian.
 */
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { runObsidianVerification, validateTarget } from "../scripts/testing/obsidian/runner.mjs";
import { createWaitTimingProbe } from "../scripts/testing/obsidian/waitTiming.mjs";

test("native wait probe preserves exact promise/value/rejection identity and counts completion", async () => {
  let time = 0, resolve;
  const probe = createWaitTimingProbe({ now: () => time, phase: () => "source:checking" });
  const original = new Promise(done => { resolve = done; });
  assert.equal(probe.observe("yield", "timer", () => original), original);
  time = 5; resolve("same result"); assert.equal(await original, "same result");
  const reason = new Error("same rejection"), rejected = Promise.reject(reason);
  assert.equal(probe.observe("transaction", "readonly:sourceHeads", () => rejected), rejected);
  time = 8; await assert.rejects(rejected, error => error === reason);
  assert.equal(probe.observe("digest", "sha256", () => 42), 42);
  assert.throws(() => probe.observe("transaction", "throw", () => { throw reason; }), error => error === reason);
  const report = probe.stop(), rows = Object.values(report.groups);
  assert.equal(rows.reduce((n, row) => n + row.calls, 0), 4);
  assert.equal(rows.reduce((n, row) => n + row.completed, 0), 4);
  assert.equal(rows.reduce((n, row) => n + row.rejected, 0), 2);
  assert.equal(rows.reduce((n, row) => n + row.synchronousThrows, 0), 1);
  assert.deepEqual(report.active, [0, 0, 0]);
});

test("native wait probe separates overlapping intervals and real phase transitions", async () => {
  let time = 0, phase = "source:host", resolveTransaction, resolveYield;
  const probe = createWaitTimingProbe({ now: () => time, phase: () => phase });
  const transaction = new Promise(done => { resolveTransaction = done; });
  const yielding = new Promise(done => { resolveYield = done; });
  probe.observe("transaction", "readonly:sourceChunks", () => transaction);
  time = 1; probe.observe("yield", "timer", () => yielding);
  time = 3; probe.checkpoint(); phase = "source:reconciliation"; probe.checkpoint();
  time = 4; resolveYield(); await yielding;
  time = 5; resolveTransaction(); await transaction;
  time = 6; const report = probe.stop();
  assert.deepEqual(report.phases["source:host"].membershipMs, [0, 0, 1, 2, 0, 0, 0, 0]);
  assert.deepEqual(report.phases["source:reconciliation"].membershipMs, [1, 0, 1, 1, 0, 0, 0, 0]);
  assert.equal(Object.values(report.phases).reduce((n, row) => n + row.elapsedMs, 0), 6);
  const sums = Object.values(report.groups).reduce((n, row) => n + row.totalMs, 0);
  assert.equal(sums, 8, "Inclusive promise durations overlap; union is only five milliseconds");
});

test("native wait probe freezes pending observations on retirement and detaches snapshots", async () => {
  let time = 0, resolve;
  const probe = createWaitTimingProbe({ now: () => time, phase: () => "source:host" });
  const original = new Promise(done => { resolve = done; });
  probe.observe("yield", "timer", () => original);
  time = 2; const stopped = probe.stop(), saved = JSON.stringify(stopped);
  assert.equal(Object.values(stopped.groups)[0].pending, 1);
  time = 10; resolve(); await original; probe.checkpoint();
  assert.equal(JSON.stringify(probe.snapshot()), saved, "Late completion cannot rewrite retired evidence");
  stopped.categories[0] = "changed"; Object.values(stopped.phases)[0].membershipMs[1] = 999;
  assert.equal(JSON.stringify(probe.snapshot()), saved, "Returned arrays cannot mutate private aggregates");
  assert.equal(probe.observe("yield", "timer", () => original), original, "Retired observer still forwards");
});

test("native wait probe bounds phase/group cardinality and keeps fixed latency histograms", () => {
  let time = 0, phase = "source:0";
  const probe = createWaitTimingProbe({ now: () => time, phase: () => phase });
  for (let i = 0; i < 1000; i++) {
    phase = "source:" + i;
    probe.observe("digest", "sha256", () => { time += i % 2 === 0 ? 0.2 : 9; });
  }
  const report = probe.stop();
  assert(Object.keys(report.phases).length <= 128); assert(Object.keys(report.groups).length <= 128);
  assert.equal(Object.values(report.groups).reduce((n, row) => n + row.histogram.reduce((a, b) => a + b, 0), 0), 1000);
  assert.equal(Object.values(report.groups).reduce((n, row) => n + row.pending, 0), 0);
  assert(Object.values(report.groups).every(row => row.histogram.length === report.upperBoundsMs.length));
});

test("native wait probe injection is self-contained in another JavaScript realm", async () => {
  const factory = runInNewContext("(" + createWaitTimingProbe.toString() + ")");
  let time = 0;
  const probe = factory({ now: () => time, phase: () => "source:host" });
  const original = Promise.resolve("value");
  assert.equal(probe.observe("yield", "timer", () => original), original);
  time = 2; await original;
  const report = probe.stop();
  assert.equal(report.groups["source:host:yield:timer"].totalMs, 2);
  assert.equal(report.phases["source:host"].membershipMs[1], 2);
});

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
    if (command === "commands") return "k-plex:kplex-start\n";
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
