/** Filesystem policy regressions: deletion is exercised only in owned disposable Git roots. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {execFileSync,spawnSync} from 'node:child_process';
import {existsSync,mkdirSync,mkdtempSync,readFileSync,rmSync,symlinkSync,utimesSync,writeFileSync} from 'node:fs';
import {delimiter,dirname,join} from 'node:path';
import {tmpdir} from 'node:os';
import {hostname} from 'node:os';
import {createValidationRun,pruneValidationReports,checkValidationChanges,installValidationHook,RAW_DAYS} from '../scripts/validationArtifacts.mjs';
const DAY=86400000;
/** Keep test cleanup outside the production cleaner's scope and never share a user checkout. */
function fixture(body){const root=mkdtempSync(join(tmpdir(),'kplex-validation-policy-'));try{execFileSync('git',['init','-q'],{cwd:root});return body(root);}finally{rmSync(root,{recursive:true});}}
/** Mutate only this fixture's marker to exercise conservative handling of damaged state. */
function marker(run,change){const path=join(run.directory,'.validation-run.json');writeFileSync(path,JSON.stringify({...JSON.parse(readFileSync(path,'utf8')),...change}));}

test('expired owned reports are dry-run candidates, then removed without touching other workspace data',()=>fixture(root=>{
 const now=Date.now(),run=createValidationRun('expired',{root,now});writeFileSync(join(run.directory,'result.json'),'{}');run.complete();
 const backup=join(root,'.test-work','deploy-backups');mkdirSync(backup);writeFileSync(join(backup,'main.js'),'backup');
 assert.equal(pruneValidationReports({root,now:now+15*DAY})[0].reason,'expired');assert(existsSync(run.directory));
 assert.equal(pruneValidationReports({root,now:now+15*DAY,apply:true})[0].reason,'removed');assert(!existsSync(run.directory));assert(existsSync(join(backup,'main.js')));
}));
test('recent, active and reason-held data survive cleanup and complete is idempotent',()=>fixture(root=>{
 const now=Date.now(),active=createValidationRun('active',{root,now}),recent=createValidationRun('recent',{root,now}),held=createValidationRun('held',{root,now});
 recent.complete();held.complete({holdUntil:new Date(now+40*DAY).toISOString(),reason:'Pending failure review'});held.complete();
 assert.equal(pruneValidationReports({root,now:now+DAY,apply:true}).filter(row=>row.reason==='removed').length,0);
 const rows=pruneValidationReports({root,now:now+20*DAY,apply:true});
 assert.equal(rows.find(row=>row.name===active.directory.split(/[\\/]/).at(-1)).reason,'active');
 assert(existsSync(active.directory));assert(existsSync(held.directory));assert(!existsSync(recent.directory));active.complete();
 assert.equal(pruneValidationReports({root,now:now+41*DAY,apply:true}).filter(row=>row.reason==='removed').length,2);
}));
test('recent writes extend relevance without granting permanent retention',()=>fixture(root=>{
 const now=Date.now(),run=createValidationRun('touched',{root,now});run.complete();const file=join(run.directory,'log.txt');writeFileSync(file,'new');
 utimesSync(file,new Date(now+10*DAY),new Date(now+10*DAY));
 assert.equal(pruneValidationReports({root,now:now+20*DAY,apply:true})[0].reason,'retained');
 assert.equal(pruneValidationReports({root,now:now+25*DAY,apply:true})[0].reason,'removed');
}));
test('holds need a reason and cannot exceed 90 days',()=>fixture(root=>{
 const now=Date.now(),run=createValidationRun('hold',{root,now});
 assert.throws(()=>run.complete({holdUntil:new Date(now+20*DAY).toISOString()}));
 assert.throws(()=>run.complete({holdUntil:new Date(now+91*DAY).toISOString(),reason:'too long'}));
 run.complete();assert.equal(RAW_DAYS,14);
}));
test('malformed, foreign active and unowned entries are preserved',()=>fixture(root=>{
 const now=Date.now(),bad=createValidationRun('bad',{root,now}),foreign=createValidationRun('foreign',{root,now});
 marker(bad,{expiresAt:'invalid'});marker(foreign,{hostname:hostname()+'-other'});
 const unknown=join(root,'.test-work','validation','unowned');mkdirSync(unknown);writeFileSync(join(unknown,'data.txt'),'keep');
 pruneValidationReports({root,now:now+100*DAY,apply:true});assert(existsSync(bad.directory));assert(existsSync(foreign.directory));assert(existsSync(unknown));
}));
test('symlinks, junctions and vault/repository trees never become recursive deletion targets',()=>fixture(root=>{
 const now=Date.now(),run=createValidationRun('linked',{root,now});run.complete();const outside=join(root,'outside');mkdirSync(outside);writeFileSync(join(outside,'keep.txt'),'keep');
 symlinkSync(outside,join(run.directory,'escape'),'junction');pruneValidationReports({root,now:now+30*DAY,apply:true});
 assert(existsSync(join(outside,'keep.txt')));assert(existsSync(run.directory));
 const vault=createValidationRun('vault',{root,now});vault.complete();mkdirSync(join(vault.directory,'.obsidian'));
 assert.equal(pruneValidationReports({root,now:now+30*DAY,apply:true}).find(row=>row.name===vault.directory.split(/[\\/]/).at(-1)).reason,'protected-tree');
}));
test('linked validation storage is rejected before creating or sweeping content',()=>fixture(root=>{
 const outside=join(root,'outside');mkdirSync(outside);mkdirSync(join(root,'.test-work'));symlinkSync(outside,join(root,'.test-work','validation'),'junction');
 assert.throws(()=>createValidationRun('nope',{root}),/Linked/);assert.throws(()=>pruneValidationReports({root,apply:true}),/Linked/);
 assert.equal(existsSync(join(outside,'.validation-run.json')),false);
}));
test('tracked files stay protected even when their managed marker expires',()=>fixture(root=>{
 const now=Date.now(),run=createValidationRun('tracked',{root,now});run.complete();const file=join(run.directory,'fixture.txt');writeFileSync(file,'source');
 execFileSync('git',['add',file],{cwd:root});assert.equal(pruneValidationReports({root,now:now+20*DAY,apply:true})[0].reason,'tracked');assert(existsSync(file));
}));

