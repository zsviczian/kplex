import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const temp = mkdtempSync(join(tmpdir(), "kplex-relation-core-"));
process.on("exit", () => rmSync(temp, { recursive: true, force: true }));
const corePath = join(temp, "relation-core.mjs");
await build({
  stdin: {
    contents: [
      'export * from "./src/core/graph/relations.ts";',
      'export * from "./src/core/graph/evidence.ts";',
      'export * from "./src/core/graph/resolver.ts";',
    ].join("\n"),
    resolveDir: root,
    sourcefile: "relation-core-entry.ts",
    loader: "ts",
  },
  outfile: corePath,
  bundle: true,
  platform: "node",
  format: "esm",
  target: "es2021",
});
const core = await import(pathToFileURL(corePath).href);
const oracle = JSON.parse(readFileSync(join(root, "tests/fixtures/c13b-relation-oracle.json"), "utf8"));

const cleanEvidence = (item) => ({
  id: item.id,
  sourcePath: item.sourcePath,
  targetPath: item.targetPath,
  role: item.role,
  relationType: item.relationType,
  direction: item.direction,
  declaredByPath: item.declaredByPath,
  declaredTargetPath: item.declaredTargetPath,
  declaredRole: item.declaredRole,
  sourceKind: item.sourceKind,
  ...(item.definition !== undefined ? { definition: item.definition } : {}),
  ...(item.fieldName !== undefined ? { fieldName: item.fieldName } : {}),
  ...(item.rawValue !== undefined ? { rawValue: item.rawValue } : {}),
  ...(item.line !== undefined ? { line: item.line } : {}),
  ...(item.start !== undefined ? { start: item.start } : {}),
  ...(item.end !== undefined ? { end: item.end } : {}),
});
const cleanDecision = (decision) => ({
  evidence: cleanEvidence(decision.evidence),
  active: decision.active,
  ...(decision.suppressionReason ? { suppressionReason: decision.suppressionReason } : {}),
});
const cleanRelation = (relation) => ({
  targetPath: relation.target.path,
  direction: relation.direction,
  isHidden: relation.isHidden,
  isParent: relation.isParent,
  ...(relation.parentType !== undefined ? { parentType: relation.parentType } : {}),
  ...(relation.parentTypeDefinition !== undefined ? { parentTypeDefinition: relation.parentTypeDefinition } : {}),
  isChild: relation.isChild,
  ...(relation.childType !== undefined ? { childType: relation.childType } : {}),
  ...(relation.childTypeDefinition !== undefined ? { childTypeDefinition: relation.childTypeDefinition } : {}),
  isLeftFriend: relation.isLeftFriend,
  ...(relation.leftFriendType !== undefined ? { leftFriendType: relation.leftFriendType } : {}),
  ...(relation.leftFriendTypeDefinition !== undefined ? { leftFriendTypeDefinition: relation.leftFriendTypeDefinition } : {}),
  isRightFriend: relation.isRightFriend,
  ...(relation.rightFriendType !== undefined ? { rightFriendType: relation.rightFriendType } : {}),
  ...(relation.rightFriendTypeDefinition !== undefined ? { rightFriendTypeDefinition: relation.rightFriendTypeDefinition } : {}),
  isNextFriend: relation.isNextFriend,
  ...(relation.nextFriendType !== undefined ? { nextFriendType: relation.nextFriendType } : {}),
  ...(relation.nextFriendTypeDefinition !== undefined ? { nextFriendTypeDefinition: relation.nextFriendTypeDefinition } : {}),
  isPreviousFriend: relation.isPreviousFriend,
  ...(relation.previousFriendType !== undefined ? { previousFriendType: relation.previousFriendType } : {}),
  ...(relation.previousFriendTypeDefinition !== undefined ? { previousFriendTypeDefinition: relation.previousFriendTypeDefinition } : {}),
});
const cleanExplanation = (explanation) => ({
  sourcePath: explanation.sourcePath,
  targetPath: explanation.targetPath,
  resolvedRoles: explanation.resolvedRoles,
  hidden: explanation.hidden,
  summary: explanation.summary,
  decisions: explanation.decisions.map(cleanDecision),
});
const page = (path) => ({ path, neighbours: new Map() });

