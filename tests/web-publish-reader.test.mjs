/** Exercise the actual pinned runtime from a complete publication at two hosted paths. */
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {readFile, writeFile} from "node:fs/promises";
import {createServer} from "node:http";
import {join} from "node:path";
import test from "node:test";
import {runInNewContext} from "node:vm";
import {createValidationRun} from "../scripts/validationArtifacts.mjs";
import {browserBundle, chromiumHarness} from "./support/browserTypeScript.mjs";

const home = "11111111-1111-4111-8111-111111111111";
const map = "22222222-2222-4222-8222-222222222222";
const other = "33333333-3333-4333-8333-333333333333";
const publicationId = "44444444-4444-4444-8444-444444444444";
const prefix = "/notes/testing/";
const notePath = id => `notes/${id}.html`;
const selectors = {canvas: "[data-kplex-demo]", sidecar: ".kplex-publication-note", content: ".kplex-publication-note-content"};
const media = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAScY42YAAAAASUVORK5CYII=", "base64");
const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");
const asset = `assets/${sha256(media)}.png`;
const moduleWindow = {};
runInNewContext(await browserBundle(["src/core/plex/publicationSearch.ts", "src/application/publish/sitePackage.ts"]), {window: moduleWindow, TextEncoder});
const {buildPublicationSearch, readPublicationSearch, assemblePublicationSite} = moduleWindow.sourceModules;

async function builtPack() {
  const version = JSON.parse(await readFile(new URL("../manifest.json", import.meta.url), "utf8")).version;
  return JSON.parse(await readFile(new URL(`../dist-web/kplex-web-runtime-${version}.json`, import.meta.url), "utf8"));
}

async function publicationSite() {
  const pack = await builtPack();
  const notes = new Map();
  // Introduce adversarial content after the authoring boundary to prove the reader sanitizes again.
  notes.set(notePath(home), Buffer.from(`<h2 id="h-introduction">Introduction</h2><p>Read the <a href="?node=${map}#h-projection">map</a>.</p>
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 60"><a href="?node=${map}#h-projection"><rect x="0" y="0" width="160" height="60" fill="#7543ab"/><text x="15" y="28" fill="white">Linked diagram</text></a></svg>
    <img src="./${asset}" alt="Verified media"/><a href="./${asset}">Download diagram pixels</a><img src="https://example.invalid/remote.png" alt="Outside"/>
    <script>window.publicNoteScriptRan = true</script><a href="javascript:alert(1)" onclick="alert(1)">Unsafe target</a>`));
  notes.set(notePath(map), Buffer.from(`<h2 id="h-projection">Projection</h2><p>The diagram describes a shared topology.</p><a href="?node=${home}#h-introduction">Start over</a>`));
  notes.set(notePath(other), Buffer.from(`<h2 id="h-elsewhere">Elsewhere</h2><p>A separate public thought.</p>`));
  notes.set(asset, media);
  const theme = "@media (prefers-color-scheme: light) { .kplex-publication { --background-primary: #faf1f3; } }\n@media (prefers-color-scheme: dark) { .kplex-publication { --background-primary: #21131e; } }\n";
  const graph = {id: publicationId, title: "Published reference guide", entry: home,
    appearance: {maximum: 1, flip: true, typography: {wrapNodeLabels: true}},
    nodes: [{id: home, title: "Start", kind: "document", style: {fill: "#abd9eb", color: "#37243e", fontSize: 22, gateRadius: 8},
      roleStyles: {center: {fill: "#dec9ed", gateRadius: 12}}},
      {id: map, title: "Atlas", kind: "drawing", aliases: ["Cartography"], style: {fill: "#cee3d5", gateRadius: 9}},
      {id: other, title: "Atlas", kind: "document", style: {fill: "#eee9d2", color: "#241732"},
        roleStyles: {inferred: {fill: "#f3d7ad", color: "#724d28", gateRadius: 8}, sibling: {fill: "#d2d9f2", gateRadius: 10}}}],
    relations: [
      {source: home, target: map, role: "left", relationType: 1, direction: 1, definition: "Shown",
        style: {stroke: "#aa4488", width: 2.4, startHead: "triangle", endHead: "none"}},
      {source: home, target: other, role: "left", relationType: 2, direction: 3},
      {source: home, target: other, role: "right", relationType: 2, direction: 3, style: {stroke: "#5522ee", arrowEnd: false}},
      {source: map, target: home, role: "right", relationType: 1, direction: 2, definition: "Shown", style: {endHead: "bar"}},
    ],
  };
  const exported = await assemblePublicationSite(graph, [...notes].map(([path, bytes]) => ({path, bytes})), pack, {
    digest: async bytes => sha256(bytes), current: () => true, signal: new AbortController().signal, theme,
    search: [{id: map, text: "The diagram describes a rareword in rendered note text."}],
  });
  return serveSite(exported.files);
}

