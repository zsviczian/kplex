/** Real command bodies preserve synchronous clipboard activation for both formats and every owner. */
import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
import {browserBundle} from './support/browserTypeScript.mjs';
const host={};new Function('window',await browserBundle(['src/application/supportReport.ts','src/application/supportClipboard.ts']))(host);
const {wrapDiagnosticJson,SupportClipboardSession}=host.sourceModules;
const source=ts.createSourceFile('main.ts',readFileSync(new URL('../src/main.ts',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true);
const plugin=source.statements.find(node=>ts.isClassDeclaration(node)&&node.name?.text==='KplexPlugin');
/** Retain the complete production method, with its actual first await and native UI order. */
function method(name,dependencies){const node=plugin.members.find(member=>member.name?.getText(source)===name);assert(node);const text=node.getText(source);
  const js=ts.transpileModule('const action='+text.replace(/^(?:private )?(?:async )?\w+\(/,text.startsWith('private async')?'async function(': 'function(')+';', {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
  return new Function(...Object.keys(dependencies),js+'return action;')(...Object.values(dependencies));}
for(const kind of ['desktop','mobile-webkit','popout'])test(kind+': both command bodies capture once and synchronously copy identical JSON before modal/await',async()=>{
  const writes=[],order=[];let release,captures=0;
  const owner={navigator:{clipboard:{writeText(text){order.push('clipboard');writes.push(text);return new Promise(resolve=>{release=resolve});}}}};
  const root=kind==='popout'?{activeWindow:owner}:owner;
  const context={unloading:false,translator:()=>'',actionSurfaceHosts:new Map(),actionDialogs:new Map(),
    captureDiagnosticJson(actual){assert.equal(actual,owner);captures++;order.push('capture');return '{\n  "formatVersion": 2\n}';}};
  class Modal{constructor(app,session){this.session=session;}open(){order.push('modal');assert.equal(writes.at(-1),this.session.report);}close(){}}
  const deps={window:root,wrapDiagnosticJson,SupportClipboardSession,SupportReportModal:Modal,Notice:class{}};
  const raw=method('copyIndexDiagnostics',deps),bug=method('reportBug',deps);
  const pending=raw.call(context);assert.deepEqual(order,['capture','clipboard']);assert.equal(captures,1);const json=writes[0];release();await pending;
  order.length=0;bug.call(context,{ownerDocument:{defaultView:owner}});assert.deepEqual(order,['capture','clipboard','modal']);assert.equal(captures,2);
  assert.equal(writes[1],wrapDiagnosticJson(json));release();await Promise.resolve();for(const dialog of context.actionDialogs.keys())dialog.session.dispose();
});