function acceptedFixture() {
  const store = new core.RelationEvidenceStore();
  store.addPair("A.md", "B.md", "child", core.RelationType.DEFINED, core.LinkDirection.FROM, { sourceKind: "inline-ontology", definition: "children", fieldName: "Children", rawValue: "[[B]]", line: 4, start: 10, end: 20 });
  store.addPair("A.md", "B.md", "parent", core.RelationType.DEFINED, core.LinkDirection.FROM, { sourceKind: "frontmatter-ontology", definition: "parents", fieldName: "Parent", rawValue: "[[B]]" });
  store.addPair("A.md", "B.md", "parent", core.RelationType.DEFINED, core.LinkDirection.TO, { sourceKind: "frontmatter-ontology", definition: "parents2", fieldName: "Parent 2", rawValue: "[[B]]" });
  store.addPair("C.md", "D.md", "parent", core.RelationType.DEFINED, core.LinkDirection.FROM, { sourceKind: "frontmatter-ontology", definition: "parent" });
  store.addPair("C.md", "D.md", "child", core.RelationType.DEFINED, core.LinkDirection.TO, { sourceKind: "inline-ontology", definition: "child" });
  store.addPair("E.md", "F.md", "child", core.RelationType.INFERRED, core.LinkDirection.FROM, { sourceKind: "obsidian-link" });
  store.addPair("F.md", "E.md", "child", core.RelationType.INFERRED, core.LinkDirection.FROM, { sourceKind: "unresolved-link" });
  store.addHidden("G.md", "H.md", { sourceKind: "frontmatter-ontology", fieldName: "Hidden" });
  store.addPair("I.md", "J.md", "child", core.RelationType.INFERRED, core.LinkDirection.FROM, { sourceKind: "date-property", fieldName: "Date", rawValue: "2026-09-26" });
  store.addPair("K.md", "L.md", "child", core.RelationType.INFERRED, core.LinkDirection.FROM, { sourceKind: "body-url", line: 9 });
  store.addPair("M.md", "N.md", "right", core.RelationType.DEFINED, core.LinkDirection.FROM, { sourceKind: "frontmatter-ontology", definition: "right-friend" });
  store.addPair("O.md", "P.md", "previous", core.RelationType.DEFINED, core.LinkDirection.FROM, { sourceKind: "frontmatter-ontology", definition: "previous" });
  store.addPair("Q.md", "R.md", "next", core.RelationType.DEFINED, core.LinkDirection.FROM, { sourceKind: "frontmatter-ontology", definition: "next" });

  const paths = [...new Set([...store.declarations()].flatMap((item) => [item.declaredByPath, item.declaredTargetPath]))];
  const pages = new Map(paths.map((path) => [path, page(path)]));
  core.resolveEvidenceStore(pages, store);
  const resolved = {};
  for (const [path, source] of pages) resolved[path] = [...source.neighbours.entries()].map(([target, relation]) => [target, cleanRelation(relation)]);
  const explain = (source, target, infer = false) => core.explainResolvedRelationship(pages.get(source), pages.get(target), store.between(source, target), infer);
  const explanations = {
    frontmatterConflict: cleanExplanation(explain("A.md", "B.md")),
    inverseFrontmatterConflict: cleanExplanation(explain("B.md", "A.md")),
    multiRoleConflict: cleanExplanation(explain("C.md", "D.md")),
    bidirectionalInferred: cleanExplanation(explain("E.md", "F.md")),
    hiddenDirectional: cleanExplanation(explain("G.md", "H.md")),
    dateProperty: cleanExplanation(explain("I.md", "J.md")),
    bodyUrl: cleanExplanation(explain("K.md", "L.md")),
    rightDefined: cleanExplanation(explain("M.md", "N.md")),
    previousDefined: cleanExplanation(explain("O.md", "P.md")),
    nextDefined: cleanExplanation(explain("Q.md", "R.md")),
  };

  const base = new core.RelationEvidenceStore();
  base.addPair("Base/A.md", "Base/B.md", "child", core.RelationType.INFERRED, core.LinkDirection.FROM, { sourceKind: "obsidian-link" });
  base.addPair("Base/C.md", "Base/D.md", "parent", core.RelationType.DEFINED, core.LinkDirection.FROM, { sourceKind: "frontmatter-ontology", definition: "parent" });
  const fork = base.fork();
  fork.removeDeclarationsTouching("Base/A.md", () => true);
  fork.addPair("Base/A.md", "Base/C.md", "left", core.RelationType.DEFINED, core.LinkDirection.BOTH, { sourceKind: "inline-ontology", definition: "friend" });
  const renamedTouched = [...fork.renamePath("Base/C.md", "Base/Z.md")];
  const storeOps = {
    baseCounts: { declarations: base.declarationCount, pairs: base.pairCount, depth: base.depth },
    forkCounts: { declarations: fork.declarationCount, pairs: fork.pairCount, depth: fork.depth },
    baseDeclarations: [...base.declarations()].map(cleanEvidence),
    forkDeclarations: [...fork.declarations()].map(cleanEvidence),
    forkBetweenAZ: fork.between("Base/A.md", "Base/Z.md").map(cleanEvidence),
    forkBetweenZA: fork.between("Base/Z.md", "Base/A.md").map(cleanEvidence),
    renamedTouched,
  };

  const classifications = {};
  for (const [name, value] of Object.entries({
    frontmatterConflict: { source: "A.md", target: "B.md", infer: false },
    multiRoleConflict: { source: "C.md", target: "D.md", infer: false },
    bidirectionalInferred: { source: "E.md", target: "F.md", infer: false },
    friendModeInferred: { source: "E.md", target: "F.md", infer: true },
  })) {
    const relation = pages.get(value.source).neighbours.get(value.target);
    classifications[name] = {
      vector: core.relationVector(relation, value.infer),
      roles: ["parent", "child", "left", "right", "previous", "next"].map((role) => [role, core.classifyRelation(relation, role, value.infer)]),
    };
  }

  return {
    enums: {
      RelationType: { DEFINED: core.RelationType.DEFINED, INFERRED: core.RelationType.INFERRED },
      LinkDirection: { TO: core.LinkDirection.TO, FROM: core.LinkDirection.FROM, BOTH: core.LinkDirection.BOTH },
    },
    store: {
      declarationCount: store.declarationCount,
      pairCount: store.pairCount,
      depth: store.depth,
      declarations: [...store.declarations()].map(cleanEvidence),
      betweenAB: store.between("A.md", "B.md").map(cleanEvidence),
      betweenBA: store.between("B.md", "A.md").map(cleanEvidence),
      fromA: store.from("A.md").map((entry) => ({ targetPath: entry.targetPath, evidence: entry.evidence.map(cleanEvidence) })),
      betweenHG: store.between("H.md", "G.md").map(cleanEvidence),
    },
    storeOps,
    resolved,
    explanations,
    classifications,
  };
}

