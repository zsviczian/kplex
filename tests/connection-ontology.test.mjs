/** Portable connection-edit eligibility consumes canonical evidence without native state or writes. */
import assert from "node:assert/strict";
import test from "node:test";
import {build} from "esbuild";

const compiled = await build({stdin: {resolveDir: process.cwd(), contents: `
  export * from './src/application/connectionOntology';
  export * from './src/core/contracts/ontologyConfiguration';
  export * from './src/core/graph/relations';
`}, write: false, bundle: true, format: "cjs", platform: "node"});
const module = {exports: {}};
Function("module", "exports", compiled.outputFiles[0].text)(module, module.exports);
const M = module.exports;
const configuration = M.ontologyConfiguration({ontologyPairingVersion: 1, hierarchy: {
  parents: ["Parent / Child", "Guardian"], children: [], leftFriends: ["Friend", "Trusted / Trusting"],
  rightFriends: ["Challenger"], previous: ["Previous / Next"], next: [], hidden: ["Hidden"], exclusions: ["Excluded"],
}});

/** Construct canonical view evidence while keeping the original physical property's coordinates. */
function declaration(field = "Child", declaredRole = "child", owner = "A.md", sourcePath = "A.md", overrides = {}) {
  const targetPath = sourcePath === "A.md" ? "B.md" : "A.md";
  return {id: "attempt-local", sourceKind: "frontmatter-ontology", sourcePath, targetPath,
    declaredByPath: owner, declaredTargetPath: owner === "A.md" ? "B.md" : "A.md", declaredRole,
    fieldName: field, role: owner === sourcePath ? declaredRole : M.ONTOLOGY_RECIPROCAL[declaredRole],
    relationType: M.RelationType.DEFINED, direction: owner === sourcePath ? M.LinkDirection.FROM : M.LinkDirection.TO, ...overrides};
}

/** Read precisely one view orientation; the selector has no mutation, lookup or source capabilities. */
function select(evidence, source = "A.md", config = configuration) {
  return M.selectConnectionOntology(evidence, config, source, source === "A.md" ? "B.md" : "A.md");
}

for (const [field, role] of [["Parent", "parent"], ["Child", "child"], ["Friend", "left"], ["Challenger", "right"], ["Previous", "previous"], ["Next", "next"]]) {
  test(`${role} selects its sole actual property from both view orientations`, () => {
    for (const source of ["A.md", "B.md"]) {
      const item = Object.freeze(declaration(field, role, "A.md", source));
      const selected = select(Object.freeze([item]), source);
      assert.equal(selected.primary, item); assert.deepEqual(selected.declarations, [item]);
      assert.equal(item.fieldName, field); assert.equal(item.declaredRole, role);
    }
  });
}

test("configured reciprocal pairs choose the displayed source's own declaration without ordering dependence", () => {
  for (const [field, partner, role, inverse] of [["Parent", "Child", "parent", "child"], ["Previous", "Next", "previous", "next"], ["Trusted", "Trusting", "left", "left"]]) {
    for (const source of ["A.md", "B.md"]) {
      const a = declaration(field, role, "A.md", source), b = declaration(partner, inverse, "B.md", source);
      const first = select([a, b], source), reversed = select([b, a], source);
      assert.equal(first.declarations.length, 2); assert.equal(first.primary.declaredByPath, source);
      assert.equal(first.signature, reversed.signature);
    }
  }
});

test("unpaired configured Friend and Challenger fields are symmetric; unmatched parent/child names are not paired", () => {
  for (const [field, role] of [["Friend", "left"], ["Challenger", "right"]]) {
    const selected = select([declaration(field, role), declaration(field, role, "B.md")]);
    assert.equal(selected.declarations.length, 2);
  }
  assert.equal(select([declaration("Guardian", "parent"), declaration("Child", "child", "B.md")]), null);
  assert.equal(select([declaration("Parent", "parent"), declaration("Next", "next", "B.md")]), null);
  assert.equal(select([declaration("Friend", "left"), declaration("Trusted", "left", "B.md")]), null);
});

test("multiple owner properties, unsupported roles, unknown fields and unrelated endpoint evidence fail closed", () => {
  const child = declaration();
  for (const evidence of [[], [child, declaration("Friend", "left")], [child, declaration("Parent", "parent", "B.md"), declaration("Friend", "left", "B.md")],
    [declaration("Unknown", "child")], [declaration("Hidden", "hidden")], [declaration("Excluded", "excluded")],
    [declaration("Child", "sibling")], [declaration("Child", "child", "A.md", "A.md", {role: "right"})],
    [declaration("Child", "child", "A.md", "A.md", {relationType: M.RelationType.INFERRED})],
    [declaration("Child", "child", "A.md", "A.md", {declaredByPath: "Other.md"})],
    [declaration("Child", "child", "A.md", "A.md", {targetPath: "Other.md"})]]) assert.equal(select(evidence), null, JSON.stringify(evidence));
  assert.equal(M.selectConnectionOntology([child], configuration, "A.md", "A.md"), null);
});

test("ordinary inferred prose and Obsidian cache mirrors coexist, while competing source kinds refuse a quick ontology replacement", () => {
  const child = declaration();
  for (const sourceKind of ["obsidian-link", "unresolved-link", "body-url"]) {
    const inferred = {...child, sourceKind, relationType: M.RelationType.INFERRED};
    assert.deepEqual(select([inferred, child]).declarations, [child]);
    assert.equal(select([inferred]), null);
  }
  for (const sourceKind of ["inline-ontology", "date-property", "file-tree", "tag-tree", "property-url", "url-origin"]) {
    assert.equal(select([child, {...child, sourceKind}]), null, sourceKind);
  }
});

test("duplicate occurrences reuse the shared physical declaration identity without consuming another property", () => {
  const child = declaration(), repeat = {...child, id: "other", rawValue: "[[B]] and [[Unrelated]]", line: 99, start: 40, end: 65};
  assert.deepEqual(select([child, repeat]).declarations, [child]);
  assert.equal(select([child, {...repeat, fieldName: "child"}]), null, "Ambiguous physical spelling cannot collapse into one edit");
  assert.equal(select([child, {...repeat, direction: M.LinkDirection.TO}]), null, "Contradictory evidence cannot collapse into one owner");
});

test("concurrency signatures ignore attempt-local payloads and positions but retain exact physical intent", () => {
  const child = declaration(), baseline = select([child]).signature;
  assert.equal(select([{...child, id: "later", rawValue: "New unrelated value", line: 88, start: 11, end: 200}]).signature, baseline);
  assert.notEqual(select([{...child, fieldName: "child"}]).signature, baseline);
  assert.notEqual(select([{...child, direction: M.LinkDirection.BOTH}]).signature, baseline);
  assert.notEqual(select([declaration("Next", "next")]).signature, baseline);
  assert.notEqual(select([child, declaration("Parent", "parent", "B.md")]).signature, baseline);
  assert.notEqual(select([declaration("Child", "child", "A.md", "B.md")], "B.md").signature, baseline);
  const changed = M.ontologyConfiguration({ontologyPairingVersion: 1, hierarchy: {...configuration.hierarchy, parents: ["Guardian"], children: ["Child"]}});
  assert.equal(select([child, declaration("Parent", "parent", "B.md")], "A.md", changed), null);
});
