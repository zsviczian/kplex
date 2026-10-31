/** Obsidian composition of the versioned trusted API. Existing plugin/index/settings/session
 * owners supply narrow capabilities; this factory starts no indexing, reads no source and opens
 * no transport. Disposal releases every host closure before the plugin tears down its index. */
import type KplexPlugin from '../main';
import {PublicApi} from '../application/PublicApi';
import {PublicCanvasRegistry} from '../application/PublicCanvasRegistry';
import {PublicApiConfiguration} from '../application/PublicApiConfiguration';
import {PublicApiError, PUBLIC_API_LIMITS, type PublicApiRevision} from '../application/publicApiContracts';
import {createPublicApiGraphql} from '../adapters/obsidian/publicApiGraphql';
import {createPublicGraphRead} from '../adapters/obsidian/publicApiGraph';
import {ontologyConfiguration, ONTOLOGY_GROUPS} from '../core/contracts/ontologyConfiguration';
import {ontologyReadModel} from '../core/contracts/ontologyReadModel';
import {exportLensPackage} from '../core/plex/sharing/transfer';
import {LENS_AUTHORING_CONTEXT} from '../core/plex/sharing/authoring';
import {isFacetPreset} from '../core/plex/views/facets/validation';
import {viewConfigurationUpdateDomain} from '../core/plex/views/configuration';
import {facetPortablePackage} from '../ui/plexViews/facets/facetSharing';

export type KplexPublicApi=Readonly<{version:1;versions:readonly number[];v1:PublicApi}>;
export type PublicApiOwner=Readonly<{api:KplexPublicApi;canvases:PublicCanvasRegistry;revisions:()=>PublicApiRevision;dispose:()=>void}>;
type StatusFacts=Readonly<{phase:string;upToDate:boolean;indexedFiles:number;totalFiles:number|null}>;

/** Use immutable committed owner identities as an opaque observation token, not a second settings
 * snapshot or a count of every intermediate edit. Unrelated note reads never inspect these roots. */
function configurationRevision(plugin:KplexPlugin):()=>number {
  let previous:readonly unknown[]=[],revision=0;
  return /** Settings writers replace these owned roots; incoming receipts replace their containing settings. */ ()=>{
    const settings=plugin.settings,roots:readonly unknown[]=[settings,settings.hierarchy,...ONTOLOGY_GROUPS.map(
      /** Fixed-size role metadata captures compatibility writers that replace a list in its existing root. */ group=>settings.hierarchy[group]),
      settings.ontologyDescriptions,settings.graphLenses,settings.canvasViewSettings,settings.colorPreferences,settings.colorPreferences.palette];
    if(roots.length!==previous.length||roots.some(/** Constant-size reference comparison performs no dictionary traversal. */ (value,index)=>value!==previous[index])){previous=roots;revision++;}
    return revision;
  };
}