test("C13b portable evidence/resolver matches the frozen accepted C13a oracle", () => {
  assert.deepEqual(acceptedFixture(), oracle);
});

test("C13b store forks isolate base state and preserve tombstones, IDs, multiplicity, rename and flatten", async () => {
  const base = new core.RelationEvidenceStore();
  base.addPair("A.md", "B.md", "child", core.RelationType.INFERRED, core.LinkDirection.FROM, { sourceKind: "obsidian-link" });
  base.addPair("A.md", "B.md", "child", core.RelationType.INFERRED, core.LinkDirection.FROM, { sourceKind: "obsidian-link" });
  base.addPair("B.md", "C.md", "parent", core.RelationType.DEFINED, core.LinkDirection.FROM, { sourceKind: "frontmatter-ontology" });
  const baseIds = [...base.declarations()].map((item) => item.id);
  const fork = base.fork();
  assert.equal(fork.removeDeclarationsTouching("A.md", (item) => item.declaredTargetPath === "B.md"), 2);
  fork.addPair("A.md", "C.md", "left", core.RelationType.DEFINED, core.LinkDirection.BOTH, { sourceKind: "inline-ontology" });
  assert.deepEqual([...base.declarations()].map((item) => item.id), baseIds, "fork mutation must not alter published base declarations");
  assert.equal(base.declarationCount, 3);
  assert.equal(fork.declarationCount, 2);
  assert.equal(fork.between("A.md", "B.md").length, 0, "empty local bucket must tombstone the base pair");
  const newId = [...fork.declarations()].find((item) => item.declaredByPath === "A.md")?.id;
  assert.equal(newId, "ev-4:forward", "fork continues the declaration sequence without duplicating IDs");
  const renamed = fork.renamePath("C.md", "Z.md");
  assert(renamed.has("Z.md"));
  assert.equal(fork.declarationCount, 2);
  assert.equal(fork.between("A.md", "Z.md").length, 1);
  assert.equal(fork.between("Z.md", "A.md")[0].id, "ev-4:reverse");
  const compacted = await fork.compactCooperative(async () => true);
  assert(compacted);
  assert.equal(compacted.depth, 0);
  assert.equal(compacted.declarationCount, fork.declarationCount);
  assert.equal(compacted.pairCount, fork.pairCount);
  assert.deepEqual([...compacted.declarations()].map(cleanEvidence), [...fork.declarations()].map(cleanEvidence));
  assert.equal(compacted.from("A.md").length, 1);
  assert.equal(compacted.declarationsTouching("Z.md").length, 2);
  assert.equal(compacted.removeDeclarations((item) => item.sourceKind === "inline-ontology"), 1);
  assert.equal(compacted.between("A.md", "Z.md").length, 0);
});


