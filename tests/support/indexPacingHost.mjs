/** Production host pacing capabilities extracted without unrelated plugin startup or UI owners.
 * Shared deterministic and real-IDB regressions execute the actual constructor hint and focus reader. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const ts=createRequire(import.meta.url)('typescript');
const source=ts.createSourceFile('main.ts',readFileSync('src/main.ts','utf8'),ts.ScriptTarget.Latest,true);
const plugin=source.statements.find(node=>ts.isClassDeclaration(node)&&node.name?.text==='KplexPlugin');
let focusHint;
/** Capture the real GraphIndex capability rather than restating startup policy in each test. */
function visit(node){
 if(ts.isNewExpression(node)&&node.expression.getText(source)==='GraphIndex'&&node.arguments?.[0]?.getText(source)==='this')focusHint=node.arguments[4];
 ts.forEachChild(node,visit);
}
visit(plugin);assert(focusHint,'Production GraphIndex receives the live host hint');
export const indexPacingHintSource=focusHint.getText(source);

/** Execute the production focus reader and constructor capability with a narrow native-view double. */
export function hostPacingProbe(){
 const member=plugin.members.find(node=>node.name?.getText(source)==='isKplexIndexingForeground');assert(member);
 const compiled=ts.transpileModule('class FocusProbe {'+member.getText(source)+'\npacingHint(){return ('+indexPacingHintSource+')();}}',
  {compilerOptions:{target:ts.ScriptTarget.ES2021}}).outputText;
 class ItemView{}
 const Probe=new Function('ItemView','KPLEX_VIEW_TYPE','KPLEX_SIDEPANEL_VIEW_TYPE',compiled+';return FocusProbe;')(ItemView,'plex','sidepanel');
 return{Probe,ItemView};
}
