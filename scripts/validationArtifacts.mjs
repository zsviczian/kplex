/** Local validation storage and commit gate. Never sweeps temp directories, vaults or backups.
 * Committed history is reviewed separately; age alone cannot authorize deleting a linked contract. */
import {chmodSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, statSync, writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {hostname} from 'node:os';
import {isAbsolute, join, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';

export const RAW_DAYS=14, REVIEW_DAYS=90;
const DAY=86400000, MARKER='.validation-run.json', OWNER='kplex-validation-v1';
const policyPath='.github/validation-retention.json';
const repoRoot=resolve(fileURLToPath(new URL('..',import.meta.url)));
/** Reject path traversal and linked ancestors before creating or deleting anything. */
function contained(root,target){const part=relative(root,target);return part!==''&&!part.startsWith('..')&&!isAbsolute(part)&&!part.includes(':');}
/** A report tree containing links or repository/vault markers is not disposable evidence. */
function ordinaryTree(path){
 const stat=lstatSync(path);if(stat.isSymbolicLink())return false;
 if(stat.isDirectory())return readdirSync(path).every(name=>!['.git','.obsidian','vaults'].includes(name)&&ordinaryTree(join(path,name)));
 return stat.isFile();
}
/** Managed storage is a fixed repository-local path; linked workspace roots are never traversed. */
function storage(root,create=false){
 const canonical=realpathSync(root),work=join(canonical,'.test-work'),directory=join(work,'validation');
 for(const path of [work,directory]){
  if(existsSync(path)){if(lstatSync(path).isSymbolicLink()||!lstatSync(path).isDirectory()||realpathSync(path)!==path)throw Error('Linked/non-directory validation storage');}
  else if(create)mkdirSync(path);else return null;
 }
 return directory;
}
/** PID uncertainty protects a live report rather than guessing it is safe to remove. */
function alive(pid){try{process.kill(pid,0);return true;}catch(error){return error.code!=='ESRCH';}}
/** A newer write keeps the run relevant even when its original completion receipt is older. */
function newest(path){const stat=statSync(path);return stat.isDirectory()?Math.max(stat.mtimeMs,...readdirSync(path).map(name=>newest(join(path,name)))):stat.mtimeMs;}
/** Only marker-owned, inactive, ordinary report trees expire. Dry-run is the CLI default. */
export function pruneValidationReports({root=repoRoot,now=Date.now(),apply=false}={}){
 const directory=storage(root);if(!directory)return [];
 const results=[];
 for(const name of readdirSync(directory)){
  const path=join(directory,name);let reason='unowned',expiresAt;
  try{
   if(!contained(directory,path)||!ordinaryTree(path)||!lstatSync(path).isDirectory())reason='protected-tree';
   else{
    const marker=JSON.parse(readFileSync(join(path,MARKER),'utf8'));
    if(marker.owner!==OWNER||marker.version!==1||!marker.token||!Number.isFinite(Date.parse(marker.createdAt))
      ||!Number.isFinite(Date.parse(marker.expiresAt))||Date.parse(marker.expiresAt)>Date.parse(marker.createdAt)+REVIEW_DAYS*DAY)reason='unverifiable';
    else if(marker.active&&(marker.hostname!==hostname()||!Number.isInteger(marker.pid)||marker.pid<=0||alive(marker.pid)))reason='active';
    else{
     expiresAt=Math.max(Date.parse(marker.expiresAt),newest(path)+RAW_DAYS*DAY);
     reason=expiresAt>now?'retained':'expired';
     if(reason==='expired'&&execFileSync('git',['ls-files','-z','--',relative(realpathSync(root),path)],{cwd:root,encoding:'utf8'}))reason='tracked';
     if(reason==='expired'&&apply){
      // Revalidate the final absolute target and ownership immediately before recursive removal.
      if(realpathSync(path)!==path||!contained(directory,path)||!ordinaryTree(path)
        ||JSON.parse(readFileSync(join(path,MARKER),'utf8')).token!==marker.token)throw Error('Validation ownership changed');
      rmSync(path,{recursive:true});reason='removed';
     }
    }
   }
  }catch(error){if(error.code!=='ENOENT')reason='unverifiable';}
  results.push({name,reason,...(expiresAt?{expiresAt:new Date(expiresAt).toISOString()}:{})});
 }
 return results;
}
/** Create raw output here instead of docs/validation or an unmanaged OS-temp folder. */
export function createValidationRun(label,{root=repoRoot,now=Date.now()}={}){
 if(!/^[a-z0-9][a-z0-9-]{0,70}$/.test(label))throw Error('Use a short validation label');
 const directory=storage(root,true);pruneValidationReports({root,now,apply:true});
 const path=mkdtempSync(join(directory,new Date(now).toISOString().slice(0,10)+'-'+label+'-'));
 const marker={owner:OWNER,version:1,token:randomUUID(),createdAt:new Date(now).toISOString(),expiresAt:new Date(now+RAW_DAYS*DAY).toISOString(),active:true,pid:process.pid,hostname:hostname()};
 writeFileSync(join(path,MARKER),JSON.stringify(marker,null,2)+'\n');
 let done=false;
 return {directory:path,complete({holdUntil,reason}={}){
  if(done)return;
  if(holdUntil&&(!reason||!Number.isFinite(Date.parse(holdUntil))||Date.parse(holdUntil)>now+REVIEW_DAYS*DAY||Date.parse(holdUntil)<=now))throw Error('A hold needs a reason and a future expiry within 90 days');
  const current=JSON.parse(readFileSync(join(path,MARKER),'utf8'));if(current.token!==marker.token)throw Error('Validation ownership changed');
  writeFileSync(join(path,MARKER),JSON.stringify({...marker,active:false,...(holdUntil?{expiresAt:holdUntil,holdReason:reason}:{})},null,2)+'\n');
  done=true;
 }};
}
/** Review only changed Git content; old reports are not an excuse to add more generated output. */
export function checkValidationChanges(changes,read,{now=Date.now(),retained=[]}={}){
 const errors=[];const approvals=new Map();
 for(const entry of retained){
  if(!entry.path?.startsWith('docs/validation/')||!entry.reason||!entry.approvedBy||!Number.isFinite(Date.parse(entry.reviewBy))
   ||Date.parse(entry.reviewBy)<=now||Date.parse(entry.reviewBy)>now+REVIEW_DAYS*DAY)errors.push('Invalid/expired validation retention: '+entry.path);
  approvals.set(entry.path,entry);
 }
 for(const {path,status} of changes){
  if(path.startsWith('.test-work/')){errors.push('Local validation/workspace artifacts must not be committed: '+path);continue;}
  if(!path.startsWith('docs/validation/')||path==='docs/validation/README.md')continue;
  const raw=/\.(json|jsonl|log|csv|zip|har|trace|txt)$/i.test(path);
  const approval=approvals.get(path);
  if(raw&&!(approval?.allowRaw===true)){errors.push('Generated validation output belongs in .test-work/validation: '+path);continue;}
  if(status==='A'&&!approval)errors.push('New validation document needs explicit retention approval: '+path);
  if(/\.md$/i.test(path)&&Buffer.byteLength(read(path))>6000)errors.push('Validation summary exceeds 6,000 bytes; put details in the PR/local artifacts: '+path);
 }
 return errors;
}
/** Audit committed reports for review; never delete linked history, test fixtures or user data by age. */
export function auditValidationReports({root=repoRoot,now=Date.now()}={}){
 const paths=execFileSync('git',['ls-files','-z','docs/validation'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean);
 const policy=existsSync(join(root,policyPath))?JSON.parse(readFileSync(join(root,policyPath),'utf8')):{retained:[]};
 const approvals=new Map((policy.retained??[]).map(entry=>[entry.path,entry]));
 return paths.filter(path=>/\.(json|md|png|webp)$/i.test(path)).map(path=>{
  const date=path.match(/20\d{2}-\d{2}-\d{2}/)?.[0],days=/\.json$/i.test(path)?RAW_DAYS:REVIEW_DAYS;
  return {path,reviewDue:approvals.has(path)?Date.parse(approvals.get(path).reviewBy)<=now:date?Date.parse(date)+days*DAY<=now:true};
 }).filter(entry=>entry.reviewDue);
}
/** Install only our own commit guard; preserve custom hooks and hooksPath configuration. */
export function installValidationHook({root=repoRoot}={}){
 const git=(args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
 let gitDirectory;try{
  if(realpathSync(git(['rev-parse','--show-toplevel']))!==realpathSync(root))return 'not-a-git-checkout';
  gitDirectory=realpathSync(resolve(root,git(['rev-parse','--git-common-dir'])));
 }catch{return 'not-a-git-checkout';}
 try{if(git(['config','--get','core.hooksPath']))return 'custom-hooks-path-preserved';}catch{ /* Unset is the default hooks directory. */ }
 const directory=join(gitDirectory,'hooks'),path=join(directory,'pre-commit'),signature='# kplex-validation-hook-v1';
 const legacy='#!/bin/sh\n'+signature+'\nif test -f scripts/validationArtifacts.mjs; then\n  exec node scripts/validationArtifacts.mjs check\nfi\n';
 const content=legacy.replace(' check\n',' check --staged\n');
 if(existsSync(directory)&&lstatSync(directory).isSymbolicLink())return 'linked-hooks-directory-preserved';
 if(existsSync(path)&&(lstatSync(path).isSymbolicLink()||!lstatSync(path).isFile()||![content,legacy].includes(readFileSync(path,'utf8'))))return 'custom-hook-preserved';
 if(!contained(gitDirectory,path))throw Error('Unexpected hook target');
 mkdirSync(directory,{recursive:true});
 writeFileSync(path,content,{mode:0o755});chmodSync(path,0o755);
 return 'installed';
}
/** Keep CLI deletion opt-in; preverify invokes the same fixed-scope cleanup with --apply. */
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [command='check',...args]=process.argv.slice(2);
 if(command==='prune')console.log(JSON.stringify(pruneValidationReports({apply:args.includes('--apply')}),null,2));
 else if(command==='audit'){const due=auditValidationReports();console.log(JSON.stringify(args.includes('--list')?due:{reviewDue:due.length,action:'Review links and relevance before retiring committed records; use audit --list.'},null,2));}
 else if(command==='install-hook')console.log('Validation pre-commit hook: '+installValidationHook());
 else if(command==='check'){
  // A commit hook always inspects the index, even inside a CI-created fixture inheriting a base.
  const base=args.includes('--staged')?undefined:args.includes('--base')?args[args.indexOf('--base')+1]:process.env.VALIDATION_BASE;
  const diff=base?['diff','--name-status','--no-renames','-z','--diff-filter=AM',base,'HEAD']:['diff','--cached','--name-status','--no-renames','-z','--diff-filter=AM'];
  const fields=execFileSync('git',diff,{cwd:repoRoot,encoding:'utf8'}).split('\0').filter(Boolean),changes=[];
  for(let index=0;index<fields.length;index+=2)changes.push({status:fields[index],path:fields[index+1]});
  const read=path=>execFileSync('git',['show',(base?'HEAD:':':')+path],{cwd:repoRoot,encoding:'utf8',stdio:['ignore','pipe','pipe']});
  let policyText;try{policyText=read(policyPath);}catch(error){if(base)throw error;}
  const policy=policyText?JSON.parse(policyText):{retained:[]};
  const errors=checkValidationChanges(changes,read,{retained:policy.retained});
  if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}else console.log('Validation commit policy passed.');
 }else throw Error('Use check [--staged | --base REF], prune [--apply], audit [--list], or install-hook');
}
