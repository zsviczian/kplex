/**
 * Candidate-degree fixtures reuse the existing production catalog setup and actual full
 * GraphBuilder/GraphIndex oracle. Portable saved envelopes remain explicit doubles; no alternate
 * degree selector, classifier or sorter lives here. Browser durability uses its separate lane.
 */
import assert from "node:assert/strict";
import { M } from "./cachedSourceFixture.mjs";
import { titleFixture, guardUrlTitle } from "./urlTitleFixture.mjs";
import { fullTitleIndex } from "./selectedTitleFixture.mjs";

/** Diverse direct, incoming, hidden, dormant, structural, Date and independent URL support. */
export function configureDegrees(f) {
  f.add("Center.md", "", { Children: ["[[Candidate]]", "[[Peer]]"] });
  f.add("Candidate.md", "Friends:: [[Peer]]\nFriends:: [[Peer]]\n[Page](https://example.com/path)",
    { Friends: ["[[Peer]]", "[[Peer]]"], Hidden: "[[Hidden]]", Dormant: "[[DormantTarget]]", Image: "[[image.png]]", When: "2026-09-30" });
  f.add("Peer.md", "Opposes:: [[Candidate]]", { Parent: "[[Candidate]]" });
  f.add("Outside.md", "Previous:: [[Candidate]]");
  f.add("Hidden.md", ""); f.add("DormantTarget.md", "");
  f.add("UrlOwner.md", "[Independent](https://example.com/path)\n[Another](https://example.com/other)");
  f.add("Unrelated.md", "", { Unselected: "[[Nowhere]]" });
  f.add("image.png", "");
  f.metadata.get("Candidate.md").hostTags = ["#project/nested", "#project/nested"];
  f.metadata.get("Outside.md").hostTags = ["#project/other"];
  f.app.dateFields.add("When");
  f.app.metadataCache.resolvedLinks["Center.md"] = { "Candidate.md": 1, "Peer.md": 1 };
  f.app.metadataCache.resolvedLinks["Candidate.md"] = { "Peer.md": 4, "image.png": 1 };
  f.app.metadataCache.resolvedLinks["Peer.md"] = { "Candidate.md": 2 };
  f.app.metadataCache.resolvedLinks["Outside.md"] = { "Candidate.md": 1 };
  if (f.resolutions) for (const file of f.files.values()) f.resolutions.set(file.basename, file.path);
}

/** Explicit setup only; v2 and v3 share the same neutral incidence, not Markdown title order. */
export async function degreeFixture(configure = configureDegrees, version = 3) {
  const f = await titleFixture(configure, version);
  f.makeDegreeReader = (discovery = f.discovery, capture = f.capture, entities = { entity: ref => f.entities.get(ref.id) }) =>
    new M.CachedRequestedCandidateDegreeReader(f.port, discovery, capture, entities);
  return f;
}

/** Build and bind a fresh production index for each policy, then read only raw bound map sizes. */
export async function fullDegrees(f, candidates, overrides = {}) {
  const index = await fullTitleIndex(f, overrides);
  try {
    return candidates.map(candidate => {
      const page = index.state.pages.get(candidate.semanticPath);
      assert(page, `Full GraphBuilder must materialize ${candidate.semanticPath}`);
      return { id: candidate.id, rawDegree: page.neighbours.size };
    });
  } finally { index.destroy(); }
}

/** Also trap body writes, catalog scans and structural collection, including caught exceptions. */
export function guardDegreeReuse(f) {
  const check = guardUrlTitle(f);
  let forbidden = 0;
  /** A caught illegal operation still fails the test. Leases are intentionally not source writes. */
  const fail = () => { forbidden++; throw new Error("Forbidden degree acquisition, scan or source/body write"); };
  for (const name of ["putBody", "putBodies", "queueBodyWrite", "deleteBody"]) f.cache[name] = fail;
  f.repository.tombstone = f.repository.headPage = f.repository.querySources = fail;
  f.host.collect = fail;
  return () => { check(); assert.equal(forbidden, 0); };
}

/** A failed request exposes no prefix, over-cover compilation, count or certificate. */
export function rejectedDegree(result, reason) {
  assert.notEqual(result.outcome, "ready", JSON.stringify(result));
  if (reason) assert.equal(result.reason, reason);
  for (const key of ["inputs", "certificate", "compilation", "preparation"]) assert(!(key in result), key);
}

/** Assert the intentionally narrow output as well as exact independent full-build parity. */
export function compareDegrees(result, expected, candidates) {
  assert.equal(result.outcome, "ready", JSON.stringify(result));
  assert.equal(result.coverage, "complete-candidate-raw-degrees");
  assert.deepEqual(result.inputs, expected);
  assert.deepEqual(result.certificate.candidates, candidates);
  assert.equal(result.certificate.coverage, "complete-candidate-raw-degrees");
  assert.equal(result.work.familyVisits, 4 * result.work.sourceReplays);
  assert.equal(result.work.candidateRelations, expected.reduce((sum, input) => sum + input.rawDegree, 0));
  for (const key of ["compilation", "preparation", "gates", "titles", "neighbors"]) assert(!(key in result), key);
}
