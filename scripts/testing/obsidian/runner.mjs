import { createHash } from "node:crypto";
import { copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { basename, isAbsolute, join, relative, resolve, sep } from "node:path";

const PLUGIN_ID = "k-plex";
const ARTIFACTS = ["main.js", "manifest.json", "styles.css"];
const REQUIRED_COMMANDS = ["version", "vault", "plugin:disable", "plugin:enable", "commands", "command", "dev:dom", "dev:errors"];

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function assertInside(parent, child, label) {
  const path = relative(parent, child);
  if (!path || path === ".." || path.startsWith(`..${sep}`) || isAbsolute(path)) throw new Error(`${label} must be a child of the configured test vault`);
}

export function validateTarget({ vaultName, vaultPath, configDir }) {
  if (!vaultName || !vaultPath || !configDir) throw new Error("Set KPLEX_TEST_VAULT_NAME, KPLEX_TEST_VAULT_PATH and KPLEX_TEST_CONFIG_DIR explicitly");
  if (!isAbsolute(vaultPath) || !isAbsolute(configDir)) throw new Error("Test vault and config paths must be absolute");
  if (!existsSync(vaultPath) || !existsSync(configDir)) throw new Error("Configured test vault or config directory does not exist");
  const vault = realpathSync(vaultPath);
  const config = realpathSync(configDir);
  assertInside(vault, config, "Config directory");
  if (basename(vault) !== vaultName) throw new Error("Configured vault name does not match its folder name");
  if (!existsSync(join(config, "community-plugins.json"))) throw new Error("Test vault community-plugins.json is missing");
  const pluginsRoot = join(config, "plugins");
  if (existsSync(pluginsRoot) && lstatSync(pluginsRoot).isSymbolicLink()) throw new Error("Plugin directory may not be a symlink");
  const pluginDir = join(pluginsRoot, PLUGIN_ID);
  if (existsSync(pluginDir) && lstatSync(pluginDir).isSymbolicLink()) throw new Error("Target plugin directory may not be a symlink");
  return { vault, config, pluginDir };
}

function requiredArtifacts(projectRoot) {
  const dist = join(projectRoot, "dist");
  const paths = Object.fromEntries(ARTIFACTS.map((name) => [name, join(dist, name)]));
  for (const path of Object.values(paths)) if (!existsSync(path)) throw new Error(`Missing built artifact: ${path}`);
  const manifest = JSON.parse(readFileSync(paths["manifest.json"], "utf8"));
  if (manifest.id !== PLUGIN_ID) throw new Error(`Built manifest ID must be ${PLUGIN_ID}`);
  return { paths, hashes: Object.fromEntries(ARTIFACTS.map((name) => [name, sha256(paths[name])])), version: manifest.version };
}

function cliPath(output) {
  const trimmed = output.trim();
  return trimmed.startsWith("path ") ? trimmed.slice(5).trim() : trimmed;
}

function count(output) {
  const number = Number(output.trim());
  if (!Number.isSafeInteger(number) || number < 0) throw new Error(`Unexpected dev:dom count: ${output.slice(0, 120)}`);
  return number;
}

function assertErrorsClear(output) {
  const value = output.trim();
  if (value && !/^No errors captured\.?$/i.test(value)) throw new Error(`Obsidian reported JavaScript errors: ${value.slice(0, 1000)}`);
}

/** runCli receives one command and its arguments; the caller must prepend vault=<name>. */
export async function runObsidianVerification({ projectRoot, vaultName, vaultPath, configDir, reportDir, runCli, runVerify, wait = (ms) => new Promise((done) => setTimeout(done, ms)), now = () => Date.now(), source = {} }) {
  const report = {
    schemaVersion: 1,
    status: "failed",
    startedAt: new Date(now()).toISOString(),
    source,
    target: { vaultName, vaultPath, configDir },
    capabilities: {},
    artifacts: {},
    scenarios: [],
  };
  mkdirSync(reportDir, { recursive: true });
  let phase = "preflight";
  try {
    const target = validateTarget({ vaultName, vaultPath, configDir });
    const cli = (command, ...args) => runCli(vaultName, command, ...args);
    report.capabilities.version = cli("version").trim();
    const help = cli("help");
    const missing = REQUIRED_COMMANDS.filter((name) => !help.includes(name));
    if (missing.length) throw new Error(`Obsidian CLI lacks required commands: ${missing.join(", ")}`);
    report.capabilities.commands = REQUIRED_COMMANDS;
    const reportedVault = cliPath(cli("vault", "info=path"));
    if (realpathSync(reportedVault) !== target.vault) throw new Error(`CLI targets ${reportedVault}, expected ${target.vault}`);
    report.target.vaultPath = target.vault;
    report.target.configDir = target.config;

    phase = "portable-verify";
    await runVerify();
    phase = "stage-build";
    const build = requiredArtifacts(projectRoot);
    report.artifacts.sourceHashes = build.hashes;
    report.artifacts.pluginVersion = build.version;
    mkdirSync(target.pluginDir, { recursive: true });
    cli("plugin:disable", `id=${PLUGIN_ID}`);
    for (const name of ARTIFACTS) copyFileSync(build.paths[name], join(target.pluginDir, name));
    report.artifacts.stagedHashes = Object.fromEntries(ARTIFACTS.map((name) => [name, sha256(join(target.pluginDir, name))]));
    if (ARTIFACTS.some((name) => report.artifacts.stagedHashes[name] !== build.hashes[name])) throw new Error("Staged plugin artifacts do not match this build");
    cli("plugin:enable", `id=${PLUGIN_ID}`);
    const commands = cli("commands", `filter=${PLUGIN_ID}`);
    const startCommand = `${PLUGIN_ID}:excalibrain-start`;
    if (!commands.includes(startCommand)) throw new Error(`Plugin command ${startCommand} was not registered`);

    phase = "open-kplex";
    cli("dev:errors", "clear");
    const started = now();
    cli("command", `id=${startCommand}`);
    let rendered = false;
    let text = "";
    const deadline = now() + 15_000;
    do {
      if (count(cli("dev:dom", "selector=.excalibrain-app", "total")) > 0) {
        text = cli("dev:dom", "selector=.excalibrain-app", "text");
        if (text.includes("K-Plex")) { rendered = true; break; }
      }
      if (now() >= deadline) break;
      await wait(250);
    } while (true);
    const errors = cli("dev:errors");
    assertErrorsClear(errors);
    if (!rendered) throw new Error("K-Plex rendered-state assertion timed out: no .excalibrain-app with K-Plex text");
    report.scenarios.push({ id: "open-kplex", status: "passed", assertions: ["plugin command registered", "rendered .excalibrain-app contains K-Plex", "no captured JavaScript errors"], elapsedMs: now() - started });
    report.status = "passed";
  } catch (error) {
    report.error = error instanceof Error ? error.message : String(error);
    report.scenarios.push({ id: phase, status: "failed", reason: report.error });
  } finally {
    report.completedAt = new Date(now()).toISOString();
    writeFileSync(join(reportDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  }
  return report;
}