test("C13b cooperative compaction cancellation leaves the source fork intact", async () => {
  const base = new core.RelationEvidenceStore();
  for (let index = 0; index < 400; index += 1) {
    base.addPair(`A${index}.md`, `B${index}.md`, "child", core.RelationType.INFERRED, core.LinkDirection.FROM, { sourceKind: "obsidian-link" });
  }
  const fork = base.fork();
  fork.addPair("Extra.md", "Target.md", "parent", core.RelationType.DEFINED, core.LinkDirection.FROM, { sourceKind: "frontmatter-ontology" });
  const before = [...fork.declarations()].map(cleanEvidence);
  let checkpoints = 0;
  const compacted = await fork.compactCooperative(async () => { checkpoints += 1; return false; });
  assert.equal(compacted, null);
  assert(checkpoints > 0);
  assert.deepEqual([...fork.declarations()].map(cleanEvidence), before);
  assert.equal(base.declarationCount, 400);
});

test("C13b cooperative store removal cancels without mutating the base store", async () => {
  const base = new core.RelationEvidenceStore();
  for (let index = 0; index < 700; index += 1) {
    base.addPair("Hub.md", `T${index}.md`, "child", core.RelationType.INFERRED, core.LinkDirection.FROM, { sourceKind: "obsidian-link" });
  }
  const fork = base.fork();
  let checkpoints = 0;
  const removed = await fork.removeDeclarationsTouchingCooperative("Hub.md", () => true, async () => {
    checkpoints += 1;
    return checkpoints < 2;
  });
  assert.equal(removed, null);
  assert.equal(base.declarationCount, 700);
  assert.equal(base.from("Hub.md").length, 700);
});

function denseGraph(count) {
  const store = new core.RelationEvidenceStore();
  const pages = new Map();
  for (let index = 0; index <= count; index += 1) pages.set(`N${index}.md`, page(`N${index}.md`));
  for (let index = 0; index < count; index += 1) {
    store.addPair(`N${index}.md`, `N${index + 1}.md`, "child", core.RelationType.INFERRED, core.LinkDirection.FROM, { sourceKind: "obsidian-link" });
  }
  return { store, pages };
}

const canonicalNeighbours = (pages) => [...pages].map(([path, source]) => [path, [...source.neighbours].map(([target, relation]) => [target, cleanRelation(relation)])]);

test("C13b cooperative resolution uses the injected 7ms budget and matches full resolution", async () => {
  const sync = denseGraph(900);
  core.resolveEvidenceStore(sync.pages, sync.store);
  const expected = canonicalNeighbours(sync.pages);
  const cooperative = denseGraph(900);
  let clock = 0;
  let yields = 0;
  let progress = 0;
  const resolved = await core.resolveEvidenceStoreCooperative(cooperative.pages, cooperative.store, {
    now: () => clock++,
    yield: async () => { yields += 1; },
    isCurrent: () => true,
  }, 300, () => { progress += 1; });
  assert.equal(resolved, true);
  assert(yields > 0, "fake clock must force time-budget yields");
  assert(progress > 0, "dense work must report progress at the retained 256-record cadence");
  assert.deepEqual(canonicalNeighbours(cooperative.pages), expected);
});

