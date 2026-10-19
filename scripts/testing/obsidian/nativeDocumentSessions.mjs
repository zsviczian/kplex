/**
 * Shared test-only native document-session maintenance. Serialized probes receive this factory
 * through a lexical eval wrapper, never a production global. Native view state/ownership remains
 * authoritative; fixture cleanup recreates a changed view through public native APIs if required.
 */
export function nativeDocumentSessions(plugin) {
  const workspace=plugin.app.workspace;
  /** Read the actual registered Plex shells; no semantic/index or source access is involved. */
  const hosts=()=>[...workspace.getLeavesOfType("k-plex-react-view"),...workspace.getLeavesOfType("k-plex-sidepanel-view")];
  return {
    /** Fixture isolation explicitly disables each current owner and defaults for subsequently created views. */
    async off(){for(const host of hosts())await plugin.setDocumentSyncMode(host,"off");Object.assign(plugin.settings,{documentSyncMode:"off",sidecarOpen:false,followActiveFile:false,autoOpenCentralDocument:false});},
    /** Capture only native scalar serialization; Footprints and pending native work are intentionally absent. */
    capture(){return hosts().map(host=>({id:host.view.documentSession.ownerId,type:host.view.getViewType(),state:host.view.getState()}));},
    /** Restore changed test-owned state through a new native incarnation, never direct map/field mutation. */
    async restore(states){for(const saved of states){const host=saved.id?workspace.getLeafById(saved.id):null;if(!host||host.view.getViewType()!==saved.type)continue;
      if(JSON.stringify(host.view.getState())===JSON.stringify(saved.state))continue;
      await host.setViewState({type:"empty",active:false});await host.setViewState({type:saved.type,state:saved.state,active:false});
      await host.view.waitUntilReady();if(typeof plugin.restorePersistedSidecar==="function")await plugin.restorePersistedSidecar(host);
    }},
  };
}

/** Make the real helper lexical to a serialized probe/expression without retaining a renderer global. */
export function withNativeDocumentSessions(code) {
  return `((documentSessions)=>(${code.trim().replace(/;$/,"")}))((${nativeDocumentSessions.toString()}))`;
}
