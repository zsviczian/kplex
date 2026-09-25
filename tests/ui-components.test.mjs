import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { accessSync, constants, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { buildSync } from "esbuild";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function executable(path) {
  try {
    accessSync(path, constants.X_OK);
    return path;
  } catch {
    return null;
  }
}

function findOnPath(name) {
  for (const directory of (process.env.PATH ?? "").split(delimiter)) {
    if (!directory) continue;
    const candidate = executable(join(directory, process.platform === "win32" ? `${name}.exe` : name));
    if (candidate) return candidate;
  }
  return null;
}

function findBrowser() {
  if (process.env.KPLEX_TEST_BROWSER) return executable(process.env.KPLEX_TEST_BROWSER);
  for (const name of ["chromium", "chromium-browser", "google-chrome", "google-chrome-stable", "chrome"]) {
    const candidate = findOnPath(name);
    if (candidate) return candidate;
  }
  const known = process.platform === "darwin"
    ? [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    ]
    : process.platform === "win32"
      ? [
        join(process.env.PROGRAMFILES ?? "", "Google/Chrome/Application/chrome.exe"),
        join(process.env["PROGRAMFILES(X86)"] ?? "", "Google/Chrome/Application/chrome.exe"),
        join(process.env.LOCALAPPDATA ?? "", "Google/Chrome/Application/chrome.exe"),
      ]
      : [];
  return known.map(executable).find(Boolean) ?? null;
}

function browserEntry() {
  return `
import React from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { ActionButton } from ${JSON.stringify(join(root, "src/ui/components/ActionButton.tsx"))};

const result = document.querySelector("#result");
const fail = (message) => { throw new Error(message); };
const check = (condition, message) => { if (!condition) fail(message); };

try {
  const form = document.createElement("form");
  const container = document.createElement("div");
  form.append(container);
  document.body.append(form);

  let activations = 0;
  let submissions = 0;
  form.addEventListener("submit", (event) => {
    submissions += 1;
    event.preventDefault();
  });

  const root = createRoot(container);
  flushSync(() => root.render(React.createElement(ActionButton, {
    label: "Navigate back",
    icon: React.createElement("span", { "data-testid": "action-icon" }, "←"),
    onClick: () => { activations += 1; },
  })));

  let button = container.querySelector("button");
  check(button instanceof HTMLButtonElement, "ActionButton did not render a native button");
  check(button.type === "button", "ActionButton must render type=button");
  check(button.getAttribute("aria-label") === "Navigate back", "accessible label was not rendered");
  check(button.classList.contains("excalibrain-icon-button"), "existing CSS hook changed");
  check(button.classList.contains("kplex-action-button"), "action token hook missing");
  check(!button.hasAttribute("title"), "ActionButton must not add a second/title tooltip");
  check(button.querySelector('[data-testid="action-icon"]')?.textContent === "←", "icon slot did not render");

  button.click();
  check(activations === 1, "enabled click must fire exactly once");
  check(submissions === 0, "type=button must prevent accidental form submission");

  flushSync(() => root.render(React.createElement(ActionButton, {
    label: "Navigate back",
    icon: React.createElement("span", { "data-testid": "action-icon" }, "←"),
    disabled: true,
    onClick: () => { activations += 1; },
  })));

  button = container.querySelector("button");
  check(button.disabled === true, "disabled prop did not reach the native button");
  button.click();
  check(activations === 1, "disabled click must not activate");
  check(submissions === 0, "disabled action must not submit the form");

  root.unmount();
  result.dataset.status = "passed";
  result.textContent = "ActionButton browser behavior passed";
} catch (error) {
  result.dataset.status = "failed";
  result.textContent = String(error?.stack ?? error);
}
`;
}

test("ActionButton rendered browser behavior", () => {
  const browser = findBrowser();
  assert(browser, "A Chromium-family browser is required for the DOM behavior lane; set KPLEX_TEST_BROWSER to its executable path.");

  const temp = mkdtempSync(join(tmpdir(), "kplex-ui-components-"));
  try {
    const entryPath = join(temp, "entry.tsx");
    const bundlePath = join(temp, "bundle.js");
    const htmlPath = join(temp, "index.html");
    writeFileSync(entryPath, browserEntry());
    buildSync({
      entryPoints: [entryPath],
      outfile: bundlePath,
      bundle: true,
      nodePaths: [join(root, "node_modules")],
      platform: "browser",
      format: "iife",
      target: ["chrome100"],
      logLevel: "silent",
    });
    writeFileSync(htmlPath, `<!doctype html><html><body><pre id="result">pending</pre><script src="./bundle.js"></script></body></html>`);

    const args = [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--allow-file-access-from-files",
      "--virtual-time-budget=2000",
      "--dump-dom",
      `file://${htmlPath}`,
    ];
    const run = spawnSync(browser, args, { encoding: "utf8", timeout: 20_000 });
    assert.equal(run.error, undefined, run.error?.message);
    assert.equal(run.status, 0, `Browser DOM lane exited ${run.status}:\n${run.stderr}`);
    assert.match(run.stdout, /data-status="passed"/, `Browser DOM lane failed:\n${run.stdout}\n${run.stderr}`);
    assert.match(run.stdout, /ActionButton browser behavior passed/);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});
