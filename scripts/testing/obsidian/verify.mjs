import { spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { release } from "node:os";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runObsidianVerification } from "./runner.mjs";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const reportDir = process.env.KPLEX_HOST_REPORT_DIR || mkdtempSync(join(tmpdir(), "kplex-obsidian-"));

function command(file, args, timeout = 30_000) {
  const result = spawnSync(file, args, { cwd: projectRoot, encoding: "utf8", timeout, maxBuffer: 4 * 1024 * 1024 });
  if (result.error) throw new Error(`${file} failed: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`${file} ${args.join(" ")} failed (${result.status}): ${(result.stderr || result.stdout).trim().slice(0, 1000)}`);
  return result.stdout;
}

const git = (...args) => command("git", args, 10_000).trim();
const report = await runObsidianVerification({
  projectRoot,
  vaultName: process.env.KPLEX_TEST_VAULT_NAME,
  vaultPath: process.env.KPLEX_TEST_VAULT_PATH,
  configDir: process.env.KPLEX_TEST_CONFIG_DIR,
  reportDir,
  source: {
    revision: git("rev-parse", "HEAD"),
    dirty: Boolean(git("status", "--porcelain")),
    node: process.version,
    os: `${process.platform} ${release()}`,
  },
  runCli: (vaultName, name, ...args) => command(process.env.KPLEX_OBSIDIAN_CLI || "obsidian", [`vault=${vaultName}`, name, ...args]),
  runVerify: () => {
    const result = spawnSync("npm", ["run", "verify"], { cwd: projectRoot, stdio: "inherit", timeout: 180_000 });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`npm run verify failed (${result.status})`);
  },
});

console.log(`Obsidian verification ${report.status}; report: ${join(reportDir, "report.json")}`);
if (report.error) console.error(report.error);
if (report.status !== "passed") process.exitCode = 1;