test("C13b cooperative resolution checks cancellation after awaited yields", async () => {
  const { pages, store } = denseGraph(20);
  let current = true;
  let clock = 0;
  let yields = 0;
  const resolved = await core.resolveEvidenceStoreCooperative(pages, store, {
    now: () => clock += 8,
    yield: async () => { yields += 1; current = false; },
    isCurrent: () => current,
  }, 300);
  assert.equal(resolved, false);
  assert.equal(yields, 1);
});


test("C13b cooperative resolver honors the retained batch cancellation checkpoint before yielding", async () => {
  const { pages, store } = denseGraph(8);
  let currentChecks = 0;
  let yields = 0;
  const resolved = await core.resolveEvidenceStoreCooperative(pages, store, {
    now: () => 0,
    yield: async () => { yields += 1; },
    isCurrent: () => { currentChecks += 1; return false; },
  }, 2);
  assert.equal(resolved, false);
  assert.equal(yields, 0);
  assert.equal(currentChecks, 1);
});

test("C13b pair resolution agrees with full resolution for the same pair", () => {
  const full = denseGraph(4);
  core.resolveEvidenceStore(full.pages, full.store);
  const pair = denseGraph(4);
  core.resolveEvidencePair(pair.pages, pair.store, "N2.md", "N3.md");
  assert.deepEqual(cleanRelation(pair.pages.get("N2.md").neighbours.get("N3.md")), cleanRelation(full.pages.get("N2.md").neighbours.get("N3.md")));
});

test("C13b pair resolution preserves caller-supplied target identity", () => {
  const source = page("A.md");
  const stagedTarget = page("B.md");
  const canonicalTarget = page("B.md");
  const pages = new Map([[source.path, source], [stagedTarget.path, stagedTarget]]);
  const store = new core.RelationEvidenceStore();
  store.addPair("A.md", "B.md", "parent", core.RelationType.DEFINED, core.LinkDirection.FROM, { sourceKind: "frontmatter-ontology" });
  core.resolveEvidencePair(pages, store, "A.md", "B.md", () => canonicalTarget);
  assert.equal(source.neighbours.get("B.md").target, canonicalTarget);
});

test("C13b dense store work remains bounded for representative portable fixtures", () => {
  const started = performance.now();
  const store = new core.RelationEvidenceStore();
  for (let index = 0; index < 5000; index += 1) {
    store.addPair("Hub.md", `Target-${index}.md`, "child", core.RelationType.INFERRED, core.LinkDirection.FROM, { sourceKind: "body-url" });
  }
  assert.equal(store.declarationCount, 5000);
  assert.equal(store.from("Hub.md").length, 5000);
  assert(performance.now() - started < 10_000, "representative 5k-degree store operations exceeded the portable test bound");
});

test("C13b portable graph semantics load in a clean process without host/browser shims", () => {
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", `
    import assert from "node:assert/strict";
    import * as core from ${JSON.stringify(pathToFileURL(corePath).href)};
    assert.equal(typeof globalThis.window, "undefined");
    assert.equal(typeof globalThis.document, "undefined");
    assert.equal(core.RelationType.DEFINED, 1);
    assert.equal(core.LinkDirection.BOTH, 3);
    const store = new core.RelationEvidenceStore();
    store.addPair("A.md", "B.md", "child", core.RelationType.DEFINED, core.LinkDirection.FROM, { sourceKind: "frontmatter-ontology" });
    const pages = new Map([["A.md", {path:"A.md", neighbours:new Map()}], ["B.md", {path:"B.md", neighbours:new Map()}]]);
    core.resolveEvidenceStore(pages, store);
    assert.equal(pages.get("A.md").neighbours.get("B.md").target, pages.get("B.md"));
  `], { cwd: temp, encoding: "utf8" });
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test("C13b legacy files are compatibility facades rather than semantic implementation copies", () => {
  const evidenceFacade = readFileSync(join(root, "src/index/RelationEvidence.ts"), "utf8");
  const resolverFacade = readFileSync(join(root, "src/index/RelationResolver.ts"), "utf8");
  assert(!evidenceFacade.includes("class RelationEvidenceStore"));
  assert(!resolverFacade.includes("function classifyRelation"));
  assert(!resolverFacade.includes("function relationVector"));
  assert(resolverFacade.includes("resolveEvidenceStoreCooperativeCore"), "legacy cooperative API must delegate to the portable owner");
});
