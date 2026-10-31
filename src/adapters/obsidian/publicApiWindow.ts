/** Publish the trusted public API in Obsidian's main and popout windows. One plugin-owned
 * service is shared across windows; this adapter owns only aliases and workspace listeners.
 * Main-window publication does not depend on restored workspace containers. Leaf enumeration
 * waits for layout readiness; cleanup fences that queued callback and releases window references. */
import type {EventRef, Workspace} from 'obsidian';
import type {KplexPublicApi} from '../../publicApi/createPublicApi';

declare global {
  interface Window {
    /** Trusted local automation entry point; reacquire after plugin reload. */
    readonly kplexApi?:KplexPublicApi;
  }
}

/** Install aliases without acquiring graph/source work, including before Obsidian restores its layout.
 * The caller supplies the application window and disposes this registration before retiring its API.
 * Existing popouts are enumerated only after layout; newly opened windows use workspace events. */
export function publishPublicApiWindows(workspace:Workspace,api:KplexPublicApi,registerEvent:(event:EventRef)=>void,mainWindow:Window=window):()=>void {
  const windows=new Map<Window,PropertyDescriptor|undefined>();
  const events:EventRef[]=[];
  let disposed=false;
  /** Preserve an earlier property and publish the same immutable protocol root in each realm. */
  const publish=(viewWindow:Window)=>{
    if(disposed||windows.has(viewWindow))return;
    const previous=Object.getOwnPropertyDescriptor(viewWindow,'kplexApi');
    Object.defineProperty(viewWindow,'kplexApi',{value:api,configurable:true,writable:false});
    windows.set(viewWindow,previous);
  };
  /** Restore only our alias, leaving a later registration or deliberate replacement untouched. */
  const release=(viewWindow:Window)=>{
    if(!windows.has(viewWindow))return;
    const previous=windows.get(viewWindow);
    windows.delete(viewWindow);
    if(Object.getOwnPropertyDescriptor(viewWindow,'kplexApi')?.value!==api)return;
    if(previous)Object.defineProperty(viewWindow,'kplexApi',previous);
    else Reflect.deleteProperty(viewWindow,'kplexApi');
  };
  /** Idempotently detach listeners and release every retained window before plugin teardown. */
  const dispose=()=>{
    if(disposed)return;
    disposed=true;
    for(const event of events)workspace.offref(event);
    for(const viewWindow of windows.keys())release(viewWindow);
  };
  try{
    events.push(workspace.on('window-open',/** Publish before consumers use a newly opened popout. */ (_container,viewWindow)=>publish(viewWindow)));
    events.push(workspace.on('window-close',/** A closed popout must not be retained by the plugin. */ (_container,viewWindow)=>release(viewWindow)));
    for(const event of events)registerEvent(event);
    publish(mainWindow);
    workspace.onLayoutReady(/** Startup may have no root split; enumerate restored containers only when ready. */ ()=>{
      if(disposed)return;
      workspace.iterateAllLeaves(/** Include popouts already open when this plugin is enabled. */ leaf=>publish(leaf.getContainer().win));
    });
    return dispose;
  }catch(error){dispose();throw error;}
}
