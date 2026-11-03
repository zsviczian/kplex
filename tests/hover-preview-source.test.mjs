/** Native source registration and event payloads execute actual plugin methods with finite host
 * capabilities. View IDs/preferences stay independent; native UI acceptance remains a CLI lane. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const source=ts.createSourceFile('main.ts',readFileSync('src/main.ts','utf8'),ts.ScriptTarget.Latest,true);
const registrations=[];let preview;
/** Locate the canonical production boundary without substituting its registration or payload. */
function visit(node){
 if(ts.isCallExpression(node)&&node.expression.getText(source)==='this.registerHoverLinkSource')registrations.push(node.getText(source));
 if(ts.isMethodDeclaration(node)&&node.name.getText(source)==='triggerHoverPreview')preview=node.getText(source);
 ts.forEachChild(node,visit);
}visit(source);

test('one primary Page Preview source retains its canonical ID and default preference',()=>{
 const values=[];const owner={registerHoverLinkSource:(...args)=>values.push(args)};
 Function('KPLEX_VIEW_TYPE','KPLEX_SIDEPANEL_VIEW_TYPE',registrations.join(';')).call(owner,'k-plex-react-view','k-plex-sidepanel-view');
 assert.deepEqual(values,[['k-plex-react-view',{display:'K-Plex',defaultMod:false}]]);
});

test('ordinary and expanded section hover payloads retain source path, target document and parent',()=>{
 assert(preview);const emitted=ts.transpileModule('class Owner{'+preview+'}',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 const Owner=Function('KPLEX_VIEW_TYPE',emitted+';return Owner')('k-plex-react-view');
 const owner=new Owner(),events=[],parent={},target={ownerDocument:{name:'popout'}},event={type:'pointerover'};
 Object.assign(owner,{app:{workspace:{trigger:(...args)=>events.push(args)}},hoverParent:parent});
 owner.triggerHoverPreview({file:{path:'Case Note.md'}},target,event,'Source.md');
 owner.triggerHoverPreview({file:{path:'Case Note.md'},transient:{kind:'section',subpath:'#Mixed Heading'}},target,event,'Source.md');
 owner.triggerHoverPreview({url:'obsidian://new?vault=Other'},target,event,'Source.md');
 assert.equal(events.length,2,'URI/non-file preview preparation does not emit protocol work');
 for(const [name,payload] of events){assert.equal(name,'hover-link');assert.equal(payload.source,'k-plex-react-view');assert.equal(payload.targetEl,target);assert.equal(payload.hoverParent,parent);assert.equal(payload.event,event);assert.equal(payload.sourcePath,'Source.md');}
 assert.deepEqual(events.map(([,payload])=>payload.linktext),['Case Note.md','Case Note.md#Mixed Heading']);
});
