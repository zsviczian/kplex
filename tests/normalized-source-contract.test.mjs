import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { produceNormalizedFixtureRecords } from "./support/normalizedSourceFixture.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const temp = mkdtempSync(join(tmpdir(), "kplex-normalized-source-"));
process.on("exit", () => rmSync(temp, { recursive: true, force: true }));
const contractPath = join(temp, "source.mjs");
await build({ entryPoints: [join(root, "src/core/graph/source.ts")], outfile: contractPath, bundle: true, platform: "node", format: "esm", target: "es2021" });
const contract = await import(pathToFileURL(contractPath).href);

const compatibilityRoot = join(root, "tests/fixtures/excalibrain-indexing/Vault");
const normalizedRoot = join(root, "tests/fixtures/normalized-source");

function byKind(records, kind) { return records.filter((record) => record.kind === kind); }

function baselineSourceCounts() {
  const baseline = JSON.parse(readFileSync(join(root, "tests/fixtures/excalibrain-indexing/graph-baseline.json"), "utf8"));
  const counts = new Map();
  for (const declaration of baseline.graph.declarations) counts.set(declaration.sourceKind, (counts.get(declaration.sourceKind) ?? 0) + 1);
  return counts;
}

test("normalized source contract bundles and runs in a clean process without Obsidian/window", () => {
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", `
    import assert from "node:assert/strict";
    import * as source from ${JSON.stringify(pathToFileURL(contractPath).href)};
    assert.equal(typeof globalThis.window, "undefined");
    assert.equal(source.MAX_NORMALIZED_SOURCE_RECORDS_PER_BATCH, 256);
    const boundary={generation:source.sourceGeneration("g1"),snapshotRevision:source.sourceSnapshotRevision("s1")};
    const cursor=source.beginSourceRead(boundary);
    const accepted=source.acceptSourceBatch(cursor,{boundary,sequence:0,final:true,records:[]});
    assert.equal(accepted.accepted,true);
    assert.equal(source.sourceReadCanPublish(accepted.cursor,boundary),true);
  `], { cwd: temp, encoding: "utf8" });
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test("compatibility fixture producer matches every existing evidence-family multiplicity and source provenance", () => {
  const fixtureReadme = readFileSync(join(root, "tests/fixtures/excalibrain-indexing/README.md"), "utf8");
  for (const documentedAssumption of ["primaryTagField: \"Note type\"", "Date format: YYYY/MM/YYYYMMDD", "follow-up-date", "Challenger"]) {
    assert(fixtureReadme.includes(documentedAssumption), `compatibility fixture README must document ${documentedAssumption}`);
  }
  const { records, parsedFiles } = produceNormalizedFixtureRecords(compatibilityRoot);
  const entityIds = new Set(byKind(records, "entity").map((record) => record.entity.id));
  for (const record of records) {
    for (const ref of [record.target, record.origin].filter(Boolean)) {
      assert(entityIds.has(ref.entity.id), `fixture completes target entity facts: ${ref.entity.semanticPath}`);
    }
  }
  const baseline = baselineSourceCounts();
  for (const kind of ["obsidian-link", "unresolved-link", "frontmatter-ontology", "inline-ontology", "body-url", "date-property", "file-tree", "tag-tree"]) {
    assert.equal(byKind(records, kind).length, baseline.get(kind), `${kind} normalized facts should correspond to the authoritative legacy fixture declarations`);
    const declarations = JSON.parse(readFileSync(join(root, "tests/fixtures/excalibrain-indexing/graph-baseline.json"), "utf8")).graph.declarations;
    assert.deepEqual(
      byKind(records, kind).map((record) => JSON.stringify([record.source.semanticPath, record.target.entity.semanticPath])).sort(),
      declarations.filter((record) => record.sourceKind === kind).map((record) => JSON.stringify([record.declaredByPath, record.declaredTargetPath])).sort(),
      `${kind} preserves declaring source/target pairs and multiplicity, not merely a matching family count`,
    );
  }
  const bodyUrls = byKind(records, "body-url");
  assert.equal(new Set(bodyUrls.map((record) => record.target.entity.id)).size, baseline.get("url-origin"), "fixture has one legacy URL-origin declaration per body URL target");
  assert.equal(bodyUrls.find((record) => record.target.entity.semanticPath === "https://source.com/inferred").label, "Source URL inferred alias", "body URL display labels survive normalization");

  const noteA = parsedFiles.get("Note A.md");
  const challenger = byKind(records, "inline-ontology").find((record) => record.source.semanticPath === "Note A.md" && record.provenance?.fieldName === "Challenger");
  assert(challenger);
  assert.equal(challenger.target.entity.semanticPath, "Note E.md");
  assert.equal(noteA.content.slice(challenger.provenance.location.start, challenger.provenance.location.end).includes("Challenger:: [[Note E"), true);
  assert.equal(challenger.provenance.rawValue, "[[Note E|E via square-bracket inline field]]");
  assert.equal(challenger.provenance.definition, "challenger");
  assert(byKind(records, "semantic-metadata").some((record) => record.metadataKind === "primary-tag-field"), "primary-tag-field inputs stay source facts rather than compiler-owned styling decisions");

  const noteXCollision = records.filter((record) => record.source.semanticPath === "Note X.md" && record.target?.entity?.semanticPath === "Note Y.md" &&
    (record.kind === "frontmatter-ontology" || record.kind === "inline-ontology"));
  assert.deepEqual(noteXCollision.map((record) => record.kind).sort(), ["frontmatter-ontology", "inline-ontology"], "frontmatter/body collision must survive as distinct occurrences");

  const noteBDate = byKind(records, "date-property").find((record) => record.source.semanticPath === "Note B.md" && record.provenance?.fieldName === "date");
  const noteBMissingDate = byKind(records, "date-property").find((record) => record.source.semanticPath === "Note B.md" && record.provenance?.fieldName === "follow-up-date");
  assert.equal(noteBDate.target.entity.semanticPath, "Daily/2026/09/20260918.md");
  assert.equal(noteBDate.target.entity.state, "materialized");
  assert.equal(noteBDate.provenance.rawValue, "2026-09-18");
  assert.equal(noteBMissingDate.target.entity.semanticPath, "Daily/2026/09/20260920.md");
  assert.equal(noteBMissingDate.target.entity.state, "unresolved");
  assert(byKind(records, "entity").some((record) => record.entity.id === noteBMissingDate.target.entity.id), "unresolved Date target gets a later entity fact too");

  const mirrored = records.filter((record) => record.source.semanticPath === "Note A.md" && record.target?.entity?.semanticPath === "Note B.md" &&
    (record.kind === "obsidian-link" || record.kind === "frontmatter-ontology"));
  assert.deepEqual(mirrored.map((record) => record.kind).sort(), ["frontmatter-ontology", "obsidian-link"], "host link summary and explicit ontology declaration remain separate facts");

  const fileMembership = byKind(records, "file-tree").find((record) => record.source.semanticPath === "folder:Daily/2026/09" && record.target.entity.semanticPath === "Daily/2026/09/20260918.md");
  assert(fileMembership, "physical folder membership stays an explicit structural fact");
  assert.equal(fileMembership.target.resolvedBy, "structural");
  const tagMembership = byKind(records, "tag-tree").find((record) => record.membership === "entity-member" && record.source.semanticPath === "tag:fixture" && record.target.entity.semanticPath === "Note A.md");
  assert(tagMembership, "tag membership stays distinct from tag hierarchy and semantic relationship roles");
  assert.equal(tagMembership.contribution.source.id, tagMembership.target.entity.id, "the member note owns the physical contribution even though the tag declares the relation");
  assert.equal(tagMembership.contribution.revision, records.find((record) => record.kind === "entity" && record.entity.id === tagMembership.target.entity.id).sourceRevision);
});

test("metadata precedence inputs, malformed URLs and dense CRLF sources remain faithful facts", () => {
  const fixture = join(temp, "dense-fixture");
  mkdirSync(fixture);
  const content = ['---', 'Note type: frontmatter-type', 'custom-status: private arbitrary value', '---',
    'Note type:: inline-type', 'Parent:: [[Target#One]], [[Target#Two]]', 'Malformed URL: https://bad:port/item',
    ...Array.from({ length: 600 }, () => 'Parent:: [[Target#Later]]')].join('\r\n');
  writeFileSync(join(fixture, "Source.md"), content);
  writeFileSync(join(fixture, "Target.md"), "# Target");
  const { records } = produceNormalizedFixtureRecords(fixture);
  const types = byKind(records, "semantic-metadata").filter((record) => record.metadataKind === "note-type");
  assert.deepEqual(types.map((record) => [record.value, record.provenance.surface]), [["frontmatter-type", "frontmatter"], ["inline-type", "inline"]], "producer cannot choose property-over-body precedence");
  assert(byKind(records, "field-name").some((record) => record.fieldName === "custom-status"));
  assert(!records.some((record) => record.value === "private arbitrary value" || record.provenance?.rawValue === "private arbitrary value"), "field discovery carries names without arbitrary values");
  const malformed = byKind(records, "body-url")[0];
  assert.equal(malformed.target.entity.semanticPath, "https://bad:port/item");
  assert.equal(malformed.origin, undefined, "an unparseable URL cannot invent origin evidence");
  const hostLinks = byKind(records, "obsidian-link");
  assert.equal(hostLinks.length, 1, "host summary is per resolved target, not per heading");
  assert.equal(hostLinks[0].occurrenceCount, 602);
  for (const record of byKind(records, "inline-ontology")) {
    const { start, end, line } = record.provenance.location;
    assert(content.slice(start, end).includes(record.provenance.rawValue));
    assert.equal(line, content.slice(0, start).split('\n').length);
  }
  const boundary = { generation: contract.sourceGeneration("dense"), snapshotRevision: contract.sourceSnapshotRevision("dense-snapshot") };
  let cursor = contract.beginSourceRead(boundary);
  for (let start = 0; start < records.length; start += contract.MAX_NORMALIZED_SOURCE_RECORDS_PER_BATCH) {
    const batchRecords = records.slice(start, start + contract.MAX_NORMALIZED_SOURCE_RECORDS_PER_BATCH);
    const accepted = contract.acceptSourceBatch(cursor, { boundary, sequence: cursor.nextSequence, final: start + batchRecords.length === records.length, records: batchRecords });
    assert.equal(accepted.accepted, true);
    cursor = accepted.cursor;
  }
  assert(cursor.nextSequence > 2, "one dense file spans several bounded batches");
  assert.equal(contract.sourceReadCanPublish(cursor, boundary), true);
});

test("source-relative/case-distinct targets, subpaths, image-only reconciliation and shared URL occurrences stay explicit", () => {
  const { records } = produceNormalizedFixtureRecords(normalizedRoot);
  const oneLocal = byKind(records, "frontmatter-ontology").find((record) => record.source.semanticPath === "One/Source.md" && record.provenance?.fieldName === "Parent");
  const twoLocal = byKind(records, "obsidian-link").find((record) => record.source.semanticPath === "Two/Source.md" && record.target.rawTarget.startsWith("Topic#"));
  assert.equal(oneLocal.target.entity.semanticPath, "One/Topic.md");
  assert.equal(twoLocal.target.entity.semanticPath, "Two/Topic.md");
  assert.notEqual(oneLocal.target.entity.id, twoLocal.target.entity.id);
  assert.equal(oneLocal.target.subpath, "#Local heading");
  assert.equal(twoLocal.target.subpath, "#Second local heading");

  const missing = byKind(records, "unresolved-link").find((record) => record.source.semanticPath === "One/Source.md");
  assert.equal(missing.target.entity.semanticPath, "Never There");
  assert.equal(missing.target.entity.state, "unresolved");
  assert.equal(missing.target.subpath, "#Future heading");

  const imageHost = byKind(records, "obsidian-link").find((record) => record.source.semanticPath === "One/Source.md" && record.target.entity.semanticPath === "Assets/picture.png");
  const imagePresentation = byKind(records, "presentation-link").find((record) => record.source.semanticPath === "One/Source.md" && record.target.entity.semanticPath === "Assets/picture.png");
  assert(imageHost && imagePresentation, "image field link must be present both in host summary and presentation-only reconciliation facts");
  assert.equal(imageHost.target.entity.id, imagePresentation.target.entity.id);
  assert.equal(imagePresentation.hostOccurrenceCount, imageHost.occurrenceCount);
  assert.equal(imagePresentation.provenance.fieldName, "thumbnail");

  const shared = byKind(records, "body-url").filter((record) => record.target.entity.semanticPath === "https://shared.example/item");
  assert(shared.length >= 2);
  assert.equal(new Set(shared.map((record) => record.target.entity.id)).size, 1, "shared URL has one target identity");
  assert(new Set(shared.map((record) => record.source.id)).size >= 2, "each declaring note retains a separate source occurrence");
  assert(shared.every((record) => record.origin.entity.semanticPath === "https://shared.example"));
});

test("bounded batches allow later-target references and reject stale/mixed generations", () => {
  const { records } = produceNormalizedFixtureRecords(normalizedRoot);
  const reference = byKind(records, "frontmatter-ontology").find((record) => record.source.semanticPath === "One/Source.md");
  assert(reference);
  const targetEntity = byKind(records, "entity").find((record) => record.entity.id === reference.target.entity.id);
  assert(targetEntity);

  const boundary = { generation: contract.sourceGeneration("generation-1"), snapshotRevision: contract.sourceSnapshotRevision("snapshot-A") };
  let cursor = contract.beginSourceRead(boundary);
  const first = contract.acceptSourceBatch(cursor, { boundary, sequence: 0, final: false, records: [reference] });
  assert.equal(first.accepted, true);
  cursor = first.cursor;
  assert.equal(contract.sourceReadCanPublish(cursor, boundary), false, "later-target references do not publish a partial read");
  const second = contract.acceptSourceBatch(cursor, { boundary, sequence: 1, final: true, records: [targetEntity] });
  assert.equal(second.accepted, true);
  cursor = second.cursor;
  assert.equal(contract.sourceReadCanPublish(cursor, boundary), true);

  const staleBoundary = { generation: contract.sourceGeneration("generation-2"), snapshotRevision: contract.sourceSnapshotRevision("snapshot-A") };
  assert.equal(contract.sourceReadCanPublish(cursor, staleBoundary), false, "newer generation invalidates the completed older read");
  const mixed = contract.acceptSourceBatch(contract.beginSourceRead(staleBoundary), { boundary, sequence: 0, final: true, records: [] });
  assert.deepEqual(mixed, { accepted: false, reason: "wrong-boundary" });
  assert.deepEqual(contract.acceptSourceBatch(contract.beginSourceRead(boundary), { boundary, sequence: 1, final: true, records: [] }), { accepted: false, reason: "wrong-sequence" });
  assert.deepEqual(contract.acceptSourceBatch(cursor, { boundary, sequence: 2, final: true, records: [] }), { accepted: false, reason: "already-complete" });
  assert.equal(contract.sourceReadCanPublish(cursor, { ...boundary, snapshotRevision: contract.sourceSnapshotRevision("snapshot-B") }), false, "same generation with a changed snapshot also invalidates publication");

  const oversized = contract.acceptSourceBatch(contract.beginSourceRead(boundary), {
    boundary, sequence: 0, final: true,
    records: Array.from({ length: contract.MAX_NORMALIZED_SOURCE_RECORDS_PER_BATCH + 1 }, () => reference),
  });
  assert.deepEqual(oversized, { accepted: false, reason: "batch-too-large" });
});

test("replacement/deletion state is distinct from unresolved/missing and IDs remain opaque/path-independent", () => {
  const identity = JSON.parse(readFileSync(join(normalizedRoot, "identity-fixture.json"), "utf8"));
  assert.notEqual(identity.sourceId, identity.sourceSemanticPath);
  assert.notEqual(identity.caseDistinctId, identity.caseDistinctSemanticPath);
  assert.notEqual(identity.sourceId, identity.caseDistinctId);
  assert.equal("semanticPath" in identity.pathlessDeleted, false, "deleted identity may be pathless");
  assert.equal("semanticPath" in identity.pathlessMissing, false, "missing identity may be pathless");
  assert.notEqual(identity.pathlessMissing.id, identity.pathlessDeleted.id);

  const states = ["materialized", "unresolved", "missing", "deleted"];
  assert.equal(new Set(states).size, 4);
  const oldEntity = { id: identity.sourceId, kind: "document", state: "materialized", semanticPath: identity.sourceSemanticPath, physicalPath: identity.sourceSemanticPath };
  const deleted = { id: identity.sourceId, kind: "document", state: "deleted", semanticPath: identity.sourceSemanticPath };
  const replacement = { id: identity.caseDistinctId, kind: "document", state: "materialized", semanticPath: identity.caseDistinctSemanticPath, physicalPath: identity.caseDistinctSemanticPath };
  assert.equal(oldEntity.semanticPath.toLowerCase(), replacement.semanticPath.toLowerCase());
  assert.notEqual(oldEntity.id, replacement.id, "case-distinct/replacement identity is not derived from normalized path casing");
  assert.equal(deleted.state, "deleted");
  assert.notEqual(deleted.state, "unresolved");

  const oldBoundary = { generation: contract.sourceGeneration("replace-1"), snapshotRevision: contract.sourceSnapshotRevision("replace-snapshot-1") };
  const oldRecord = { kind: "entity", source: oldEntity, sourceRevision: contract.sourceRevision("source-r1"), entity: oldEntity, name: "Note", url: null };
  const oldAccepted = contract.acceptSourceBatch(contract.beginSourceRead(oldBoundary), { boundary: oldBoundary, sequence: 0, final: true, records: [oldRecord] });
  assert.equal(oldAccepted.accepted, true);
  const newBoundary = { generation: contract.sourceGeneration("replace-2"), snapshotRevision: contract.sourceSnapshotRevision("replace-snapshot-2") };
  assert.equal(contract.sourceReadCanPublish(oldAccepted.cursor, newBoundary), false, "replacement/deletion observations invalidate the older completed generation");
  const deletedRecord = { kind: "entity", source: deleted, sourceRevision: contract.sourceRevision("source-r2"), entity: deleted, name: "Note", url: null };
  const deletedAccepted = contract.acceptSourceBatch(contract.beginSourceRead(newBoundary), { boundary: newBoundary, sequence: 0, final: true, records: [deletedRecord] });
  assert.equal(deletedAccepted.accepted, true);
  assert.equal(contract.sourceReadCanPublish(deletedAccepted.cursor, newBoundary), true);
});
