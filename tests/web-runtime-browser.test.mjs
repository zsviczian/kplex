import assert from "node:assert/strict";
import {readFile, readdir} from "node:fs/promises";
import {createServer} from "node:http";
import test from "node:test";
import {runInNewContext} from "node:vm";
import {browserBundle, chromiumHarness} from "./support/browserTypeScript.mjs";

const artifacts = new URL("../dist-web/", import.meta.url);

test("one synthetic publication has the same Compass roles, bounds and connector routes in both hosts", async () => {
  const fixture = JSON.parse(await readFile(new URL("../src/web/publication.json", import.meta.url), "utf8"));
  const window = {};
  runInNewContext(await browserBundle(["src/web/publication.ts", "src/web/scene.ts", "src/ui/plexViews/classic/layout.ts",
    "src/core/plex/views/classic/projection.ts", "src/core/plex/views/classic/definition.ts", "src/core/plex/nodeGeometry.ts",
    "src/core/plex/connectorGeometry.ts"]), {window});
  const {readPublication, publicationScene, buildScene, projectClassicNeighborhood, CLASSIC_NEIGHBOR_ROLES,
    classicPorts, gateDiameter, connectorGatePoint, edgeGeometry} = window.sourceModules;
  const publication = readPublication(fixture);
  const {cards, edges} = publicationScene(publication, publication.entry);
  const pages = new Map(fixture.nodes.map(({id, title}) => [id, {path: id, name: title, file: {extension: "md"}, styleTags: []}]));
  const neighbours = (page, role) => Array.from(publication.read.relations(page.path, role).items, value => ({
    page: pages.get(value.node.id), role: value.role, relationType: value.relationType, typeDefinition: value.definition, linkDirection: value.direction,
  }));
  const neighborhood = projectClassicNeighborhood(pages.get(fixture.entry), {identity: page => page.path, neighbours,
    sort: rows => rows.sort((a, b) => publication.read.compare(publication.read.node(a.page.path), publication.read.node(b.page.path)))}, 100, true);
  const index = {titleFor: page => page.name, neighbours,
    visibleRelationshipsWithin: (source, targets) => CLASSIC_NEIGHBOR_ROLES.flatMap(role => neighbours(source, role)).filter(row => targets.has(row.page.path))};
  // Match the standalone presentation with the native depth-one profile and no expanded strips.
  const settings = {compactingFactor: 2, horizontalCompactingFactor: 2, compactView: false, minLinkLength: 18,
    graphDepth: 1, maxItemCount: 100, parentColumns: 2, childColumns: 5, siblingRelativeSize: 85,
    parentMaxHeight: 300, childMaxHeight: 400, friendMaxHeight: 350, siblingMaxHeight: 250, baseFontSize: 12.4,
    wrapNodeLabels: false, propertyFontSize: 10, baseNodeStyle: {fontSize: 20, gateRadius: 5, strokeWidth: 1},
    centralNodeStyle: {fontSize: 30}, siblingNodeStyle: {fontSize: 15}, tagStyleList: [], tagNodeStyles: {},
    hierarchyLinkStyles: {}, baseLinkStyle: {showLabel: true, endArrowHead: "arrow"}};
  const native = buildScene(neighborhood, index, settings, false, undefined, true, undefined, false, false);
  const comparable = value => JSON.parse(JSON.stringify(value));
  assert.deepEqual(comparable(cards.map(({node, role, bounds: {x,y,width,height}, gateSize}) => [node.id, role, x, y, width, height, gateSize])),
    comparable(native.nodes.map(({page, role, x, y, width, height, style}) => [page.path, role, x, y, width, height, gateDiameter(style)])));
  const browserCards = new Map(cards.map(card => [card.id, card]));
  const nativeCards = new Map(native.nodes.map(card => [card.page.path, card]));
  const routes = native.edges.map(({sourcePath, targetPath, role, typeDefinition}) => {
    const source = nativeCards.get(sourcePath), target = nativeCards.get(targetPath), ports = classicPorts(role);
    const route = edgeGeometry(connectorGatePoint(source, ports.source, gateDiameter(source.style)),
      connectorGatePoint(target, ports.target, gateDiameter(target.style)), ports.source, ports.target, "bezier");
    return [sourcePath, targetPath, typeDefinition ?? null, route.d];
  });
  assert.deepEqual(comparable(edges.map(edge => [browserCards.get(edge.source).node.id, browserCards.get(edge.target).node.id, edge.label, edge.route.d]).sort()),
    comparable(routes.sort()));
});

