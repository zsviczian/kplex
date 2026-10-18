/**
 * Aggregate-only deterministic work-count receipt for PR #153's ordinary high-degree no-op path.
 * Production methods and fixtures are shared with regression tests; fake-clock elapsed times are
 * intentionally omitted. This driver creates no vault, changes no cache and patches no globals.
 */
import assert from 'node:assert/strict';
import { noopPatchBundle, portableNoopFixture } from '../../tests/support/noopPatchPortable.mjs';
import { probeNoopPatch } from '../../tests/support/noopPatchFixture.mjs';

const bundle = await noopPatchBundle();
const results = [];
for (const degree of [256, 512, 1024, 2048, 4096]) {
  const f = portableNoopFixture(bundle, degree), probe = probeNoopPatch(f);
  try {
    // A new non-reference property remains discoverable without changing the neutral fingerprint.
    f.host.metadata.get(f.file.path).frontmatter['New scalar'] = 'value';
    const result = await f.builder.patchMarkdownFiles(f.state, [f.file]);
    assert(result.ok); assert.equal(result.semanticNoops, 1); assert.equal(result.semanticChanges, 0);
    assert(f.state.discoveredFields.has('new-scalar'));
    results.push({ degree, ...probe.counts, reads: f.host.reads.length, parses: f.host.parses.length,
      evidenceDepth: f.state.evidence.depth, declarations: f.state.evidence.declarationCount });
  } finally { probe.restore(); }
}
console.log(JSON.stringify({ node: process.version, workload: 'hot-body, depth-eight ordinary source no-op', results }, null, 2));
