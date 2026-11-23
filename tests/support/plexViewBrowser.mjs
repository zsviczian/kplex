/** Compile the actual shared canvas for browser consumers. Native host constructors remain finite explicit doubles; no production scene or property behavior is replaced. */
import {build} from 'esbuild';
import {nativeDomHelpers,nativeColorControls} from './nativeColorControls.mjs';
import {nativeMarkdownControls} from './nativeMarkdownControls.mjs';
/** Each test owns a real browser and its root lifetimes; this helper only bundles source with the same native boundary. */
export async function plexViewBrowserModules({captureNotices=false,nativeControls=false,graphIndex=false,platform={isMobile:false,isIosApp:false}}={}){
const nativeBoundary=nativeControls?nativeColorControls:nativeMarkdownControls;
const nativeNames=[...nativeBoundary.matchAll(/export (?:const|class) (\w+)/g)].map(match=>match[1]);
const nativeStub=`
  ${nativeDomHelpers}
  class NativeBase {constructor(){} register(){} registerEvent(){} addChild(){} removeChild(){}}
  exports.App=exports.Modal=exports.SuggestModal=exports.FuzzySuggestModal=exports.AbstractInputSuggest=exports.Component=exports.MarkdownRenderChild=
  exports.PluginSettingTab=exports.Setting=exports.ButtonComponent=exports.ColorComponent=exports.SearchComponent=exports.ExtraButtonComponent=
  exports.ItemView=exports.FileView=exports.TextFileView=exports.Scope=exports.WorkspaceLeaf=NativeBase;
  ${graphIndex ? `
    exports.TFile=class TFile {
      constructor(path){this.path=path;this.name=path.split('/').pop();this.extension=path.split('.').pop();this.basename=this.name.replace(/\\.[^.]+$/,'');this.stat={mtime:1,size:100,ctime:1};this.parent=null;}
    };
    exports.TFolder=class TFolder {constructor(){this.path='';this.name='';this.children=[];this.parent=null;}};
  ` : `exports.TFile=class TFile {};exports.TFolder=class TFolder {};`}
  exports.Platform=${JSON.stringify(platform)};exports.Keymap={isModEvent:e=>e.metaKey||e.ctrlKey};
  exports.getLanguage=()=> 'en';exports.getIcon=()=>null;exports.getIconIds=()=>[];exports.setIcon=()=>{};exports.setTooltip=()=>{};
  exports.normalizePath=p=>p;exports.getAllTags=()=>[];
  exports.Notice=class Notice {constructor(message,duration){${captureNotices ? '(window.testNotices ??= []).push({message,duration});' : "throw Error('Unexpected notice: '+message)"}}};
  exports.Menu=class Menu {items=[];addItem(prepare){const item={setTitle(value){item.title=value;return item},setIcon(value){item.icon=value;return item},setChecked(){return item},setDisabled(value){item.disabled=value;return item},setIsLabel(){return item},setSubmenu(){return item.submenu=new exports.Menu()},onClick(fn){item.click=fn;return item}};prepare(item);this.items.push(item);return this;}addSeparator(){return this;}};
  exports.MarkdownRenderer={render:async()=>{}};
  ${nativeBoundary.replaceAll('export ','')+';'+nativeNames.map(name=>'exports.'+name+'='+name+';').join('')}
`;
return await build({stdin:{resolveDir:process.cwd(),contents:`
  export {createElement,useSyncExternalStore} from 'react';export {createRoot} from 'react-dom/client';export {flushSync} from 'react-dom';
  export {PlexGraph} from './src/ui/PlexGraph';export {migrateAndMergeSettings} from './src/settings';export {createTranslator} from './src/lang';export {compileGraphLensDefinitions} from './src/lens/GraphLens';
  export {PlexViewRegistry} from './src/core/plex/views/registry';export {PlexViewSession} from './src/application/PlexViewSession';
  export {builtInPlexViews} from './src/ui/plexViews/builtins';export {probeViewDefinition} from './tests/support/plexViewProbe';
  export {ActionManager} from './src/application/ActionManager';export {actionNodeRef} from './src/adapters/obsidian/actionNode';
  export {editViewConfiguration, editViewConfigurationAt} from './src/core/plex/views/configuration';export {wuXingViewDefinition} from './src/core/plex/views/wuxing/definition';
  export {mindMapViewDefinition} from './src/core/plex/views/mindmap/definition';
  export {FACET_TEMPLATES} from './src/core/plex/views/facets/templates';
  export {sectionViewProbeDefinition} from './tests/support/sectionViewProbe';
  export {createPlexSectionViewContext} from './src/ui/plexViews/sections';
  export {buildCentralSectionExpansion,projectCentralSectionExpansion} from './src/index/SectionExpansion';
  export {plexViewRead,prepareViewScene} from './src/ui/plexViews/prepareScene';
  export {plexSectionReference,plexSectionAnchor,visiblePlexSection} from './src/core/plex/views/sections';
  export {builtInCanvasViewSettings} from './src/ui/plexViews/settingsContributions';
  export {CanvasViewContributionController} from './src/ui/plexViews/CanvasViewContributionController';
  export {CanvasViewChoices} from './src/ui/plexViews/CanvasViewChoices';
  export {PlexViewSelector} from './src/ui/plexViews/PlexViewSelector';
  export {NativeMarkdownHelp} from './src/ui/NativeMarkdownHelp';
  export {Component as TestMarkdownComponent} from 'obsidian';
  export {CanvasPropertyAssignmentActions} from './src/ui/CanvasPropertyAssignmentActions';
  export {writeRelationshipMetadata} from './src/adapters/obsidian/relationshipMetadataWrite';
  export {normalizeFieldName} from './src/core/contracts/fieldName';
  export {defaultColorPreferences} from './src/core/plex/colorPreferences';export {Modal as TestModal,TextFileView} from 'obsidian';
  export {compileGraphPredicate} from './src/core/plex/predicate';
  export {WanderController} from './src/application/WanderController';export {exampleViewDefinition} from './src/core/plex/views/example';
  ${graphIndex ? `
    export {GraphIndex} from './src/index/GraphIndex';
    export {TFile,TFolder} from 'obsidian';
  ` : ''}
`},write:false,bundle:true,platform:'browser',format:'iife',globalName:'sourceModules',plugins:[{name:'finite-native-host',setup(builder){
  builder.onResolve({filter:/^obsidian$/},()=>({path:'host',namespace:'finite'}));
  builder.onLoad({filter:/.*/,namespace:'finite'},()=>({contents:nativeStub}));
}}]});

}
