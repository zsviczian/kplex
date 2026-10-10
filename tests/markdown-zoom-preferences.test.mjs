/** Actual portable Markdown zoom policy: sparse durability, exact paths and bounded path-only moves. */
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

const temp = mkdtempSync(join(tmpdir(), "kplex-markdown-zoom-"));
process.on("exit", /** Remove the temporary actual implementation bundle independently of failures. */ () => rmSync(temp, { recursive: true, force: true }));
await build({ entryPoints: ["src/core/plex/markdownZoomPreferences.ts"], outfile: join(temp, "policy.mjs"), bundle: true, platform: "node", format: "esm" });
const { markdownZoomMode, withMarkdownZoomMode, sanitizeMarkdownZoomModes, renameMarkdownZoomModes, removeMarkdownZoomModes } = await import(pathToFileURL(join(temp, "policy.mjs")));

test("missing/invalid data defaults fixed and decoding never invokes accessors or inherits overrides", /** Validate the real settings decoder boundary. */ () => {
  for (const input of [undefined, null, [], "scale", 2]) assert.deepEqual(sanitizeMarkdownZoomModes(input), {});
  let getters = 0;
  const input = Object.assign(Object.create({ "Inherited.md": "scale" }), {
    "日本語/Note.MD": "scale", "Exact Case.md": "scale", "Fixed.md": "fixed", "Bad.md": true,
    "file.pdf": "scale", "../Note.md": "scale", "/Note.md": "scale", "Bad//Note.md": "scale",
  });
  Object.defineProperty(input, "Getter.md", { enumerable: true, get: /** Any evaluation would violate passive decoding. */ () => { getters += 1; return "scale"; } });
  assert.deepEqual(sanitizeMarkdownZoomModes(input), { "日本語/Note.MD": "scale", "Exact Case.md": "scale" });
  assert.equal(markdownZoomMode(input, "Inherited.md"), "fixed");
  assert.equal(markdownZoomMode(input, "Getter.md"), "fixed");
  assert.equal(markdownZoomMode(input, "Exact case.md"), "fixed");
  assert.equal(getters, 0);
});

test("choices remain per note, immutable and sparse through JSON reload without capacity eviction", /** Durable preferences are never a disposable capped cache. */ () => {
  const empty = {};
  const a = withMarkdownZoomMode(empty, "A.md", "scale");
  const b = withMarkdownZoomMode(a, "B.md", "scale");
  assert.deepEqual(empty, {}); assert.deepEqual(a, { "A.md": "scale" });
  assert.equal(markdownZoomMode(b, "A.md"), "scale");
  assert.equal(markdownZoomMode(b, "Unknown.md"), "fixed");
  assert.equal(withMarkdownZoomMode(b, "A.md", "scale"), b);
  const fixed = withMarkdownZoomMode(b, "A.md", "fixed");
  assert.deepEqual(fixed, { "B.md": "scale" }); assert.deepEqual(b, { "A.md": "scale", "B.md": "scale" });
  assert.equal(withMarkdownZoomMode(b, "Not.md", "invalid"), b);
  assert.equal(withMarkdownZoomMode(b, "../Not.md", "scale"), b);
  const large = Object.fromEntries(Array.from({ length: 10001 }, /** Distinct actual persisted paths exceed the old suggested support-cache cap. */ (_, i) => [`Notes/N-${i}.md`, "scale"]));
  assert.deepEqual(sanitizeMarkdownZoomModes(JSON.parse(JSON.stringify(large))), large);
  assert.equal(Object.keys(withMarkdownZoomMode(large, "Another.md", "scale")).length, 10002);
});

test("file/folder rename keeps exact ownership and moving out of Markdown retires preferences", /** Rename is a path-local transform with no Vault dependency. */ () => {
  const initial = { "Folder/Note.md": "scale", "Folder/Sub/Case.MD": "scale", "Folderish/Note.md": "scale", "Other.md": "scale" };
  const folder = renameMarkdownZoomModes(initial, "Folder", "Moved", true);
  assert.deepEqual(folder, { "Moved/Note.md": "scale", "Moved/Sub/Case.MD": "scale", "Folderish/Note.md": "scale", "Other.md": "scale" });
  assert.equal(renameMarkdownZoomModes(folder, "Unrelated", "Else", true), folder);
  const file = renameMarkdownZoomModes(folder, "Moved/Note.md", "Moved/Renamed.md");
  assert.equal(markdownZoomMode(file, "Moved/Renamed.md"), "scale");
  assert.equal(markdownZoomMode(file, "Moved/Note.md"), "fixed");
  const retired = renameMarkdownZoomModes(file, "Moved/Renamed.md", "Moved/Renamed.txt");
  assert.equal(Object.hasOwn(retired, "Moved/Renamed.md"), false);
  assert.equal(Object.hasOwn(retired, "Moved/Renamed.txt"), false);
  const collision = renameMarkdownZoomModes({ "Old.md": "scale", "New.md": "scale" }, "Old.md", "New.md");
  assert.deepEqual(collision, { "New.md": "scale" });
  assert.deepEqual(initial, { "Folder/Note.md": "scale", "Folder/Sub/Case.MD": "scale", "Folderish/Note.md": "scale", "Other.md": "scale" });
});

test("delete retires the file/subtree and recreation starts fixed without disturbing siblings", /** Slash boundaries distinguish descendants and similarly named folders. */ () => {
  const initial = { "A/Note.md": "scale", "A/Sub/Note.md": "scale", "AB/Note.md": "scale" };
  const file = removeMarkdownZoomModes(initial, "A/Note.md");
  assert.deepEqual(file, { "A/Sub/Note.md": "scale", "AB/Note.md": "scale" });
  const folder = removeMarkdownZoomModes(initial, "A", true);
  assert.deepEqual(folder, { "AB/Note.md": "scale" });
  assert.equal(markdownZoomMode(folder, "A/Note.md"), "fixed");
  assert.equal(removeMarkdownZoomModes(folder, "A", true), folder);
  assert.equal(removeMarkdownZoomModes(initial, "A"), initial);
});
