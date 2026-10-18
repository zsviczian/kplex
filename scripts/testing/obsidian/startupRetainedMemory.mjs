/**
 * Controlled live-renderer retained-heap observation, outside startup/quiet timing. Uses the
 * existing native debugger pattern, verifies the exact disposable realm/process, exports only
 * numeric memory/CPU fields, and detaches only its own session. No heap snapshot or trace is saved.
 */
export async function startupRetainedMemory(app, expectedVault) {
  if(!['kplex-test','kplex-test-small'].includes(expectedVault)||app.vault.getName()!==expectedVault)throw Error('Explicit disposable vault required');
  const nativeProcess=require('process'),win=require('@electron/remote').getCurrentWindow(),debug=win.webContents.debugger;
  if(nativeProcess.type!=='renderer'||win.webContents.getOSProcessId()!==nativeProcess.pid)throw Error('Selected native renderer required');
  if(debug.isAttached())throw Error('Another debugger owns the selected test renderer');
  let owned=false;
  /** Bound one diagnostic command without changing native CLI or production scheduler deadlines. */
  async function command(method,parameters){
    let timer;
    try{
      const result=parameters===undefined?debug.sendCommand(method):debug.sendCommand(method,parameters);
      return await Promise.race([result,new Promise(/** Own this command's independent failure timer. */ (_,reject)=>{
        timer=window.setTimeout(/** Stop this observation if native delivery is unavailable. */ ()=>reject(Error('Retained-memory diagnostic command unavailable')),20000);
      })]);
    }finally{if(timer!==undefined)window.clearTimeout(timer);}
  }
  /** Finish prior async frames/WeakRef jobs before collecting; never run inside measured startup. */
  const task=()=>new Promise(/** Yield only this test observation. */ done=>window.setTimeout(done,50));
  /** Native responses are allowlisted; arbitrary payloads and host objects cannot reach the report. */
  function numbers(value,keys){
    return Object.fromEntries(keys.map(/** Unknown native fields remain unknown instead of fabricated zero. */ key=>[key,typeof value[key]==='number'&&Number.isFinite(value[key])?value[key]:null]));
  }
  const startedAt=Date.now(),before=nativeProcess.cpuUsage();
  try{
    debug.attach('1.3');owned=true;
    const realm=await command('Runtime.evaluate',{expression:'window.app?.vault?.getName()',returnByValue:true});
    if(realm.exceptionDetails||realm.result?.value!==expectedVault)throw Error('Debugger realm does not match the selected disposable vault');
    await task();await command('HeapProfiler.collectGarbage');await task();await command('HeapProfiler.collectGarbage');await task();
    const heap=await command('Runtime.getHeapUsage'),memory=await nativeProcess.getProcessMemoryInfo(),after=nativeProcess.cpuUsage();
    if(!Number.isFinite(heap.usedSize))throw Error('Native retained heap measurement unavailable');
    return {startedAt,completedAt:Date.now(),pid:nativeProcess.pid,collections:2,
      method:'Selected renderer live heap after two forced collections; outside startup/quiet timing; not plugin-exclusive retained overhead',
      heapBytes:numbers(heap,['usedSize','totalSize','embedderHeapUsedSize','backingStorageSize']),
      processMemoryKb:numbers(memory,['private','shared','residentSet']),
      cpuMicroseconds:{user:after.user-before.user,system:after.system-before.system}};
  }finally{if(owned&&debug.isAttached())debug.detach();}
}