async function localPublication() {
  const files = new Set(await readdir(artifacts));
  const types = {html: "text/html", js: "text/javascript", css: "text/css", json: "application/json"};
  const server = createServer(async (request, response) => {
    const path = new URL(request.url, "http://localhost").pathname;
    const name = path.replace(/^\/(?:notes\/fieldwork\/)?/, "") || "index.html";
    if (!files.has(name)) return void response.writeHead(404).end();
    response.setHeader("Content-Type", types[name.split(".").at(-1)] ?? "text/plain");
    response.end(await readFile(new URL(name, artifacts)));
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  return {url: `http://127.0.0.1:${server.address().port}`, close: () => new Promise(resolve => server.close(resolve))};
}

async function waitFor(host, expression) {
  const deadline = Date.now() + 10_000;
  for (;;) {
    try {
      const value = await host.evaluate(expression);
      if (value) return value;
    } catch (error) {
      if (!/Execution context|Cannot find context/.test(String(error))) throw error;
    }
    if (Date.now() >= deadline) throw new Error(`Publication did not settle: ${expression}`);
    await new Promise(resolve => setTimeout(resolve, 30));
  }
}

test("standalone Compass loads its artifacts over HTTP and interacts with shared paint", async () => {
  const site = await localPublication();
  let host;
  try {
    host = await chromiumHarness("window.sourceModules = {};");
    await host.command("Page.navigate", {url: `${site.url}/notes/fieldwork/`});
    const center = selector => `document.querySelector('${selector || "[data-kplex-demo]"} [data-publication-center]')?.dataset.publicationNode`;
    assert.equal(await waitFor(host, center()), "n1");
    const geometry = await host.evaluate(`(() => {
      const cards = [...document.querySelectorAll('[data-publication-node]')];
      const group = document.querySelector('[data-publication-source="attention"]');
      const path = group.querySelector('.kplex-edge-visible');
      const source = document.querySelector('[data-publication-center]');
      const target = cards.find(card => card.dataset.publicationOccurrence === group.dataset.publicationTarget);
      const point = distance => path.getPointAtLength(distance).matrixTransform(path.getScreenCTM());
      const error = (p, gate) => {const rect=gate.getBoundingClientRect();return Math.hypot(rect.x+rect.width/2-p.x,rect.y+rect.height/2-p.y)};
      return {roles: cards.map(card => card.className), labels: Array.from(document.querySelectorAll('.kplex-edge-label'), label => label.textContent),
        font: getComputedStyle(source).fontSize, size: source.getBoundingClientRect().width,
        sourceError: Math.min(...Array.from(source.querySelectorAll('[data-kplex-gate]'), gate => error(point(0), gate))),
        targetError: Math.min(...Array.from(target.querySelectorAll('[data-kplex-gate]'), gate => error(point(path.getTotalLength()), gate)))};
    })()`);
    assert.deepEqual(geometry.roles, ["center", "parent", "child", "child", "left", "right", "sibling", "sibling"].map(role => `kplex-thought kplex-role-${role}`));
    assert(geometry.labels.includes("Survey") && geometry.labels.includes("Sample"));
    assert.equal(geometry.font, "21.6px");
    assert(geometry.size > 50 && geometry.sourceError < 1 && geometry.targetError < 1, JSON.stringify(geometry));

    const click = async selector => {
      const point = await host.evaluate(`(() => { const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`);
      for (const type of ["mousePressed", "mouseReleased"]) await host.command("Input.dispatchMouseEvent", {type,...point,button:"left",clickCount:1});
    };
    await click('[data-publication-node="n4"]');
    await waitFor(host, `${center()} === 'n4'`);
    await click('[aria-label="History back"]');
    await waitFor(host, `${center()} === 'n1'`);
    await click('[aria-label="History forward"]');
    await waitFor(host, `${center()} === 'n4'`);
    await host.evaluate(`document.querySelector('[data-publication-center]').focus()`);
    for (const type of ["keyDown", "keyUp"]) await host.command("Input.dispatchKeyEvent", {type,key:"ArrowDown",code:"ArrowDown",windowsVirtualKeyCode:40});
    assert.equal(await host.evaluate("document.activeElement.dataset.publicationNode"), "n7");
    for (const type of ["keyDown", "keyUp"]) await host.command("Input.dispatchKeyEvent", {type,key:"Enter",code:"Enter",windowsVirtualKeyCode:13});
    await waitFor(host, `${center()} === 'n7' && document.activeElement.dataset.publicationNode === 'n7'`);

    const transform = "document.querySelector('.kplex-camera').style.transform";
    const before = await host.evaluate(transform);
    await click('[aria-label="Zoom in"]');
    assert.notEqual(await host.evaluate(transform), before);
    const viewport = await host.evaluate(`(() => {const r=document.querySelector('.kplex-publication-viewport').getBoundingClientRect();return {x:r.x+30,y:r.y+30};})()`);
    const zoomed = await host.evaluate(transform);
    for (const [type,offset] of [["mousePressed",0],["mouseMoved",16],["mouseMoved",42],["mouseReleased",42]]) {
      await host.command("Input.dispatchMouseEvent", {type,x:viewport.x+offset,y:viewport.y+offset,button:"left",buttons:type === "mouseReleased" ? 0 : 1,clickCount:1});
    }
    assert.notEqual(await host.evaluate(transform), zoomed);
    await click('.kplex-publication-controls button:last-child');
    assert.equal(await host.evaluate(transform), before);
    await host.command("Input.dispatchMouseEvent", {type:"mouseWheel",...viewport,deltaX:0,deltaY:-70});
    await waitFor(host, `${transform} !== ${JSON.stringify(before)}`);
    await click('.kplex-publication-controls button:last-child');

    await host.command("Emulation.setDeviceMetricsOverride", {width:375,height:700,deviceScaleFactor:2,mobile:true});
    await host.command("Emulation.setTouchEmulationEnabled", {enabled:true,maxTouchPoints:2});
    assert(await waitFor(host, "document.documentElement.clientWidth===375 && document.documentElement.scrollWidth===375"));
    const small = await host.evaluate(transform);
    for (const [type,offset] of [["touchStart",0],["touchMove",10],["touchMove",34],["touchEnd",null]]) {
      await host.command("Input.dispatchTouchEvent", {type,touchPoints: offset===null?[]:[{id:1,x:100-offset,y:180},{id:2,x:210+offset,y:180}]});
    }
    assert.notEqual(await host.evaluate(transform), small);
    assert.equal(await host.evaluate(center()), "n7");

    await host.command("Page.navigate", {url: `${site.url}/`});
    assert.equal(await waitFor(host, `${center()} === 'n1'`), true);
    const mounts = await host.evaluate(`(async () => {
      const {mountCompass}=await import('./compass.js');
      const fixture=await (await fetch('./publication.json')).json();
      const first=document.body.appendChild(document.createElement('div'));first.id='first';
      const second=document.body.appendChild(document.createElement('div'));second.id='second';
      window.firstMount=mountCompass(first,fixture);window.secondMount=mountCompass(second,{...fixture,entry:'n4'});
      const errors=[];
      for (const bad of [{...fixture,version:2},{...fixture,entry:'missing'},{...fixture,nodes:fixture.nodes.slice(0,7)}]) {
        try{window.firstMount.update(bad);}catch(error){errors.push(error.message);}
      }
      window.fixture=fixture;
      return errors;
    })()`);
    assert.deepEqual(mounts, ["Unsupported publication fixture version", "Missing publication entry node", "Missing publication relationship endpoint"]);
    assert.equal(await waitFor(host, center("#first")), "n1");
    assert.equal(await waitFor(host, center("#second")), "n4");
    assert.equal(await host.evaluate("new Set(Array.from(document.querySelectorAll('marker'),marker=>marker.id)).size"), 12);
    assert.equal(await host.evaluate(`(() => {const outside=document.body.appendChild(document.createElement('div'));outside.className='kplex-thought';const position=getComputedStyle(outside).position;outside.remove();return position;})()`), "static");
    await host.evaluate(`firstMount.update({...fixture, entry:'n5', nodes:fixture.nodes.map(node => node.id==='n5' ? {...node,title:'New survey'} : node).concat(Array.from({length:5000},(_,i)=>({id:'synthetic-'+i,title:'Synthetic '+i})))})`);
    await waitFor(host, `${center("#first")} === 'n5' && document.querySelector('#first h2')?.textContent === 'New survey'`);
    assert.equal(await host.evaluate(center("#second")), "n4");
    await host.evaluate("firstMount.dispose();firstMount.dispose()");
    assert.equal(await host.evaluate("document.querySelector('#first').childElementCount"), 0);
    assert.equal(await host.evaluate(center("#second")), "n4");
  } finally {
    try { await host?.cleanup(); } finally { await site.close(); }
  }
});
