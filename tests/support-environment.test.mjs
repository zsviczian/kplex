/** Cached host customization contracts: active identities only, no reads/reloads or settings disclosure. */
import assert from "node:assert/strict";
import test from "node:test";
import { browserBundle } from "./support/browserTypeScript.mjs";
const source = await browserBundle(["src/adapters/obsidian/supportEnvironment.ts"]);
const host = {};
new Function("window", source)(host);
const { readSupportCustomizations } = host.sourceModules;

/** Supply realistic existing host caches while making all effectful discovery operations fail. */
function cachedHost() {
  return {
    plugins: { plugins: { live: { manifest: { id: "live", name: "Live plugin", version: "1.2.3" }, settings: { private: "never-export" } } },
      manifests: { disabled: { id: "disabled", name: "Disabled", version: "9.9.9" } },
      loadManifests: /** A report may not turn metadata collection into plugin discovery. */ () => { throw Error("Unexpected discovery"); } },
    internalPlugins: { plugins: { graph: { enabled: true, instance: { id: "graph", name: "Graph view" } }, search: { enabled: false, instance: { id: "search", name: "Search" } } } },
    customCss: { theme: "Theme with Unicode 日本語", enabledSnippets: new Set(["private-name"]), snippets: ["private-name", "disabled-private-name"],
      readSnippets: /** Cached counts must not read CSS files. */ () => { throw Error("Unexpected CSS I/O"); } },
    vault: { getFiles: /** Metadata reporting must never enumerate the vault. */ () => { throw Error("Unexpected vault scan"); } },
  };
}

test("cached active core/community metadata excludes disabled plugins and snippet names", /** Reads only cached state; reports names and counts explicitly requested by the maintainer. */ () => {
  const result = readSupportCustomizations(cachedHost());
  assert.equal(result.activePluginsAvailability, "available");
  assert.equal(result.activePluginTotalCount, 2);
  assert.deepEqual(result.activePlugins, [{ kind: "core", id: "graph", name: "Graph view", version: null }, { kind: "community", id: "live", name: "Live plugin", version: "1.2.3" }]);
  assert.equal(result.customThemeName, "Theme with Unicode 日本語");
  assert.equal(result.enabledCssSnippetCount, 1); assert.equal(result.availableCssSnippetCount, 2);
  assert(!JSON.stringify(result).includes("private-name")); assert(!JSON.stringify(result).includes("never-export"));
});

test("optional caches fail independently without invoking accessors", /** Unknown capability means unavailable, while the native default theme is explicitly null. */ () => {
  const app = cachedHost(); app.customCss.theme = ""; delete app.plugins;
  Object.defineProperty(app, "plugins", { get: /** Unknown host accessors are not a discovery API. */ () => { throw Error("Private failure"); } });
  const result = readSupportCustomizations(app);
  assert.equal(result.activePluginsAvailability, "unavailable"); assert.equal(result.activePluginTotalCount, null);
  assert.equal(result.customThemeAvailability, "available"); assert.equal(result.customThemeName, null);
  assert.equal(result.cssSnippetsAvailability, "available");
});

test("loaded plugin retention is bounded while total count remains exact", /** Dense cached metadata never copies plugin settings or grows the retained list past 512. */ () => {
  const app = cachedHost(); app.plugins.plugins = {};
  for (let i = 0; i < 700; i++) app.plugins.plugins[`plugin-${i}`] = { manifest: { id: `plugin-${i}`, name: `Plugin ${i}`, version: "1.0.0" } };
  const result = readSupportCustomizations(app);
  assert.equal(result.activePlugins.length, 512); assert.equal(result.activePluginTotalCount, 701);
});
