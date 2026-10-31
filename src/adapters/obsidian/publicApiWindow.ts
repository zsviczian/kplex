/** Publish the trusted public API in Obsidian's main and popout windows. One plugin-owned
 * service is shared across windows; this adapter owns only aliases and workspace listeners.
 * Cleanup removes only aliases still owned by this registration and releases window references. */
import type {EventRef, Workspace} from 'obsidian';
import type {KplexPublicApi} from '../../publicApi/createPublicApi';

declare global {
  interface Window {
    /** Trusted local automation entry point; reacquire after plugin reload. */
    readonly kplexApi?:KplexPublicApi;
  }
}

/** Install aliases for existing windows and future popouts without acquiring graph/source work.
 * The caller disposes this registration before retiring its API service. */
export function publishPublicApiWindows(workspace:Workspace,api:KplexPublicApi,registerEvent:(event:EventRef)=>void):()=>void {
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
    publish(workspace.rootSplit.win);
    workspace.iterateAllLeaves(/** Include popouts already open when this plugin is enabled. */ leaf=>publish(leaf.getContainer().win));
    return dispose;
  }catch(error){dispose();throw error;}
}
