/** Exercise the production native drag adapter's exact payload, identity and cleanup contracts. */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { after, test } from "node:test";
import { buildSync } from "esbuild";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const temp = mkdtempSync(join(tmpdir(), "kplex-node-link-drag-"));
const output = join(temp, "adapter.cjs");
buildSync({ stdin: { contents: `export * from './src/adapters/obsidian/nodeLinkDrag'; export {validActionArguments} from './src/core/plex/actions';`, resolveDir: root }, outfile: output, bundle: true, platform: "node", format: "cjs", logLevel: "silent" });
const api = createRequire(import.meta.url)(output);
after(() => rmSync(temp, { recursive: true, force: true }));

/** Supply finite host capabilities with hard failures for source work and one native drag owner. */
function fixture() {
  const calls = [], files = new Map();
  const manager = {
    draggable: null,
    dragLink(event, linktext, sourcePath, title, source) {
      assert.equal(this, manager);
      calls.push({ kind: "link", linktext, sourcePath, title });
      return { type: "link", title, source, icon: "lucide-link", linktext, sourcePath, file: files.get(linktext) ?? null };
    },
    onDragStart(event, draggable) { assert.equal(this, manager); calls.push({ kind: "start" }); this.draggable = draggable; },
    onDragEnd() { calls.push({ kind: "end" }); this.draggable = null; },
  };
  const forbidden = () => { throw Error("Unexpected source acquisition or enumeration"); };
  const app = { dragManager: manager, vault: { getFileByPath: path => files.get(path) ?? null, read: forbidden, getFiles: forbidden, getMarkdownFiles: forbidden } };
  const transfer = new Map(), event = { dataTransfer: { setData: (kind, value) => transfer.set(kind, value) } };
  return { app, manager, calls, files, event, transfer };
}

test('native tag links and plain tag text resolve existing tag facets without treating file headings as tags',()=>{
 const f=fixture(),tag=page({path:'tag:Parent/Child',isTag:true}),read={get:path=>path===tag.path?tag:undefined};
 f.manager.draggable={type:'link',linktext:'#Parent/Child',sourcePath:'',file:null};assert.equal(api.draggedGraphPage(f.app,read),tag);
 const file={path:'Note.md',extension:'md'};f.files.set(file.path,file);f.manager.draggable={type:'link',linktext:'#Parent/Child',sourcePath:file.path,file};assert.equal(api.draggedGraphPage(f.app,read),null);
 f.manager.draggable=null;const text=value=>({dataTransfer:{getData:()=>value}});assert.equal(api.draggedGraphPage(f.app,read,text('#Parent/Child')),tag);
 for(const value of ['#Unknown','some #Parent/Child','#Parent/Child more','[[#Parent/Child]]','https://example.com/#Parent/Child'])assert.equal(api.draggedGraphPage(f.app,read,text(value)),null);
 f.manager.draggable={type:'files',files:[]};assert.equal(api.draggedGraphPage(f.app,read,text('#Parent/Child')),null);
});

/** Construct only the graph facets consumed by the real adapter. */
function page(overrides = {}) {
  return { path: "Project/Missing", file: null, name: "Missing", isFolder: false, isTag: false, url: null, ...overrides };
}

for (const extension of ["md", "png", "pdf", "canvas"]) {
  test(`native ${extension} node drag uses the Bases link contract and current native file`, () => {
    const f = fixture(), file = { path: `Folder/Note.${extension}`, extension };
    f.files.set(file.path, file);
    const p = page({ path: file.path, file }), owner = {};
    const source = api.startNodeLinkDrag(f.app, p, f.event, owner, "child", "Visible alias", "Folder/Center.md");
    assert(source);
    assert.equal(source.owner, owner);
    assert.equal(f.manager.draggable.type, "link");
    assert.deepEqual(f.calls[0], { kind: "link", linktext: file.path, sourcePath: "Folder/Center.md", title: "Visible alias" });
    assert.equal(api.draggedGraphPage(f.app, { get: key => key === p.path ? p : undefined }), p);
    f.files.set(file.path, { ...file });
    assert.equal(api.draggedGraphPage(f.app, { get: () => p }), null, "native replacement rejects a stale source before delayed indexing catches up");
    api.finishNodeLinkDrag(f.app, source);
    assert.equal(f.manager.draggable, null);
  });
}

