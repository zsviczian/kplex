/** Canonical saved-pin order remains independent of graph hydration and stale UI gestures. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {plexViewModules} from './support/plexViewFixture.mjs';
const M=await plexViewModules(['src/core/plex/savedPins.ts']);

test('pin moves preserve unavailable entries and saved shortcut positions',()=>{
 const pins=['A.md','Unavailable.md','B.md','https://example.com/Case'],rows=M.savedPinEntries(pins),keys=rows.map(row=>row.id);
 assert.deepEqual(M.moveSavedPin(pins,{id:rows[2].id,before:rows[0].id,expected:keys}),['B.md','A.md','Unavailable.md','https://example.com/Case']);
 assert.deepEqual(M.moveSavedPin(pins,{id:rows[0].id,before:null,expected:keys}),['Unavailable.md','B.md','https://example.com/Case','A.md']);
 assert.deepEqual(pins,['A.md','Unavailable.md','B.md','https://example.com/Case']);
});

test('stale removal addition and reorder cannot overwrite the current canonical collection',()=>{
 const pins=['A.md','B.md','C.md'],rows=M.savedPinEntries(pins),move={id:rows[0].id,before:rows[2].id,expected:rows.map(row=>row.id)};
 for(const current of [['B.md','C.md'],[...pins,'New.md'],['B.md','A.md','C.md']])assert.equal(M.moveSavedPin(current,move),null);
 assert.equal(M.moveSavedPin(pins,{...move,before:rows[1].id}),null,'Already-adjacent placement writes nothing');
 assert.equal(M.moveSavedPin(pins,{...move,before:rows[0].id}),null);
});

test('legacy duplicate paths keep every entry with separate presentation keys',()=>{
 const pins=['A.md','B.md','A.md'],rows=M.savedPinEntries(pins);
 assert.equal(new Set(rows.map(row=>row.id)).size,3);assert.deepEqual(rows.map(row=>row.entry),pins);
 assert.deepEqual(M.moveSavedPin(pins,{id:rows[2].id,before:rows[0].id,expected:rows.map(row=>row.id)}),['A.md','A.md','B.md']);
});