const summary='docs/validation/needed.md',raw='docs/validation/raw.json',now=Date.now();
const approval={path:summary,reason:'Maintainer requested a durable contract example',approvedBy:'fixture maintainer',reviewBy:new Date(now+30*DAY).toISOString()};
test('ordinary source/test changes need no validation exception',()=>assert.deepEqual(checkValidationChanges([{path:'tests/fixture.json',status:'A'}],()=>'',{now}),[]));
test('force-added workspace output is always rejected',()=>assert.match(checkValidationChanges([{path:'.test-work/validation/raw.json',status:'A'}],()=>'',{now})[0],/must not be committed/));
test('new raw and unapproved summaries are rejected',()=>{
 assert.match(checkValidationChanges([{path:raw,status:'A'}],()=>'',{now})[0],/Generated/);
 assert.match(checkValidationChanges([{path:summary,status:'A'}],()=>'',{now})[0],/retention approval/);
});
test('a concise explicitly approved summary passes but oversized output does not',()=>{
 assert.deepEqual(checkValidationChanges([{path:summary,status:'A'}],()=>'actual result',{now,retained:[approval]}),[]);
 assert.match(checkValidationChanges([{path:summary,status:'A'}],()=>'x'.repeat(6001),{now,retained:[approval]})[0],/6,000/);
});
test('existing unchanged history is grandfathered; changed raw output needs explicit approval',()=>{
 assert.deepEqual(checkValidationChanges([],()=>'',{now}),[]);
 assert.match(checkValidationChanges([{path:raw,status:'M'}],()=>'',{now})[0],/Generated/);
 assert.deepEqual(checkValidationChanges([{path:raw,status:'A'}],()=>'',{now,retained:[{...approval,path:raw,allowRaw:true}]}),[]);
});
test('expired, indefinite and self-incomplete approvals fail closed',()=>{
 for(const change of [{reviewBy:'never'},{reviewBy:new Date(now-DAY).toISOString()},{reviewBy:new Date(now+91*DAY).toISOString()},{approvedBy:''}])assert(checkValidationChanges([],()=>'',{now,retained:[{...approval,...change}]}).length);
});
test('the CLI checks staged approval/content rather than unstaged promises',()=>fixture(root=>{
 mkdirSync(join(root,'scripts'));mkdirSync(join(root,'.github'));mkdirSync(join(root,'docs','validation'),{recursive:true});
 writeFileSync(join(root,'scripts','validationArtifacts.mjs'),readFileSync(new URL('../scripts/validationArtifacts.mjs',import.meta.url)));
 const policy=join(root,'.github','validation-retention.json');writeFileSync(policy,JSON.stringify({retained:[]}));writeFileSync(join(root,summary),'result');
 const commit=()=>execFileSync('git',['-c','user.name=Validation fixture','-c','user.email=fixture@example.invalid','commit','--allow-empty','-qm','fixture'],{cwd:root});commit();
 execFileSync('git',['add','.github/validation-retention.json',summary],{cwd:root});writeFileSync(policy,JSON.stringify({retained:[approval]}));
 const run=()=>spawnSync(process.execPath,['scripts/validationArtifacts.mjs','check','--staged'],{cwd:root,encoding:'utf8',env:{...process.env,VALIDATION_BASE:'unrelated-ci-base'}});
 assert.equal(run().status,1);execFileSync('git',['add','.github/validation-retention.json'],{cwd:root});assert.equal(run().status,0);
 writeFileSync(join(root,raw),'{}');execFileSync('git',['add','--force',raw],{cwd:root});assert.equal(run().status,1);
 writeFileSync(policy,'invalid JSON');execFileSync('git',['add','.github/validation-retention.json'],{cwd:root});assert.equal(run().status,1);
 writeFileSync(policy,JSON.stringify({retained:[approval]}));execFileSync('git',['add','.github/validation-retention.json'],{cwd:root});commit();
 // Uncommitted approval cannot make the actual CI base-to-HEAD report addition acceptable.
 writeFileSync(policy,JSON.stringify({retained:[approval,{...approval,path:raw,allowRaw:true}]}));
 assert.equal(spawnSync(process.execPath,['scripts/validationArtifacts.mjs','check','--base','HEAD~1'],{cwd:root,encoding:'utf8'}).status,1);
}));
test('commit guard installs idempotently without overwriting custom hooks or hooksPath',()=>fixture(root=>{
 assert.equal(installValidationHook({root}),'installed');assert.equal(installValidationHook({root}),'installed');
 const hook=join(root,'.git','hooks','pre-commit');writeFileSync(hook,'#!/bin/sh\n# user hook\nexit 0\n');
 assert.equal(installValidationHook({root}),'custom-hook-preserved');assert.match(readFileSync(hook,'utf8'),/user hook/);
 execFileSync('git',['config','core.hooksPath','elsewhere'],{cwd:root});assert.equal(installValidationHook({root}),'custom-hooks-path-preserved');
}));
test('an archive nested in another checkout never installs into the parent Git repository',()=>fixture(root=>{
 const archive=join(root,'archive');mkdirSync(archive);assert.equal(installValidationHook({root:archive}),'not-a-git-checkout');assert(!existsSync(join(root,'.git','hooks','pre-commit')));
}));
test('the installed Git hook prevents a real commit containing generated validation output',()=>fixture(root=>{
 mkdirSync(join(root,'scripts'));mkdirSync(join(root,'.github'));mkdirSync(join(root,'docs','validation'),{recursive:true});
 writeFileSync(join(root,'scripts','validationArtifacts.mjs'),readFileSync(new URL('../scripts/validationArtifacts.mjs',import.meta.url)));
 writeFileSync(join(root,'.github','validation-retention.json'),'{"retained":[]}');
 execFileSync('git',['add','scripts','.github'],{cwd:root});
 const args=['-c','user.name=Validation fixture','-c','user.email=fixture@example.invalid','commit','-qm','fixture'];
 execFileSync('git',args,{cwd:root});const before=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'});
 assert.equal(installValidationHook({root}),'installed');writeFileSync(join(root,raw),'{}');execFileSync('git',['add','--force',raw],{cwd:root});
 const blocked=spawnSync('git',args,{cwd:root,encoding:'utf8',env:{...process.env,VALIDATION_BASE:'unrelated-ci-base',PATH:dirname(process.execPath)+delimiter+process.env.PATH}});
 assert.notEqual(blocked.status,0);assert.match(blocked.stderr,/Generated validation output/);
 assert.equal(execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}),before,'No commit was created');
}));
