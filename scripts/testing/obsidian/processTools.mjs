/**
 * Discovers the native Obsidian CLI and launches repository verification without a shell.
 * Windows uses the console launcher for captured output; npm runs through the current Node
 * executable so npm.cmd and shell quoting never handle renderer code or verification arguments.
 * Long/multiline Windows evals use an owned local script to avoid console transport limits.
 * This module is test tooling only and owns no persistent host configuration.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

/**
 * Preserve native process options/results while keeping Windows CLI evals short and single-line.
 * Large controllers can exceed native command-line limits; multiline code uses the same bridge
 * to avoid transporting embedded line breaks through the console launcher.
 * The renderer reads only this invocation's local test script; the owned temporary
 * directory is removed after synchronous command completion or failure. No shell or network is used.
 * Short commands and all non-Windows commands keep their original argument arrays unchanged.
 */
export function spawnNativeSync(file, args, options, { platform = process.platform, spawn = spawnSync } = {}) {
  const codeIndex = args.findIndex(arg => arg.startsWith("code="));
  const quotedLengthBound = file.length + args.reduce((length, arg) => length + arg.length * 2 + 3, 0);
  const inlineSafe = codeIndex >= 0 && !/[\r\n]/.test(args[codeIndex]) && quotedLengthBound < 8_000;
  if (platform !== "win32" || args[1] !== "eval" || !args[0]?.startsWith("vault=") || codeIndex < 0 || inlineSafe) {
    return spawn(file, args, options);
  }
  const directory = mkdtempSync(join(tmpdir(), "kplex-cli-eval-"));
  try {
    const script = join(directory, "probe.js");
    writeFileSync(script, args[codeIndex].slice(5), "utf8");
    const forwarded = [...args];
    forwarded[codeIndex] = `code=eval(require("node:fs").readFileSync(${JSON.stringify(script)},"utf8"))`;
    return spawn(file, forwarded, options);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

/** Resolve an explicit CLI override or a standard desktop install, retaining PATH fallback. */
export function obsidianCliExecutable(env = process.env, platform = process.platform, exists = existsSync) {
  if (env.KPLEX_OBSIDIAN_CLI) return env.KPLEX_OBSIDIAN_CLI;
  const candidates = platform === "win32"
    ? [env.LOCALAPPDATA && join(env.LOCALAPPDATA, "Obsidian", "Obsidian.com"),
      env.PROGRAMFILES && join(env.PROGRAMFILES, "Obsidian", "Obsidian.com"),
      env["PROGRAMFILES(X86)"] && join(env["PROGRAMFILES(X86)"], "Obsidian", "Obsidian.com")]
    : platform === "darwin" ? ["/Applications/Obsidian.app/Contents/MacOS/obsidian-cli",
      "/Applications/Obsidian.app/Contents/MacOS/Obsidian"] : [];
  return candidates.filter(Boolean).find(exists) ?? "obsidian";
}

/** Build a shell-free npm invocation, including direct node-script launches outside npm run. */
export function npmInvocation(env = process.env, node = process.execPath, exists = existsSync) {
  const candidates = [env.npm_execpath, join(dirname(node), "node_modules", "npm", "bin", "npm-cli.js"),
    join(dirname(node), "..", "lib", "node_modules", "npm", "bin", "npm-cli.js")];
  const npm = candidates.filter(Boolean).find(exists);
  if (!npm) throw new Error("Cannot locate npm-cli.js; invoke this driver with npm run verify:obsidian");
  return { file: node, args: [npm, "run", "verify"] };
}

/** Run the complete serial suite. Its established large IndexedDB case alone allows 14 minutes;
 * the aggregate deadline must also cover the other portable/browser suites on slower hosts.
 * Individual test deadlines and native CLI deadlines remain unchanged. */
export function runPortableVerification(projectRoot) {
  const { file, args } = npmInvocation();
  const result = spawnSync(file, args, { cwd: projectRoot, stdio: "inherit", timeout: 2_100_000 });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`npm run verify failed (${result.status})`);
}