test("URL and path-qualified placeholder drags retain exact existing graph identity without acquisition", () => {
  for (const p of [page(), page({ path: "https://example.com/a?b=c", url: "https://example.com/a?b=c" })]) {
    const f = fixture();
    const source = api.startNodeLinkDrag(f.app, p, f.event, {}, "sibling", p.name, "Origin.md");
    assert(source);
    assert.equal(f.calls[0].linktext, p.url ?? p.path);
    assert.equal(api.draggedGraphPage(f.app, { get: identity => identity === p.path ? p : undefined }), p);
    assert.equal(api.draggedGraphPage(f.app, { get: () => page({ path: p.path, file: { path: "New.md" } }) }), null, "materializing during drag cannot silently retarget the captured placeholder");
  }
});

test("hierarchical tags export #tag text while captured metadata enables cross-Plex navigation", () => {
  const f = fixture(), p = page({ path: "tag:Research/Person/Müller", isTag: true, name: "Müller" });
  const source = api.startNodeLinkDrag(f.app, p, f.event, {}, "parent", p.name, "Origin.md");
  assert(source);
  assert.equal(f.manager.draggable, null, "Plain tag text must not invent a native host draggable type");
  assert.equal(api.nodeLinkDragSource(f.app), source);
  assert.equal(f.transfer.get("text/plain"), "#Research/Person/Müller");
  assert.equal(f.event.dataTransfer.effectAllowed,"copyLink","Editor copies and Plex link drops must both be permitted");
  assert.deepEqual(f.calls, [], "tag export must not turn a tag into a native heading link");
  assert.equal(api.draggedGraphPage(f.app, { get: () => p }), p);
  api.finishNodeLinkDrag(f.app, source);
  assert.equal(api.nodeLinkDragSource(f.app), null);
  const newer=api.startNodeLinkDrag(f.app,p,f.event,{},"child",p.name,"");
  api.finishNodeLinkDrag(f.app,source);
  assert.equal(api.nodeLinkDragSource(f.app),newer,"Late tag cleanup cannot retire a newer gesture");
  const foreign={source:{}};f.manager.draggable=foreign;
  assert.equal(api.nodeLinkDragSource(f.app),null,"A competing native drag cannot inherit tag identity");
  api.finishNodeLinkDrag(f.app,newer);assert.equal(f.manager.draggable,foreign);
});

test("unsupported nodes, competing drags and missing host methods remain inert", () => {
  for (const overrides of [{ isFolder: true }, { transient: { kind: "section" } }]) {
    const f = fixture();
    assert.equal(api.startNodeLinkDrag(f.app, page(overrides), f.event, {}, "center", "x", ""), null);
    assert.equal(f.calls.length, 0);
  }
  const f = fixture(), existing = { source: {} };
  f.manager.draggable = existing;
  assert.equal(api.startNodeLinkDrag(f.app, page(), f.event, {}, "center", "x", ""), null);
  assert.equal(f.manager.draggable, existing);
  f.manager.draggable = null;
  f.manager.dragLink = undefined;
  assert.equal(api.startNodeLinkDrag(f.app, page(), f.event, {}, "center", "x", ""), null);
  assert.equal(f.calls.length, 0);
});

test("cleanup is idempotent and cannot retire a newer drag; native file fallback remains available", () => {
  const f = fixture(), source = api.startNodeLinkDrag(f.app, page(), f.event, {}, "child", "x", "");
  const replacement = { source: {} };
  f.manager.draggable = replacement;
  api.finishNodeLinkDrag(f.app, source);
  assert.equal(f.manager.draggable, replacement);
  const file = { path: "External.md", extension: "md" }, p = page({ path: file.path, file });
  f.files.set(file.path, file);
  f.manager.draggable = { type: "file", file };
  assert.equal(api.draggedGraphPage(f.app, { get: key => key === file.path ? p : undefined }), p);
  assert.equal(api.nodeLinkDragSource(f.app), null);
});

test("folder prompting is a finite optional node-open argument, never an executable override", () => {
  for (const args of [undefined, {}, { chooseFolder: true }, { chooseFolder: false }, {chooseFolder: true, preserveCenter: true}]) assert.equal(api.validActionArguments("node.open", args), true);
  for (const args of [{ chooseFolder: "yes" }, { chooseFolder: () => true }, { chooseFolder: true, run: "other" }, {preserveCenter: "yes"}]) assert.equal(api.validActionArguments("node.open", args), false);
  assert.equal(api.validActionArguments("node.activate", { chooseFolder: true }), false);
});
