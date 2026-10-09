/**
 * Applies the approved default-Date product delta to the archived indexing oracle, without
 * regenerating it from production output. Exactly four scalar Date declarations switch from
 * inferred Child to defined Parent; all other source/graph/explanation fields stay frozen.
 */
import assert from 'node:assert/strict';

/** Mutate only the four archived Date pairs and their inverse views/explanations in a cloned oracle. */
export function applyDefaultDateRoleFixture(graph) {
  const dates=graph.declarations.filter(item=>item.sourceKind==='date-property');
  assert.equal(dates.length,4,'The approved Date delta is bounded to four fixture declarations');
  for(const declaration of dates) {
    assert.equal(declaration.role,'child'); assert.equal(declaration.declaredRole,'child');
    assert.equal(declaration.relationType,2);
    declaration.role=declaration.declaredRole='parent'; declaration.relationType=1;
    const forward=graph.pages.find(page=>page.path===declaration.sourcePath).relations.find(item=>item.targetPath===declaration.targetPath);
    const reverse=graph.pages.find(page=>page.path===declaration.targetPath).relations.find(item=>item.targetPath===declaration.sourcePath);
    assert.equal(forward.isChild,true); assert.equal(forward.childType,2);
    assert.equal(reverse.isParent,true); assert.equal(reverse.parentType,2);
    forward.isChild=false; forward.isParent=true;
    forward.parentType=1; forward.parentTypeDefinition=forward.childTypeDefinition;
    delete forward.childType; delete forward.childTypeDefinition;
    reverse.isParent=false; reverse.isChild=true;
    reverse.childType=1; reverse.childTypeDefinition=reverse.parentTypeDefinition;
    delete reverse.parentType; delete reverse.parentTypeDefinition;
    if(!graph.explanations)continue;
    const explanation=graph.explanations.find(item=>[item.sourcePath,item.targetPath].includes(declaration.sourcePath)&&[item.sourcePath,item.targetPath].includes(declaration.targetPath));
    assert(explanation); assert.equal(explanation.summary,'date-property');
    const forwardView=explanation.sourcePath===declaration.sourcePath;
    assert.deepEqual(explanation.resolvedRoles,[{relationType:2,role:forwardView?'child':'parent'}]);
    assert.equal(explanation.decisions.length,1);
    assert.equal(explanation.decisions[0].evidence.sourceKind,'date-property');
    explanation.resolvedRoles=[{relationType:1,role:forwardView?'parent':'child'}];
    explanation.decisions[0].evidence.role=forwardView?'parent':'child';
    explanation.decisions[0].evidence.declaredRole='parent';
    explanation.decisions[0].evidence.relationType=1;
  }
}
