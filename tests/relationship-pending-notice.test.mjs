/** Actual write-observer notice ownership prevents duplicate session messages after saved cancellation. */
import assert from "node:assert/strict";
import test from "node:test";
import {build} from "esbuild";
import {mkdtempSync, rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {pathToFileURL} from "node:url";
const temp = mkdtempSync(join(tmpdir(), "kplex-pending-notice-"));
await build({entryPoints: ["src/adapters/obsidian/relationshipMetadataWrite.ts"], outfile: join(temp, "writer.mjs"), bundle: true, platform: "node", format: "esm"});
const {writeRelationshipMetadata, SavedRelationshipPendingError} = await import(pathToFileURL(join(temp, "writer.mjs")));
test.after(() => rmSync(temp, {recursive: true, force: true}));

test("saved terminal error records only a notice actually emitted by its exact write lifetime", async () => {
  const previousWindow = globalThis.window;
  try {
    for (const emitPending of [false, true]) {
      const timers = new Map(), refs = new Set();
      let nextTimer = 0, cancel, notices = 0, releases = 0;
      globalThis.window = {setTimeout: callback => {timers.set(++nextTimer, callback); return nextTimer;}, clearTimeout: timer => timers.delete(timer)};
      const file = {path: "Origin.md", stat: {mtime: 1, size: 20}}, beforeCache = {frontmatter: {}};
      const emitter = {on: (_name, callback) => {refs.add(callback); return callback;}, offref: callback => refs.delete(callback)};
      const app = {
        metadataCache: {...emitter, getFileCache: () => beforeCache},
        vault: {...emitter, getFileByPath: () => file},
        fileManager: {processFrontMatter: async (_file, mutate) => mutate({})},
      };
      const task = writeRelationshipMetadata(app, file, new Set(["children"]), frontmatter => {frontmatter.Children = ["[[Target]]"];}, {
        own: callback => {cancel = callback; return () => releases++;},
        pending: () => notices++, savedPendingMessage: () => "Saved; graph pending",
      }).catch(error => error);
      await Promise.resolve(); await Promise.resolve();
      assert.equal(timers.size, 1, "Saved write remains observed rather than timed out as complete");
      if (emitPending) [...timers.values()][0]();
      cancel();
      const outcome = await task;
      assert(outcome instanceof SavedRelationshipPendingError);
      assert.equal(outcome.noticeReported, emitPending);
      assert.equal(notices, emitPending ? 1 : 0);
      assert.equal(releases, 1); assert.equal(refs.size, 0); assert.equal(timers.size, 0);
    }
    assert.equal(new SavedRelationshipPendingError("Publication pending").noticeReported, false,
      "A post-write publication failure with no service notice still needs one shell notice");
  } finally { if (previousWindow === undefined) delete globalThis.window; else globalThis.window = previousWindow; }
});