/** Install one API lifetime after settings load, independently of graph admission/hydration. */
export function createPublicApi(plugin:KplexPlugin,current:()=>boolean,status:()=>StatusFacts):PublicApiOwner {
  const lifetime=typeof window.crypto?.randomUUID==='function'?window.crypto.randomUUID():`${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  const canvases=new PublicCanvasRegistry(lifetime),revision=configurationRevision(plugin),transport=createPublicApiGraphql();
  let active=true;
  /** Pending native writes retain the existing queue's acceptance boundary, never an API-owned writer. */
  const alive=()=>active&&current();
  /** Revisions are existing scalar/immutable-owner observations, independent of graph readiness. */
  const revisions=():PublicApiRevision=>({semantic:plugin.index.getSemanticRevision(),source:plugin.getIndexSourceRevision(),configuration:revision()});
  const configuration=new PublicApiConfiguration({sessionId:lifetime,current:alive,now:()=>Date.now(),revision,
    read:/** The canonical sharing owner returns only its finite configuration domains. */ ()=>plugin.readPortableSharingState(),
    preview:/** Capacity/palette/future-schema validation is identical to the existing native importer. */ plan=>{plugin.previewPortableSharing(plan);},
    save:/** No data.json edit, automatic lens activation or new settings queue is introduced. */ (plan,guard)=>plugin.importPortableSharing(plan,guard),
    capture:/** Remote A-to-B-to-A and theme activation cannot revive a preview made by an older owner. */ plan=>{
      const appearance=plugin.captureAppearanceOwner(),guards:Array<()=>boolean>=[];
      if(plan.package.kind==='facets'){
        const definition=plugin.viewSettingsRegistry.definition('wuxing');
        if(!definition)throw new PublicApiError('UNAVAILABLE','Facets configuration is unavailable.');
        guards.push(plugin.receivedSettingsOwner(viewConfigurationUpdateDomain(definition,{field:'presets',path:[plan.choices.targetId]})));
      }
      if(plan.package.kind==='lens'||plan.choices.lensIds.length)guards.push(plugin.receivedSettingsOwner('graphLenses'));
      if(plan.package.palette?.length)guards.push(plugin.receivedSettingsOwner('colorPreferences'));
      return /** The original appearance/remote owners are rechecked inside the established disk queue. */ ()=>alive()&&plugin.isAppearanceOwnerCurrent(appearance)&&guards.every(guard=>guard());
    },
    export:/** Native and public exports share literal labels/Help, privacy refusal and dependency selection. */ request=>{
      const state=plugin.readPortableSharingState();
      if(request.kind==='lens'){
        const lens=state.lenses.find(/** Export exactly one installed definition. */ item=>item.id===request.id);
        if(!lens)throw new PublicApiError('NOT_FOUND','The lens is unavailable.');
        return exportLensPackage(lens,state.palette,LENS_AUTHORING_CONTEXT,request.allowPrivate===true);
      }
      const preset=Object.prototype.hasOwnProperty.call(state.presets,request.id)?state.presets[request.id]:undefined;
      if(!isFacetPreset(preset))throw new PublicApiError('NOT_FOUND','The Facets preset is unavailable.');
      return facetPortablePackage(request.id,preset,{read:()=>state},plugin.translator,request.lensIds??[],request.allowPrivate===true);
    },
  });
  const service=new PublicApi({configuration,canvas:canvases.port(),graph:createPublicGraphRead(plugin.index),now:()=>window.performance.now(),
    revisions,
    status:/** Reuse the existing passive status path with its cached Markdown total. */ ()=>plugin.index.publicApiStatus(status()),
    ontology:/** Settings provide configured meanings before the graph starts; discovery is explicit and cache-only. */ options=>{
      if(ONTOLOGY_GROUPS.reduce(/** Reject an excessive configured vocabulary before projecting it. */ (count,group)=>count+plugin.settings.hierarchy[group].length,0)>PUBLIC_API_LIMITS.scan)
        throw new PublicApiError('LIMIT_EXCEEDED','Configured ontology exceeds the vocabulary read budget.');
      const discovery=options.includeDiscovered?plugin.index.publicApiDiscoveredFields(options.limit):{items:[],truncated:false};
      const fields=ontologyReadModel(ontologyConfiguration(plugin.settings),plugin.settings.ontologyDescriptions,discovery.items);
      return {fields:fields.slice(0,options.limit),truncated:discovery.truncated||fields.length>options.limit,
        discoveryComplete:options.includeDiscovered&&!discovery.truncated&&plugin.index.publicApiCoverage().complete};
    },
    graphql:transport.execute,
  });
  return {api:Object.freeze({version:1,versions:Object.freeze([1]),v1:service}),canvases,revisions,
    dispose:/** Reject old handles and release all native/index closures before any index teardown. */ ()=>{
      active=false;service.dispose();configuration.dispose();canvases.dispose();transport.dispose();
    }};
}