async function serveSite(artifacts) {
  const files = new Map(artifacts.map(({path, bytes}) => [path, Buffer.from(bytes)]));
  const requests = [], pause = new Map();
  const types = {html: "text/html", js: "text/javascript", css: "text/css", json: "application/json", png: "image/png"};
  const server = createServer((request, response) => {
    const url = new URL(request.url, "http://localhost");
    const path = url.pathname.replace(/^\/(?:notes\/testing\/)?/, "") || "index.html";
    requests.push(path);
    const reply = () => {
      if (response.destroyed) return;
      const bytes = files.get(path);
      if (!bytes) return void response.writeHead(404).end();
      response.writeHead(200, {"Content-Type": types[path.split(".").at(-1)] ?? "text/plain", "Cache-Control": "no-store"}).end(bytes);
    };
    if (pause.has(path)) setTimeout(reply, pause.get(path)); else reply();
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  return {url: `http://127.0.0.1:${server.address().port}`, requests, files, pause, close: () => new Promise(resolve => server.close(resolve))};
}

async function waitFor(host, expression, milliseconds = 7000) {
  const end = Date.now() + milliseconds;
  while (Date.now() < end) {
    try {if (await host.evaluate(expression)) return;}
    catch (error) {if (!/Execution context|Cannot find context/.test(String(error))) throw error;}
    await new Promise(resolve => setTimeout(resolve, 25));
  }
  throw new Error(`Reader did not settle: ${expression}`);
}

const find = css => `document.querySelector(${JSON.stringify(css)})`;
const center = (id, root = selectors.canvas) => `${find(`${root} [data-publication-center]`)}?.dataset.publicationNode === ${JSON.stringify(id)}`;
const bodyContains = text => `${find(selectors.content)}?.textContent.includes(${JSON.stringify(text)})`;

async function cardAppearance(host, id) {
  return host.evaluate(`(() => {
    const card = ${find(`[data-publication-node="${id}"]`)}, style = getComputedStyle(card);
    return {fill: style.backgroundColor, color: style.color, gate: Number(parseFloat(style.getPropertyValue('--kplex-gate-size')).toFixed(3))};
  })()`);
}

async function press(host, key, code, windowsVirtualKeyCode) {
  for (const type of ["keyDown", "keyUp"]) await host.command("Input.dispatchKeyEvent", {type, key, code, windowsVirtualKeyCode,
    ...(type === "keyDown" && key === "Enter" ? {text: "\r"} : {})});
}

async function type(host, css, value) {
  await host.evaluate(`${find(css)}.focus(); ${find(css)}.select()`);
  await host.command("Input.insertText", {text: value});
  assert.equal(await host.evaluate(`${find(css)}.value`), value);
}

async function click(host, css) {
  await host.evaluate(`${find(css)}.click()`);
}

test("exported full-text postings are deterministic, deduplicated and restricted to published document IDs", () => {
  const left = {id: home, text: "  Atlas ATLAS\nréférence "}, right = {id: map, text: "atlas figure"};
  const search = buildPublicationSearch([right, left]);
  assert.equal(JSON.stringify(search), JSON.stringify(buildPublicationSearch([left, right])));
  assert.deepEqual(JSON.parse(JSON.stringify(search.terms)), [["atlas", [0, 1]], ["figure", [1]], ["référence", [0]]]);
  assert.equal(JSON.stringify(readPublicationSearch(search, new Set([home, map]))), JSON.stringify(search));
  assert.throws(() => readPublicationSearch(search, new Set([home])), /Invalid publication search row/);
  assert.throws(() => readPublicationSearch({...search, terms: [["atlas", [1, 1]]]}, new Set([home, map])), /Invalid publication search reference/);
  assert.throws(() => readPublicationSearch({...search, terms: [["atlas", [2]]]}, new Set([home, map])), /Invalid publication search reference/);
});

test("the exact ZIP downloaded by Obsidian works at a nested static URL", {skip: !process.env.KPLEX_NATIVE_PUBLICATION_ZIP}, async () => {
  const zip = await readFile(process.env.KPLEX_NATIVE_PUBLICATION_ZIP);
  const bytes = new Map();
  for (let at = 0; at + 30 <= zip.length && zip.readUInt32LE(at) === 0x04034b50;) {
    assert.equal(zip.readUInt16LE(at + 8), 0, "production archive uses ZIP store entries");
    const size = zip.readUInt32LE(at + 18), length = zip.readUInt16LE(at + 26), extra = zip.readUInt16LE(at + 28);
    const begin = at + 30 + length + extra, end = begin + size;
    assert(end <= zip.length);
    const path = zip.toString("utf8", at + 30, at + 30 + length);
    assert(!bytes.has(path));
    bytes.set(path, zip.subarray(begin, end));
    at = end;
  }
  const manifest = JSON.parse(bytes.get("publication.json"));
  assert.equal(manifest.version, 2);
  for (const {path, sha256: hash} of manifest.resources) assert.equal(sha256(bytes.get(path)), hash);
  const site = await publicationSite();
  site.files.clear();
  for (const [path, bytesForPath] of bytes) site.files.set(path, bytesForPath);
  let browser;
  try {
    browser = await chromiumHarness("window.sourceModules = {};");
    await browser.command("Page.navigate", {url: `${site.url}${prefix}`});
    await waitFor(browser, center(manifest.entry));
    const guide = manifest.nodes.find(node => node.title === "Guide");
    await waitFor(browser, `!!${find(`${selectors.content} a[href*="${guide.id}"]`)}`);
    await click(browser, `${selectors.content} a[href*="${guide.id}"]`);
    await waitFor(browser, `${center(guide.id)} && ${bodyContains("Published guide text")}`);
    const drawing = manifest.nodes.find(node => node.kind === "drawing");
    if (drawing) {
      await browser.command("Page.navigate", {url: `${site.url}${prefix}?node=${drawing.id}`});
      await waitFor(browser, `${center(drawing.id)} && !!${find(`${selectors.content} svg a`)}`);
      await browser.evaluate(`${find(`${selectors.content} svg a`)}.focus()`);
      await press(browser, "Enter", "Enter", 13);
      await waitFor(browser, `${center(guide.id)} && location.hash === '#h-guide'`);
    }
  } finally {
    await browser?.cleanup();
    await site.close();
  }
});

test("a pinned production reader navigates, searches and renders only admitted static resources", async () => {
  const site = await publicationSite();
  const visual = process.env.KPLEX_BROWSER_VISUAL_EVIDENCE === "true" ? createValidationRun("publish-reader-visual") : null;
  const capture = async (host, filename) => {
    if (visual) await writeFile(join(visual.directory, filename), Buffer.from((await host.command("Page.captureScreenshot", {format: "png"})).data, "base64"));
  };
  let host;
  try {
    host = await chromiumHarness("window.sourceModules = {};");
    await host.command("Emulation.setDeviceMetricsOverride", {width: 1200, height: 800, deviceScaleFactor: 1, mobile: false});
    await host.command("Page.navigate", {url: `${site.url}/`});
    await waitFor(host, center(home));
    await host.command("Page.navigate", {url: `${site.url}${prefix}`});
    await waitFor(host, `${center(home)} && ${bodyContains("Introduction")} && location.pathname === ${JSON.stringify(prefix)}`);
    await waitFor(host, `${find('img[alt="Verified media"]')}?.src.startsWith('blob:')`);
    await waitFor(host, `${find(`${selectors.content} a[download]`)}?.href.startsWith('blob:')`);
    assert.equal(await host.evaluate(`${find('img[alt="Outside"]')}?.getAttribute('src') ?? null`), null);
    assert.equal(await host.evaluate("window.publicNoteScriptRan ?? false"), false);
    assert.equal(await host.evaluate(`${find('a[onclick]')} === null`), true);
    assert.equal(site.requests.includes("data/search.json"), false);
    await waitFor(host, `getComputedStyle(${find(".kplex-publication")}).backgroundColor === 'rgb(250, 241, 243)'`);
    assert.deepEqual(await cardAppearance(host, home), {fill: "rgb(222, 201, 237)", color: "rgb(55, 36, 62)", gate: 12.6});
    assert.equal(await host.evaluate(`getComputedStyle(${find("[data-publication-center]")}).fontSize`), "15.84px");
    assert.equal((await cardAppearance(host, map)).gate, 9.45);
    assert.deepEqual(await cardAppearance(host, other), {fill: "rgb(243, 215, 173)", color: "rgb(114, 77, 40)", gate: 8.4});
    const styledEdge = find('.kplex-edge-visible[stroke="#aa4488"]');
    assert.equal(await host.evaluate(`${styledEdge}?.getAttribute('stroke-width')`), "2.4");
    assert.match(await host.evaluate(`${styledEdge}?.getAttribute('marker-start')`), /-triangle\)$/);
    assert.equal(await host.evaluate(`${styledEdge}?.getAttribute('marker-end')`), null);
    const compatibleEdge = find('.kplex-edge-visible[stroke="#5522ee"]');
    assert.match(await host.evaluate(`${compatibleEdge}?.getAttribute('marker-start')`), /-arrow\)$/);
    assert.equal(await host.evaluate(`${compatibleEdge}?.getAttribute('marker-end')`), null);
    assert.match(await host.evaluate(`${find(".kplex-publication-status")}.textContent`), /display limit/);
    await capture(host, "wide-light.png");

    await host.evaluate(`${find(`${selectors.content} svg a`)}.focus()`);
    await press(host, "Enter", "Enter", 13);
    await waitFor(host, `${center(map)} && ${bodyContains("shared topology")} && location.hash === '#h-projection'`);
    assert.equal(await host.evaluate("document.activeElement.textContent"), "Atlas");
    assert.deepEqual(await cardAppearance(host, home), {fill: "rgb(171, 217, 235)", color: "rgb(55, 36, 62)", gate: 8.4});
    assert.deepEqual(await cardAppearance(host, other), {fill: "rgb(210, 217, 242)", color: "rgb(114, 77, 40)", gate: 8.925});
    assert.match(await host.evaluate(`${find('.kplex-edge[data-publication-source="attention"] .kplex-edge-visible')}?.getAttribute('marker-end')`), /-bar\)$/);
    await host.evaluate("history.back()");
    await waitFor(host, `${center(home)} && ${bodyContains("Introduction")}`);
    await host.evaluate("history.forward()");
    await waitFor(host, `${center(map)} && ${bodyContains("shared topology")}`);
    await host.evaluate("window.readerBeforeReload = true");
    await host.command("Page.reload");
    await waitFor(host, `!window.readerBeforeReload && ${center(map)} && ${bodyContains("shared topology")}`);
    assert.equal(await host.evaluate("location.hash"), "#h-projection");
    await click(host, '[aria-label="History back"]');
    await waitFor(host, center(home));
    await click(host, '[aria-label="History forward"]');
    await waitFor(host, center(map));

    const search = '[aria-label="Find a thought"]';
    const address = ".kplex-publication-address input";
    await type(host, address, "Atlas");
    await press(host, "Enter", "Enter", 13);
    await waitFor(host, "document.querySelectorAll('.kplex-publication-address-matches button').length === 2");
    await click(host, ".kplex-publication-address-matches li:last-child button");
    await waitFor(host, `${center(other)} && ${bodyContains("separate public thought")}`);
    await type(host, search, "Cartography");
    await waitFor(host, `${find(".kplex-search-result")}?.textContent.includes('Atlas')`);
    await press(host, "Enter", "Enter", 13);
    await waitFor(host, center(map));
    assert.equal(site.requests.includes("data/search.json"), false);
    await click(host, 'button[aria-pressed="false"]');
    await waitFor(host, "!document.querySelector('.kplex-publication-search-options [role=status]')");
    await type(host, search, "rareword");
    await waitFor(host, `${find(".kplex-search-result")}?.textContent.includes('rareword')`);
    assert.equal(site.requests.filter(path => path === "data/search.json").length, 1);

    await host.command("Emulation.setDeviceMetricsOverride", {width: 390, height: 750, deviceScaleFactor: 1, mobile: true});
    await host.command("Emulation.setEmulatedMedia", {features: [{name: "prefers-color-scheme", value: "dark"}]});
    await waitFor(host, `getComputedStyle(${find(".kplex-publication")}).backgroundColor === 'rgb(33, 19, 30)'`);
    await host.evaluate(`${find('[aria-label="Find a thought"]')}.blur()`);
    await capture(host, "narrow-dark.png");
    const layout = await host.evaluate(`(() => {const side=${find(selectors.sidecar)}.getBoundingClientRect();const graph=${find(".kplex-publication-viewport")}.getBoundingClientRect();return {sideTop:side.top,graphBottom:graph.bottom,pageWidth: document.documentElement.scrollWidth}})()`);
    assert(layout.sideTop + 0.5 >= layout.graphBottom && layout.pageWidth <= 390, JSON.stringify(layout));
    await click(host, 'button[aria-label="Close Sidecar"]');
    await waitFor(host, `${find(selectors.sidecar)} === null && document.activeElement.textContent === 'Show Sidecar'`);
    await click(host, 'button[aria-expanded="false"][aria-controls]');
    await waitFor(host, bodyContains("shared topology"));
  } finally {
    await host?.cleanup(); await site.close();
    if (visual) {visual.complete(); console.log(`Visual evidence ${visual.directory}`);}
  }
});

