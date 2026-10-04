/** Real Chromium runner for production TypeScript modules. Explicit host stubs do not emulate IDB. */
import { createRequire } from "node:module";
import { mkdtemp, readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve, relative } from "node:path";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const ts = require("typescript");
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

/** Bundle actual emitted runtime imports (not type-only imports), without substituting production modules. */
export async function browserBundle(entries, stubs = {}) {
  const modules = new Map();
  async function visit(file) {
    const key = relative(root, file).replaceAll("\\", "/");
    if (modules.has(key)) return key;
    modules.set(key, "");
    const source = await readFile(file, "utf8");
    const output = ts.transpileModule(source, { fileName: file, reportDiagnostics: true,
      compilerOptions: { target: ts.ScriptTarget.ES2021, module: ts.ModuleKind.CommonJS, esModuleInterop: true } });
    const errors = (output.diagnostics ?? []).filter(d => d.category === ts.DiagnosticCategory.Error);
    if (errors.length) throw new Error(errors.map(d => ts.flattenDiagnosticMessageText(d.messageText, "\n")).join("\n"));
    let text = output.outputText;
    const imports = [...text.matchAll(/require\("([^"\n]+)"\)/g)];
    for (const [, name] of imports) {
      let id = name;
      if (name.startsWith(".")) {
        const base = resolve(dirname(file), name);
        const target = [base + ".ts", base + ".tsx", join(base, "index.ts")].find(existsSync);
        if (!target) throw new Error("Missing runtime module: " + name);
        id = await visit(target);
      } else if (Object.hasOwn(stubs, name)) modules.set(name, stubs[name]);
      else throw new Error("Undeclared browser dependency: " + name);
      text = text.replaceAll(`require(${JSON.stringify(name)})`, `require(${JSON.stringify(id)})`);
    }
    modules.set(key, text); return key;
  }
  const ids = [];
  for (const entry of entries) ids.push(await visit(join(root, entry)));
  return `(function(){const factories={${[...modules].map(([key, text]) => `${JSON.stringify(key)}:function(module,exports,require){\n${text}\n}`).join(",\n")}};
const cache={}; function require(id){if(cache[id])return cache[id].exports; const m=cache[id]={exports:{}}; if(!factories[id])throw new Error(id); factories[id](m,m.exports,require);return m.exports;}
window.sourceModules=Object.assign({},${ids.map(id => `require(${JSON.stringify(id)})`).join(",")});})();`;
}
/** Own a disposable real profile; restart() reopens precisely that profile in a new browser process. */
export async function chromiumHarness(bundle) {
  const executable = process.env.KPLEX_CHROMIUM ?? process.env.KPLEX_TEST_BROWSER ?? ["/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/google-chrome", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"].find(existsSync);
  if (!executable) throw new Error("Real Chromium required (set KPLEX_CHROMIUM); this lane is not a mock or a skip.");
  const directory = await mkdtemp(join(tmpdir(), "kplex-source-idb-"));
  const profile = join(directory, "profile"); await mkdir(profile);
  const page = join(directory, "test.html");
  await writeFile(join(directory, "bundle.js"), bundle);
  await writeFile(page, '<!doctype html><meta charset="utf-8"><script>window.onerror=(message)=>{window.bundleError=message};</script><script src="bundle.js"></script>');
  const server = createServer(async (request, response) => {
    const javascript = request.url === "/bundle.js";
    response.setHeader("Content-Type", javascript ? "text/javascript" : "text/html");
    response.end(await readFile(javascript ? join(directory, "bundle.js") : page));
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const pageUrl = `http://127.0.0.1:${server.address().port}/test.html`;
  let child, socket, sequence = 0; const pending = new Map();
  async function call(method, params = {}) {
    const id = ++sequence;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { pending.delete(id); reject(new Error("CDP timeout: " + method)); }, 60000);
      pending.set(id, { resolve: value => { clearTimeout(timer); resolve(value); }, reject: error => { clearTimeout(timer); reject(error); } });
      socket.send(JSON.stringify({ id, method, params }));
    });
  }
  async function start() {
    await rm(join(profile, "DevToolsActivePort"), { force: true });
    child = spawn(executable, ["--headless", "--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--remote-debugging-port=0",
      `--user-data-dir=${profile}`, "--no-first-run", "--no-default-browser-check", "about:blank"], { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = ""; child.stderr.on("data", data => { stderr = (stderr + data).slice(-8192); });
    let port;
    // Launch can exceed five seconds on a busy macOS renderer; keep test assertions unchanged.
    for (let i = 0; i < 600; i++) {
      if (child.exitCode !== null) throw new Error("Chromium exited: " + stderr);
      try { port = (await readFile(join(profile, "DevToolsActivePort"), "utf8")).split("\n")[0]; break; } catch { await new Promise(r => setTimeout(r, 25)); }
    }
    if (!port) throw new Error("Chromium startup timeout: " + stderr);
    const target = await (await fetch(`http://127.0.0.1:${port}/json/new?${pageUrl}`, { method: "PUT" })).json();
    socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
    socket.addEventListener("message", event => {
      const message = JSON.parse(event.data); const entry = pending.get(message.id); if (!entry) return;
      pending.delete(message.id); if (message.error) entry.reject(new Error(JSON.stringify(message.error))); else entry.resolve(message.result);
    });
    await call("Runtime.enable");
    const navigation = await call("Page.navigate", { url: pageUrl });
    if (navigation.errorText) throw new Error("Chromium page blocked: " + navigation.errorText);
    for (let attempt = 0; attempt < 200; attempt++) {
      try {
        if (await evaluate("Boolean(window.sourceModules)")) return;
        const error = await evaluate("window.bundleError || null");
        if (error) throw new Error("Bundle failed: " + error);
      } catch (error) {
        if (!/Execution context|Cannot find context/.test(String(error))) throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    throw new Error("Production bundle did not load in Chromium");
  }
  async function evaluate(expression) {
    const result = await call("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? JSON.stringify(result.exceptionDetails));
    return result.result.value;
  }
  async function stop() {
    if (socket) socket.close();
    if (child && child.exitCode === null) {
      const owned = child;
      const exited = new Promise(resolve => owned.once("exit", resolve));
      const kill = setTimeout(() => owned.kill("SIGKILL"), 5000);
      owned.kill("SIGTERM"); await exited; clearTimeout(kill);
    }
  }
  try { await start(); } catch (error) { await stop(); server.close(); await rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 }); throw error; }
  return { evaluate, restart: async () => { await stop(); await start(); }, cleanup: async () => { await stop(); server.close(); await rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 }); } };
}
