/** Architectural UI rules guard real consumer ownership rather than pixel snapshots.
 * Actual form geometry, keyboard behavior, themes and glyphs have browser/native coverage. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync,readdirSync} from 'node:fs';
import {relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';

const root=new URL('../',import.meta.url);
/** Inventory the current source, including nested modal families and host adapters. */
function sourceFiles(directory=new URL('src/',root)){
  return readdirSync(directory,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?sourceFiles(new URL(entry.name+'/',directory)):/\.tsx?$/.test(entry.name)?[new URL(entry.name,directory)]:[]);
}

/** Inspect syntax rather than matching strings, including aliases and type-only imports. */
function rawHostControls(name,source){
    const violations=[];
    if(name==='src/adapters/obsidian/KplexModal.ts')return violations;
    const tree=ts.createSourceFile(name,source,ts.ScriptTarget.Latest,true);
    for(const statement of tree.statements){
      if(!ts.isImportDeclaration(statement)||statement.moduleSpecifier.text!=='obsidian'||statement.importClause?.isTypeOnly)continue;
      const bindings=statement.importClause?.namedBindings;if(!bindings||!ts.isNamedImports(bindings))continue;
      for(const item of bindings.elements){if(item.isTypeOnly)continue;const imported=item.propertyName?.text??item.name.text;
        if(imported==='Modal'||imported==='Setting'&&name.startsWith('src/ui/'))violations.push(name+': raw '+imported);
      }
    }
    return violations;
}

test('native modal and authored-field consumers use the shared host form boundary',()=>{
  const violations=sourceFiles().flatMap(file=>rawHostControls(relative(fileURLToPath(root),fileURLToPath(file)).replaceAll('\\','/'),readFileSync(file,'utf8')));
  assert.deepEqual(violations,[]);
});

test('shared native form boundary rejects direct and aliased runtime imports without banning contracts',()=>{
  assert.deepEqual(rawHostControls('src/ui/Bad.ts','import {Modal as Dialog, Setting as Row} from "obsidian";'),['src/ui/Bad.ts: raw Modal','src/ui/Bad.ts: raw Setting']);
  assert.deepEqual(rawHostControls('src/adapters/obsidian/Bad.ts','import {Modal} from "obsidian";'),['src/adapters/obsidian/Bad.ts: raw Modal']);
  assert.deepEqual(rawHostControls('src/ui/Contract.ts','import type {Modal} from "obsidian"; import {type Setting} from "obsidian";'),[]);
  assert.deepEqual(rawHostControls('src/adapters/obsidian/KplexModal.ts','import {Modal, Setting} from "obsidian";'),[]);
});

test('template search and completion fields use shared labelled controls and linking/import share one relationship row',()=>{
  assert(readFileSync(new URL('src/ui/features/CreationCompletionSelect.tsx',root),'utf8').includes('createElement(FormSelect,'));
  const template=readFileSync(new URL('src/ui/features/DrawingTemplateSelect.tsx',root),'utf8');
  for(const token of ['createElement(FormField,','FuzzySuggester','kplex-native-combobox'])assert(template.includes(token),token);
  for(const file of ['NewRelatedNoteModal.ts','RelationshipSelectionControl.tsx'])assert(readFileSync(new URL('src/ui/'+file,root),'utf8').includes('RelationshipFieldControl'),file);
  assert(readFileSync(new URL('AGENTS.md',root),'utf8').includes('[UI_RULES.md](UI_RULES.md)'));
  const viewportOwners=sourceFiles().filter(file=>readFileSync(file,'utf8').includes('fitMobileModalToViewport(')).map(file=>relative(fileURLToPath(root),fileURLToPath(file)).replaceAll('\\','/')).sort();
  assert.deepEqual(viewportOwners,['src/adapters/obsidian/KplexModal.ts','src/ui/mobileModalViewport.ts'],'Mobile keyboard accommodation belongs to the common native shell, not selected individual dialogs');
});
