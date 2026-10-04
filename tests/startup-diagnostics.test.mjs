/** Verify passive startup progress, private overlap summaries, and immutable readiness measurements. */
import assert from "node:assert/strict";
import test from "node:test";
import { browserBundle } from "./support/browserTypeScript.mjs";
const bundle = await browserBundle(["src/adapters/obsidian/startupDiagnostics.ts"]);
const host = { performance: { now: () => now } };
let now = 100;
new Function("window", bundle)(host);
const { StartupDiagnostics } = host.sourceModules;
test("startup phases report actual monotonic counts and overlap without exporting owner identities", () => {
  const d = new StartupDiagnostics();d.begin(true);d.phase("source", "dependencies", 2);
  d.processed("source", "private-A.md");d.processed("source", "private-B.md");
  assert.deepEqual(d.progress("source"), { phase: "dependencies", processed: 2, total: 2 });
  now = 115;d.phase("source", "host-comparison", 2);d.processed("source", "private-B.md");
  now = 140;d.mark("preview");d.finish();
  const report = d.snapshot();
  assert.equal(d.owners.size, 0, "Private owner identities are released at readiness");
  assert.equal(report.phases[0].endedMs, 15);assert.equal(report.phases[1].endedMs, 40);
  assert.deepEqual(report.overlaps, [{ first: "dependencies", second: "host-comparison", owners: 1 }]);
  assert(!JSON.stringify(report).includes("private-"));
  d.phase("source", "later-work");d.processed("source", "private-C.md");d.mark("later");
  assert.deepEqual(d.snapshot(), report, "Later work cannot rewrite the measured startup");
});
test("normal startup exposes actual activity but retains no detailed timing or owner sets", () => {
  const d = new StartupDiagnostics();d.begin(false);d.phase("hydration", "evidence");
  d.processed("hydration");d.count("hydration", "reads");
  assert.deepEqual(d.progress("hydration"), { phase: "evidence", processed: 1, total: null });
  assert.deepEqual(d.snapshot().phases, []);assert.deepEqual(d.snapshot().milestones, {});
});
