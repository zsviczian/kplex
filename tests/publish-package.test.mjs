import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import test from "node:test";
import {runInNewContext} from "node:vm";
import {browserBundle} from "./support/browserTypeScript.mjs";

const window = {};
runInNewContext(await browserBundle(["src/application/publish/sitePackage.ts", "src/core/plex/publication.ts"]),
  {window, TextEncoder, TextDecoder, Uint8Array, Uint32Array, DataView});
const {assemblePublicationSite, zipPublication, readPublicationManifest, publicationNotePath} = window.sourceModules;
const a = "cc8d4052-1363-4ac8-834a-50bc688da1d8", b = "32bfa9f4-7162-4bbf-94e2-bfc810aed96b";
const publication = {id: "39dd0b40-6990-41e1-b2e4-a4911cfe3d00", title: "Public notes", entry: a,
  nodes: [{id: a, title: "Overview", kind: "document"}, {id: b, title: "Example", kind: "drawing"}],
  relations: [{source: a, target: b, role: "previous", relationType: 1, direction: 2, definition: "Earlier"},
    {source: b, target: a, role: "next", relationType: 1, direction: 1, style: {stroke: "#f1acc4", width: 2}}]};
const enc = new TextEncoder(), dec = new TextDecoder();
const pack = {schema: 1, version: "0.4.6", files: [{path: "runtime/demo.js", text: "123456789"}]};
const notes = [{path: publicationNotePath(a), bytes: enc.encode("<p>Visible</p>")}, {path: publicationNotePath(b), bytes: enc.encode("<p>Sample</p>")}];
const digest = async bytes => createHash("sha256").update(bytes).digest("hex");
const signal = new AbortController().signal;
const options = {digest, current: () => true, signal};
const json = value => JSON.parse(JSON.stringify(value));

test("static export binds exact role-specific edges and every output by SHA-256", async () => {
  const site = await assemblePublicationSite(publication, notes, pack, {...options, search: [{id: a, text: "Visible"}]});
  assert.deepEqual(json(site.manifest.relations), publication.relations);
  assert.equal(site.manifest.fullText, true);
  const files = new Map(site.files.map(file => [file.path, file.bytes]));
  assert.deepEqual(json(site.manifest), JSON.parse(dec.decode(files.get("publication.json"))));
  for (const file of site.manifest.resources) {
    assert.equal(file.bytes, files.get(file.path).byteLength);
    assert.equal(file.sha256, await digest(files.get(file.path)));
  }
  assert.equal(files.size, site.manifest.resources.length + 1);
  const repeat = await assemblePublicationSite(publication, notes, pack, {...options, search: [{id: a, text: "Visible"}]});
  assert.deepEqual(repeat.files.map(({path, bytes}) => [path, dec.decode(bytes)]), site.files.map(({path, bytes}) => [path, dec.decode(bytes)]));
});

test("the shared manifest rejects private and malformed identities, paths, bounds and relationships", async () => {
  const {manifest} = await assemblePublicationSite(publication, notes, pack, options);
  for (const bad of [
    {...manifest, version: 30},
    {...manifest, entry: "Private/Secret.md"},
    {...manifest, relations: [...manifest.relations, manifest.relations[0]]},
    {...manifest, relations: [{...manifest.relations[0], role: "sibling"}]},
    {...manifest, relations: [{...manifest.relations[0], target: manifest.id}]},
    {...manifest, nodes: [{...manifest.nodes[0], style: {fill: "url(secret.svg)"}}, ...manifest.nodes.slice(1)]},
    {...manifest, resources: [...manifest.resources, {path: "../Private.md", bytes: 2, sha256: "a".repeat(64)}]},
    {...manifest, resources: manifest.resources.filter(file => file.path !== publicationNotePath(b))},
  ]) assert.throws(() => readPublicationManifest(bad));
  await assert.rejects(assemblePublicationSite(publication, [...notes, notes[0]], pack, options), /duplicate/);
  await assert.rejects(assemblePublicationSite(publication, notes, pack, {...options, search: [{id: publication.id, text: "Private sentinel"}]}), /search/);
  await assert.rejects(assemblePublicationSite(publication, notes, pack, {...options, current: () => false}), /changed/);
});

test("the deterministic stored ZIP has matching central rows and refuses stale or unsafe entries", async () => {
  const {files} = await assemblePublicationSite(publication, notes, pack, options);
  const bytes = Buffer.concat(await zipPublication(files, signal, () => true, async () => {}));
  const end = bytes.length - 22;
  assert.equal(bytes.readUInt32LE(end), 0x06054b50);
  assert.equal(bytes.readUInt16LE(end + 10), files.length);
  let central = bytes.readUInt32LE(end + 16);
  for (const file of files) {
    assert.equal(bytes.readUInt32LE(central), 0x02014b50);
    const nameLength = bytes.readUInt16LE(central + 28), local = bytes.readUInt32LE(central + 42);
    assert.equal(bytes.readUInt32LE(local), 0x04034b50);
    assert.equal(bytes.readUInt16LE(local + 12), 0x21);
    assert.equal(bytes.toString("utf8", central + 46, central + 46 + nameLength), file.path);
    assert.deepEqual(bytes.subarray(local + 30 + nameLength, local + 30 + nameLength + file.bytes.length), Buffer.from(file.bytes));
    if (file.path === "runtime/demo.js") assert.equal(bytes.readUInt32LE(central + 16), 0xcbf43926);
    central += 46 + nameLength;
  }
  assert.equal(central, end);
  await assert.rejects(zipPublication([...files, {path: "../outside", bytes: enc.encode("bad")}], signal, () => true, async () => {}), /path/);
  await assert.rejects(zipPublication(files, signal, () => false, async () => {}), /changed/);
});
