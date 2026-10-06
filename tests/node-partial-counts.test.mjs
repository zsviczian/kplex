/** Render real localized node gates: partial counts are lower bounds, while complete defaults persist. */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import { build } from "esbuild";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const require = createRequire(import.meta.url);
const output = await build({ entryPoints: ["src/ui/ThoughtNode.tsx", "src/lang/index.ts"], bundle: true,
  write: false, outdir: "/private/tmp/kplex-partial-node-unused", format: "cjs", platform: "node",
  jsx: "automatic", external: ["react", "react/jsx-runtime"],
  plugins: [{ name: "typed-host-icon", setup(builder) {
    builder.onResolve({ filter: /^obsidian$/ }, () => ({ path: "obsidian", namespace: "host-icon" }));
    builder.onLoad({ filter: /.*/, namespace: "host-icon" }, () => ({ contents: "export const getIcon=()=>null;", loader: "js" }));
  } }],
});
const modules = output.outputFiles.map(file => {
  const module = { exports: {} };
  // Evaluate only locally compiled production source in the test runner with actual React dependencies.
  new Function("module", "exports", "require", file.text)(module, module.exports, require);
  return module.exports;
});
const { ThoughtNode } = modules.find(module => module.ThoughtNode);
const { createTranslator } = modules.find(module => module.createTranslator);
const translate = createTranslator("en");

/** Render the production component with narrow inert effects; no DOM or host state is fabricated. */
function renderGate(overrides = {}, pageOverrides = {}) {
  const gate = { visibleCount: 0, hasAny: false, ...overrides };
  const node = { page: { path: "P.md", name: "P", isTag: false, isFolder: false, ...pageOverrides },
    style: {}, label: "P", role: "parent", x: 0, y: 0, width: 100, height: 50,
    gateStats: { top: gate, bottom: gate, left: gate, right: gate } };
  const inert = () => {};
  return renderToStaticMarkup(React.createElement(ThoughtNode, { node, settings: { compactingFactor: 1.5, showNeighborCount: true },
    selected: false, highlighted: false, dimmed: false, highlightedGates: new Set(), translate,
    onActivate: inert, onOpen: inert, onHoverNode: inert, onHoverGate: inert, onHoverEnd: inert,
    onHoverPreview: inert, onGatePointerDown: inert, onNodePointerDown: inert }));
}

test("partial nonzero and filtered counts use lower bounds with a localized availability tooltip", () => {
  const html = renderGate({ visibleCount: 4, hasAny: true, complete: false });
  assert.match(html, />≥4<\/span>/);
  assert.match(html, /4 visible · Additional relationships may be available/);
  for (const gate of html.matchAll(/<span class="kplex-gate gate-[^>]+>/g)) assert.doesNotMatch(gate[0], / title=/);
  const filtered = renderGate({ visibleCount: 4, shownCount: 2, hasAny: true, complete: false });
  assert.match(filtered, />2\/≥4<\/span>/);
});

test("zero partial incidence avoids a false empty gate claim and preserves structural editing hints", () => {
  const html = renderGate({ complete: false });
  assert.match(html, />…<\/span>/);
  assert.match(html, /0 visible · Additional relationships may be available/);
  assert.doesNotMatch(html, /no relationships/);
  const tag = renderGate({ visibleCount: 1, hasAny: true, complete: false }, { isTag: true });
  assert.ok(tag.includes(`${translate("node.gateTagDisabled", { gate: "top" })} · ${translate("node.gatePartial")}`));
  assert.match(tag, />≥1<\/span>/);
  const folder = renderGate({ complete: false }, { isFolder: true });
  assert.match(folder, /folder relationship editing is disabled · Additional relationships may be available/);
});

test("omitted coverage preserves exact complete gate numbers, ratios and empty tooltips", () => {
  assert.match(renderGate({ visibleCount: 4, hasAny: true }), /class="kplex-gate-count">4<\/span>/);
  assert.match(renderGate({ visibleCount: 4, shownCount: 2, hasAny: true }), />2\/4<\/span>/);
  const empty = renderGate();
  assert.match(empty, /no relationships/);
  assert.doesNotMatch(empty, /kplex-gate-count|Additional relationships may be available/);
});


test("local numeric coverage retains zero/nonzero counts with a separate localized availability explanation", () => {
  const zero = renderGate({ complete: false, coverage: "local" });
  assert.match(zero, />0<\/span>/);
  assert.doesNotMatch(zero, /…|≥/);
  assert.ok(zero.includes(translate("node.gateLocalCount")));
  assert.match(renderGate({ visibleCount: 100, shownCount: 3, complete: false, coverage: "local" }), />3\/100<\/span>/);
});


test("a genuine unavailable host input shows an explicit count failure rather than a numerical guarantee", () => {
  const html = renderGate({ visibleCount: 100, complete: false, coverage: "local", countUnavailable: true });
  assert.match(html, />…<\/span>/);
  assert.ok(html.includes(translate("node.gateHostUnavailable")));
  assert.doesNotMatch(html, />100<\/span>/);
});

test("cached coverage displays saved numbers and ratios with a distinct current-validation tooltip", () => {
  const html = renderGate({ visibleCount: 4, shownCount: 2, hasAny: true, complete: false, coverage: "cached" });
  assert.match(html, />2\/4<\/span>/);
  assert.ok(html.includes(translate("node.gateCachedCount")));
  assert.doesNotMatch(html, /…|≥|Additional relationships may be available/);
  assert.match(renderGate({ complete: false, coverage: "cached" }), />0<\/span>/);
});
