/** Native document-use list reusing manager search/disclosure and Footprints' clipboard session.
 * The caller owns index lookup/navigation; this shell never acquires sources or changes a draft.
 * Dismissal retires reads and clipboard feedback without cancelling an accepted native write. */
import {FormSetting as Setting, KplexModal as Modal} from "../adapters/obsidian/KplexModal";

import {Notice} from 'obsidian';
import type KplexPlugin from '../main';
import type {OntologyUsageDocument,OntologyUsageResult} from '../adapters/obsidian/ontologyUsage';
import {ClipboardSession} from '../application/ClipboardSession';
import {StyleManagerList} from './StyleManagerList';
import {nodeMarkdownLink} from './nodeMarkdownLink';

export class OntologyUsageModal extends Modal {
  private opened=false;
  private revision=0;
  private manager:StyleManagerList|null=null;
  private documents:readonly OntologyUsageDocument[]=[];
  private query='';
  private loading=false;
  private partial=false;
  private copyButton:HTMLButtonElement|null=null;
  private refreshButton:HTMLButtonElement|null=null;
  private clipboard:ClipboardSession|null=null;
  private releaseWindow:(()=>void)|null=null;

  /** Capture the selected physical field; paired vocabulary never broadens this lookup. */
  constructor(private readonly plugin:KplexPlugin,private readonly field:string,private readonly closed?:()=>void,private readonly checked?:(result:OntologyUsageResult)=>void){super(plugin.app);}

  /** Mount shared native list mechanics and start one explicitly requested cached lookup. */
  onOpen():void {
    this.opened=true;const t=this.plugin.translator;
    this.setTitle(t('ontology.usage.title',{field:this.field}));
    this.modalEl.addClass('kplex-style-manager-modal','kplex-ontology-manager');
    this.contentEl.createEl('p',{text:t('ontology.usage.help'),cls:'setting-item-description'});
    this.manager=new StyleManagerList(this.contentEl,t,{placeholder:t('ontology.usage.search'),aria:t('ontology.usage.search')},/** Filtering only visits the already loaded names/paths. */ query=>{this.query=query;this.renderList();});
    this.copyButton=this.manager.action(t('footprints.copyMarkdown'),'copy',()=>this.copy());
    this.refreshButton=this.manager.action(t('settings.refresh'),'refresh-cw',()=>{void this.load();});
    const owner=this.contentEl.ownerDocument.defaultView,close=():void=>this.close();
    owner?.addEventListener('pagehide',close,{once:true});this.releaseWindow=()=>owner?.removeEventListener('pagehide',close);
    void this.load();
  }

  /** Refresh only this list; neither missing cache entries nor incomplete indexing trigger repair. */
  private async load():Promise<void> {
    const revision=++this.revision,current=():boolean=>this.opened&&this.revision===revision;
    this.loading=true;this.documents=[];this.partial=false;this.renderList();
    try{const result=await this.plugin.index.ontologyUsage(this.field,current);if(current()){this.documents=result.documents;this.partial=result.partial;this.checked?.(result);}}
    catch{if(current())this.partial=true;}
    finally{if(current()){this.loading=false;this.manager?.reset();this.renderList();}}
  }

  /** Keyword tokens match document title/path; no query touches the repository. */
  private matches():OntologyUsageDocument[]{
    const words=this.query.toLocaleLowerCase().split(/\s+/).filter(Boolean);
    return this.documents.filter(/** Every word may match any part of the physical path. */ document=>words.every(/** Paths include folder context and the original filename. */ word=>document.path.toLocaleLowerCase().includes(word)));
  }

  /** Bound rendered rows and keep the two native navigation actions independent and accessible. */
  private renderList():void {
    if(!this.opened||!this.manager)return;
    const t=this.plugin.translator,matches=this.matches(),windowed=this.manager.window(matches);
    this.manager.status.setText(this.loading?t('ontology.usage.loading'):t('ontology.usage.count',{count:matches.length,total:this.documents.length})+(this.partial?' '+t('ontology.usage.partial'):''));
    if(this.copyButton)this.copyButton.disabled=this.loading||!matches.length||this.clipboard?.state==='copying';
    if(this.refreshButton)this.refreshButton.disabled=this.loading;
    this.manager.list.empty();
    if(!this.loading&&!matches.length)this.manager.list.createDiv({cls:'kplex-style-manager-empty',text:t('ontology.usage.empty')});
    for(const document of windowed.visible)new Setting(this.manager.list).setName(document.name).setDesc(document.path)
      .addExtraButton(/** K-Plex activation uses its existing scoped navigation owner. */ button=>button.setIcon('brain-circuit').setTooltip(t('ontology.usage.openPlex',{name:document.name})).onClick(()=>{void this.openDocument(document.path,true);} ))
      .addExtraButton(/** A separate action always opens a new native document tab. */ button=>button.setIcon('file-plus').setTooltip(t('ontology.usage.openTab',{name:document.name})).onClick(()=>{void this.openDocument(document.path,false);} ));
    this.manager.more(windowed,()=>this.renderList());
  }

  /** Recheck native identity through the existing host action; keep local editor drafts intact. */
  private async openDocument(path:string,plex:boolean):Promise<void> {
    try{await this.plugin.openOntologyUsageDocument(path,plex);}
    catch{if(this.opened)new Notice(this.plugin.translator('ontology.usage.openFailed'));}
  }

  /** Copy every filtered result (including undisclosed rows) before yielding native user activation. */
  private copy():void {
    if(this.loading||this.clipboard?.state==='copying'||!this.copyButton)return;
    const owner=this.copyButton.ownerDocument.defaultView;
    this.clipboard?.dispose();this.clipboard=new ClipboardSession(this.matches().map(/** Reuse Footprints' exact native-path Markdown projection. */ document=>`- ${nodeMarkdownLink({identity:document.path,kind:'file',path:document.path})}`).join('\n'),owner?.navigator.clipboard?.writeText?text=>owner.navigator.clipboard.writeText(text):null);
    this.clipboard.listen(/** A retired modal never receives late success/failure feedback. */ state=>{if(!this.opened)return;this.renderList();if(state==='copied'||state==='failed')new Notice(this.plugin.translator(state==='copied'?'footprints.copied':'footprints.copyFailed'));});
    this.clipboard.copy();
  }

  /** Cancel only uncompleted list presentation and release all native-owner callbacks. */
  onClose():void {this.opened=false;this.revision++;this.clipboard?.dispose();this.clipboard=null;this.releaseWindow?.();this.releaseWindow=null;this.manager=null;this.documents=[];this.contentEl.empty();this.closed?.();}
}
