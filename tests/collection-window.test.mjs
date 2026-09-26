import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("collection window preserves caller order/identity and all three manager page policies", async () => {
  const dir = mkdtempSync(join(tmpdir(), "kplex-collection-window-"));
  try {
    const output = join(dir, "collectionWindow.mjs");
    await build({ entryPoints: [join(root, "src/ui/components/collectionWindow.ts")], outfile: output, bundle: true, platform: "node", format: "esm", target: "es2021" });
    const { collectionWindow } = await import(pathToFileURL(output).href);
    const items = Object.freeze(Array.from({ length: 65 }, (_, i) => Object.freeze({ id: 65 - i })));
    for (const [initial, step] of [[12, 20], [12, 20], [16, 24]]) {
      const first = collectionWindow(items, initial, step);
      assert.deepEqual(first, { visible: items.slice(0, initial), total: 65, remaining: 65 - initial, nextCount: step });
      const second = collectionWindow(items, initial + step, step);
      assert.equal(second.visible.length, initial + step);
      assert.equal(second.visible[0], items[0]);
      assert.deepEqual(collectionWindow(items, 64, step), { visible: items.slice(0, 64), total: 65, remaining: 1, nextCount: 1 });
      assert.deepEqual(collectionWindow(items, 100, step), { visible: items, total: 65, remaining: 0, nextCount: 0 });
      assert.deepEqual(collectionWindow([], initial, step), { visible: [], total: 0, remaining: 0, nextCount: 0 });
      const filtered = items.filter(({ id }) => id % 2 === 0);
      assert.deepEqual(collectionWindow(filtered, initial, step).visible, filtered.slice(0, initial));
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
