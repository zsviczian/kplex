/** GraphQL.js carries its installed MIT notice into minified distributable code using the same
 * esbuild legal-comment retention that already preserves bundled React notices. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';

test('GraphQL.js installed MIT copyright and permission notice survive bundled production minification',async()=>{
  const notice=(await readFile(new URL('../node_modules/graphql/LICENSE',import.meta.url),'utf8')).trim();
  const adapter=await readFile(new URL('../src/adapters/obsidian/publicApiGraphql.ts',import.meta.url),'utf8');
  assert(adapter.includes('/*! @license GraphQL.js\n'+notice+'\n*/'),'Keep the installed dependency license verbatim in its retained legal block');
  const output=await build({entryPoints:[fileURLToPath(new URL('../src/adapters/obsidian/publicApiGraphql.ts',import.meta.url))],
    bundle:true,minify:true,target:'es2021',platform:'node',format:'cjs',write:false});
  assert(output.outputFiles[0].text.includes(notice),'The generated JavaScript must retain the full copyright and permission notice');
  assert.match(notice,/Copyright \(c\) GraphQL Contributors/);
  assert.match(notice,/MIT License/);
});
