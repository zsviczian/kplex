// Test-only representation of published graph behavior. Keep duplicates and declaration
// provenance; discard only generated evidence IDs and file modification times.
const compareText = (left, right) => left < right ? -1 : left > right ? 1 : 0;
const byJson = (left, right) => compareText(JSON.stringify(left), JSON.stringify(right));

function orderedRecord(value) {
  if (Array.isArray(value)) return value.map(orderedRecord);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([, field]) => field !== undefined)
    .sort(([left], [right]) => compareText(left, right))
    .map(([key, field]) => [key, orderedRecord(field)]));
}

function declaration(evidence) {
  const { id: _generatedId, ...fields } = evidence;
  return orderedRecord(fields);
}

function relation(targetPath, value) {
  const { target, ...fields } = value;
  return orderedRecord({ targetPath, actualTargetPath: target.path, ...fields });
}

function canonicalExplanation(result) {
  if (!result) return null;
  return {
    sourcePath: result.sourcePath,
    targetPath: result.targetPath,
    hidden: result.hidden,
    summary: result.summary,
    resolvedRoles: result.resolvedRoles.map(orderedRecord).sort(byJson),
    decisions: result.decisions.map(({ evidence, ...decision }) =>
      orderedRecord({ ...decision, evidence: declaration(evidence) })).sort(byJson),
  };
}

export function canonicalGraph(index) {
  const pages = index.allPages()
    .filter((page) => !page.transient)
    .map((page) => ({
      path: page.path,
      name: page.name,
      physicalPath: page.file?.path ?? null,
      physicalExtension: page.file?.extension ?? null,
      url: page.url,
      isFolder: page.isFolder,
      isTag: page.isTag,
      aliases: [...page.aliases],
      tags: [...page.tags],
      noteType: page.noteType,
      primaryStyleTag: page.primaryStyleTag,
      styleTags: [...page.styleTags],
      maxLabelLength: page.maxLabelLength,
      relations: [...page.neighbours].map(([path, value]) => relation(path, value)).sort(byJson),
    }))
    .map(orderedRecord)
    .sort((left, right) => compareText(left.path, right.path));

  const declarations = [...index.state.evidence.declarations()].map(declaration).sort(byJson);
  const pairs = new Map();
  for (const item of declarations) {
    const endpoints = [item.sourcePath, item.targetPath].sort(compareText);
    pairs.set(JSON.stringify(endpoints), endpoints);
  }
  const explanations = [...pairs.values()]
    .sort(byJson)
    .map(([sourcePath, targetPath]) =>
      canonicalExplanation(index.explainRelationship(sourcePath, targetPath)));

  return { pages, declarations, explanations };
}

export function canonicalPair(index, sourcePath, targetPath) {
  const value = index.get(sourcePath)?.neighbours.get(targetPath);
  return {
    relation: value ? relation(targetPath, value) : null,
    declarations: index.state.evidence.declarationsForPair(sourcePath, targetPath)
      .map(declaration).sort(byJson),
    explanation: canonicalExplanation(index.explainRelationship(sourcePath, targetPath)),
  };
}

export function canonicalNeighborhood(index, path) {
  const neighborhood = index.getNeighborhood(path);
  if (!neighborhood) return null;
  return orderedRecord({
    centerPath: neighborhood.center.path,
    parents: neighborhood.parents.map(orderedNeighbor),
    children: neighborhood.children.map(orderedNeighbor),
    leftFriends: neighborhood.leftFriends.map(orderedNeighbor),
    rightFriends: neighborhood.rightFriends.map(orderedNeighbor),
    siblings: neighborhood.siblings.map(orderedNeighbor),
  });
}

function orderedNeighbor({ page, ...fields }) {
  return orderedRecord({ path: page.path, ...fields });
}

export function canonicalScene(scene) {
  return orderedRecord({
    nodes: scene.nodes.map(({ page, ...fields }) => ({ path: page.path, ...fields })).map(orderedRecord),
    edges: scene.edges.map(orderedRecord),
    zoneViewports: scene.zoneViewports,
    sectionTreeEdges: scene.sectionTreeEdges,
  });
}
