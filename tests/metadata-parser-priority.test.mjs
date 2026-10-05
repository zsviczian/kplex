/** Production mobile fallback parser pauses background slices and retains cancellation/parity. */
import assert from "node:assert/strict";
import test from "node:test";
import { loadPortableModules } from "./support/portableTypeScript.mjs";

const { exports: M } = loadPortableModules([
  "src/index/MetadataParser.ts", "src/index/ForegroundWorkScheduler.ts", "src/core/parser/metadata.ts",
], { obsidian: "exports.Platform={isIosApp:true};" });

/** Install only the host timer port; production grammar, parser lifetime and scheduler remain real. */
async function withTimerHost(work) {
  const previous = globalThis.window;
  globalThis.window = { setTimeout };
  try { await work(); } finally {
    if (previous === undefined) delete globalThis.window;
    else globalThis.window = previous;
  }
}

/** A long physical line guarantees multiple CPU slices before genuine fields/URL output arrives. */
const content = `${"x".repeat(4 * 1024 * 1024)}\nParent:: [[Target]]\nhttps://example.com/background`;

test("background fallback pauses inside a long physical line while foreground parsing completes", { timeout: 30_000 }, async () => {
  await withTimerHost(async () => {
    const parser = new M.MetadataParser(), scheduler = new M.ForegroundWorkScheduler();
    const release = scheduler.begin(0);
    let entered, checkpoints = 0, settled = false;
    const firstBoundary = new Promise(resolve => { entered = resolve; });
    const parsing = scheduler.run(3, () => parser.parse(content, async () => {
      checkpoints++; entered(); await scheduler.checkpoint(3);
    })).finally(() => { settled = true; });
    try {
      await firstBoundary;
      assert.equal(settled, false, "background grammar remains private at the pause boundary");
      assert.equal(scheduler.diagnostics().waiting, 1, "one background continuation waits for foreground release");
      const foreground = await parser.parse("Parent:: [[Foreground]]");
      assert.deepEqual(foreground.inlineFields.parent, ["[[Foreground]]"], "foreground caller never joins background checkpoint");
      await new Promise(resolve => setTimeout(resolve, 10));
      assert.equal(settled, false, "background does not continue through renderer yields during foreground ownership");
      release();
      const resumed = await parsing;
      assert.deepEqual(resumed, M.parseBodyMetadataCore(content), "resumed parser preserves the canonical full grammar output");
      assert.deepEqual(resumed.inlineFields.parent, ["[[Target]]"], "fields after the paused physical line are retained");
      assert(checkpoints > 0, "the supplied checkpoint runs inside long-line scanning");
    } finally { release(); scheduler.close(); parser.destroy(); }
  });
});

for (const operation of ["cancelPending", "destroy"]) {
  test(`${operation} rejects a background fallback after the awaited priority pause without returning a prefix`, { timeout: 30_000 }, async () => {
    await withTimerHost(async () => {
      const parser = new M.MetadataParser(), scheduler = new M.ForegroundWorkScheduler();
      const release = scheduler.begin(0);
      let entered;
      const firstBoundary = new Promise(resolve => { entered = resolve; });
      const parsing = parser.parse(content, async () => { entered(); await scheduler.checkpoint(3); });
      const rejected = assert.rejects(parsing, error => error instanceof M.MetadataParseCancelledError);
      try {
        await firstBoundary; parser[operation](); release();
        await rejected;
        assert.equal(scheduler.diagnostics().waiting, 0, "cancelled background continuation releases its waiter");
        if (operation === "cancelPending") assert.deepEqual((await parser.parse("Child:: [[Fresh]]")).inlineFields.child, ["[[Fresh]]"], "a new foreground parse survives cancelled prior generation");
      } finally { release(); scheduler.close(); parser.destroy(); }
    });
  });
}