test("stale notes, bad checksums and embedded mounts cannot affect another reader", async () => {
  const site = await publicationSite();
  let host;
  try {
    host = await chromiumHarness("window.sourceModules = {};");
    await host.command("Page.navigate", {url: `${site.url}${prefix}?node=${map}`});
    await waitFor(host, `${center(map)} && ${bodyContains("shared topology")}`);
    site.pause.set(notePath(home), 500);
    await click(host, `${selectors.content} a`);
    await waitFor(host, center(home));
    await type(host, ".kplex-publication-address input", other);
    await click(host, ".kplex-publication-address button[type=submit]");
    await waitFor(host, `${center(other)} && ${bodyContains("separate public thought")}`);
    await new Promise(resolve => setTimeout(resolve, 550));
    assert.equal(await host.evaluate(bodyContains("Introduction")), false);

    const original = site.files.get(notePath(map));
    site.files.set(notePath(map), Buffer.alloc(original.length, 65));
    await type(host, ".kplex-publication-address input", map);
    await click(host, ".kplex-publication-address button[type=submit]");
    await waitFor(host, `${find(`${selectors.sidecar} [role=alert]`)}?.textContent.includes('Could not open this note')`);
    assert.equal(await host.evaluate(`${find(selectors.content)}.childElementCount`), 0);
    site.files.set(notePath(map), original);
    await click(host, `${selectors.sidecar} [role=alert] button`);
    await waitFor(host, bodyContains("shared topology"));

    const standaloneURL = await host.evaluate("location.href");
    await host.evaluate(`(async () => {
      const publicationUrl=new URL('./publication.json',location.href);
      const manifest=await(await fetch(publicationUrl)).json();
      const {mountCompass}=await import('./runtime/compass.js');
      const left=document.createElement('div'),right=document.createElement('div');
      left.id='embedded-left';right.id='embedded-right';document.body.append(left,right);
      window.embeddedLeft=mountCompass(left,manifest,{publicationUrl});
      window.embeddedRight=mountCompass(right,{...manifest,entry:'${other}'},{publicationUrl});
    })()`);
    await waitFor(host, `${center(home, "#embedded-left")} && ${center(other, "#embedded-right")}`);
    await click(host, `#embedded-left [data-publication-node="${map}"]`);
    await waitFor(host, `${center(map, "#embedded-left")} && ${center(other, "#embedded-right")}`);
    assert.equal(await host.evaluate("location.href"), standaloneURL);
    assert.equal(await host.evaluate(`(() => {try {window.embeddedLeft.update({version:2});} catch {return ${center(map, "#embedded-left")}} return false;})()`), true);
    await host.evaluate("window.embeddedLeft.dispose(); window.embeddedRight.dispose()");
    assert.equal(await host.evaluate("document.getElementById('embedded-left').childElementCount + document.getElementById('embedded-right').childElementCount"), 0);
  } finally {await host?.cleanup(); await site.close();}
});

const scaleEnabled = process.env.KPLEX_PUBLISH_SCALE === "true";

test("static reader remains usable for a 3,000-note publication and reports dense overflow", {skip: !scaleEnabled}, async () => {
  const run = createValidationRun("publish-reader-scale");
  const report = {completed: false};
  let site, host;
  try {
    const nodeCount = 3000, denseCount = 240, regionMaximum = 80;
    const nodes = Array.from({length: nodeCount}, (_, index) => ({
      id: `43fe67a0-0c67-4d68-bf0a-${String(index).padStart(12, "0")}`,
      title: `Reader note ${String(index).padStart(4, "0")}`,
      kind: "document",
    }));
    const tokens = nodes.map((_, index) => `focus${String(index).padStart(4, "0")}`);
    const fileText = nodes.map(({id}, index) => ({id, text: `Scale test discussion ${tokens[index]}, sample approved published text.`}));
    const notes = fileText.map(({id, text}) => ({path: notePath(id), bytes: new TextEncoder().encode(`<p>${text}</p>`)}));
    const relations = [];
    for (const node of nodes.slice(1, denseCount + 1)) {
      relations.push({source: nodes[0].id, target: node.id, role: "left", relationType: 1, direction: 1},
        {source: node.id, target: nodes[0].id, role: "right", relationType: 1, direction: 2});
    }
    for (let index = 1; index < nodes.length - 1; index++) {
      relations.push({source: nodes[index].id, target: nodes[index + 1].id, role: "next", relationType: 1, direction: 1},
        {source: nodes[index + 1].id, target: nodes[index].id, role: "previous", relationType: 1, direction: 2});
    }
    Object.assign(report, {nodeCount, relationCount: relations.length, denseCount, regionMaximum, revision: "real built runtime and site assembler"});
    const pack = await builtPack();
    const startAssembly = performance.now();
    const bundle = await assemblePublicationSite({id: publicationId, title: "Reader scale fixture", entry: nodes[0].id, nodes, relations,
      appearance: {maximum: regionMaximum}}, notes, pack, {
      digest: async bytes => sha256(bytes), current: () => true, signal: new AbortController().signal, search: fileText,
    });
    report.assemblyMs = performance.now() - startAssembly;
    site = await serveSite(bundle.files);
    report.bytes = {manifest: site.files.get("publication.json").length, search: site.files.get("data/search.json").length,
      publication: bundle.files.reduce((total, file) => total + file.bytes.byteLength, 0)};
    host = await chromiumHarness("window.sourceModules = {};");
    report.browser = (await host.command("Browser.getVersion")).product;
    await host.command("Performance.enable");
    const first = nodes[0].id;
    const cold = [];
    for (const path of ["/", prefix]) {
      const start = performance.now();
      await host.command("Page.navigate", {url: `${site.url}${path}`});
      await waitFor(host, `location.pathname === ${JSON.stringify(path)} && ${center(first)} && ${bodyContains(tokens[0])}`, 30_000);
      cold.push({path, usableMs: performance.now() - start});
    }
    report.cold = cold;
    await waitFor(host, `${find(".kplex-publication-status")}?.textContent.includes('display limit')`, 30_000);
    const dense = await host.evaluate(`(() => {
      const center = document.querySelector('[data-publication-center]');
      return {gate: Number(center.querySelector('.gate-wrap-left .kplex-gate-count')?.textContent),
        cards: document.querySelectorAll('[data-publication-node]').length,
        directEdges: document.querySelectorAll('.kplex-edge[data-publication-source="attention"]').length};
    })()`);
    assert.equal(dense.gate, denseCount);
    assert.equal(dense.directEdges, regionMaximum);
    assert(dense.cards > regionMaximum && dense.cards < denseCount + 1);
    report.dense = dense;
    report.heapAfterReadyBytes = (await host.command("Performance.getMetrics")).metrics.find(metric => metric.name === "JSHeapUsedSize")?.value;
    assert.equal(site.requests.includes("data/search.json"), false);
    const address = ".kplex-publication-address input", search = '[aria-label="Find a thought"]';
    const samples = Array.from({length: 20}, (_, index) => 300 + index * 128);
    const navigation = [], titleSearch = [], textSearch = [];
    for (const index of samples) {
      const start = performance.now();
      await type(host, address, nodes[index].id);
      await press(host, "Enter", "Enter", 13);
      await waitFor(host, `${center(nodes[index].id)} && ${bodyContains(tokens[index])}`, 30_000);
      navigation.push(performance.now() - start);
    }
    for (const index of samples) {
      const query = nodes[index].title;
      const start = performance.now();
      await type(host, search, query);
      await waitFor(host, `${find(".kplex-search-result")}?.textContent.trim() === ${JSON.stringify(query)}`, 30_000);
      titleSearch.push(performance.now() - start);
    }
    assert.equal(site.requests.includes("data/search.json"), false);
    const startText = performance.now();
    await click(host, 'button[aria-pressed="false"]');
    for (const index of samples) {
      const term = tokens[index];
      const start = performance.now();
      await type(host, search, term);
      await waitFor(host, `${find(".kplex-search-result small")}?.textContent.includes(${JSON.stringify(term)})`, 30_000);
      textSearch.push(performance.now() - start);
      if (index === samples[0]) report.firstFullTextResultMs = performance.now() - startText;
    }
    assert.equal(site.requests.filter(path => path === "data/search.json").length, 1);
    const percentiles = times => {
      const sorted = [...times].sort((left, right) => left - right);
      return {samples: times, p50: sorted[Math.ceil(times.length * 0.5) - 1], p95: sorted[Math.ceil(times.length * 0.95) - 1]};
    };
    report.timings = {navigation: percentiles(navigation), titleSearch: percentiles(titleSearch), textSearch: percentiles(textSearch.slice(1))};
    report.heapAfterInteractionsBytes = (await host.command("Performance.getMetrics")).metrics.find(metric => metric.name === "JSHeapUsedSize")?.value;
    report.timingMethod = "Local loopback, end to end from test action to observed DOM, including Chromium automation and polling overhead. Full-text warm samples exclude the initial index load.";
    report.completed = true;
  } catch (error) {
    report.error = String(error);
    throw error;
  } finally {
    try {
      await host?.cleanup(); await site?.close();
      await writeFile(join(run.directory, "reader-scale.json"), JSON.stringify(report, null, 2) + "\n");
      console.log(`Scale evidence ${run.directory}`);
    } finally {run.complete();}
  }
});
