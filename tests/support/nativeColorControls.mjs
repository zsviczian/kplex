/** Finite native-control boundary for real Chromium editor tests; installed types/native lanes remain authoritative. */
export const nativeColorControls = `
export const setIcon=()=>{}; export const setTooltip=()=>{}; export class SearchComponent{} export class ButtonComponent{}
export const Platform={}; export const getIconIds=()=>[]; export class App{} export class Scope{} export class ExtraButtonComponent{}
export class AbstractInputSuggest {constructor(app,input){this.app=app;this.input=input} close(){}}
export class PluginSettingTab {update(){} constructor(app,plugin){this.app=app;this.plugin=plugin;this.containerEl=createDiv();document.body.append(this.containerEl)} hide(){}}
export const getLanguage=()=>"en";
export const getIcon=()=>null;
export class Notice {constructor(message){window.notices.push(message)}}
export class Modal {
 static instances=[];
 constructor(app){Modal.instances.push(this);this.app=app;this.modalEl=createDiv();this.containerEl=this.modalEl;this.titleEl=this.modalEl.createDiv();this.contentEl=this.modalEl.createDiv();}
 open(){document.body.append(this.modalEl);this.onOpen?.();}
 close(){this.onClose?.();this.modalEl.remove();}
}
export class SuggestModal extends Modal {setPlaceholder(value){this.placeholder=value;return this} selectSuggestion(item,event){this.close();this.onChooseSuggestion(item,event)}}
export class ColorComponent {
 constructor(container){this.input=container.createEl("input",{attr:{type:"color"}});this.input.addEventListener("input",()=>this.changed?.(this.input.value));}
 setValue(value){this.input.value=value;return this} onChange(changed){this.changed=changed;return this}
 setDisabled(disabled){this.input.disabled=disabled;return this}
}
export class Setting {
 constructor(container){this.components=[];this.el=this.settingEl=container.createDiv();this.nameEl=this.el.createDiv();this.descEl=this.el.createDiv();this.controlEl=this.el.createDiv();}
 clear(){this.controlEl.empty();this.components=[];return this}
 setName(value){this.nameEl.textContent=value;return this} setDesc(value){this.descEl.textContent=value;return this}
 addToggle(create){const input=this.controlEl.createEl("input",{attr:{type:"checkbox"}});const api={toggleEl:input,setValue(value){input.checked=value;return api},setDisabled(value){input.disabled=value;return api},onChange(run){input.addEventListener("change",()=>run(input.checked));return api}};this.components.push(api);create(api);return this}
 addSlider(create){const input=this.controlEl.createEl("input",{attr:{type:"range"}});const api={sliderEl:input,setLimits(min,max,step){input.min=min;input.max=max;input.step=step;return api},setValue(value){input.value=value;return api},setDisabled(value){input.disabled=value;return api},setDynamicTooltip(){return api},onChange(run){input.addEventListener("input",()=>run(Number(input.value)));return api}};this.components.push(api);create(api);return this}
 addDropdown(create){const input=this.controlEl.createEl("select");const api={selectEl:input,addOptions(options){for(const [value,text] of Object.entries(options))input.createEl("option",{value,text});return api},setValue(value){input.value=value;return api},setDisabled(value){input.disabled=value;return api},onChange(run){input.addEventListener("change",()=>run(input.value));return api}};this.components.push(api);create(api);return this}
 addText(create){const input=this.controlEl.createEl("input",{attr:{type:"text"}});const api={inputEl:input,setDisabled(value){input.disabled=value;return api},setValue(value){input.value=value;return api},onChange(run){input.addEventListener("input",()=>run(input.value));return api}};this.components.push(api);create(api);return this}
 addExtraButton(create){const input=this.controlEl.createEl("button",{cls:"clickable-icon",attr:{type:"button"}});const api={extraSettingsEl:input,setIcon(value){input.dataset.icon=value;return api},setTooltip(value){input.setAttribute("aria-label",value);return api},setDisabled(value){input.disabled=value;return api},onClick(run){input.addEventListener("click",run);return api}};this.components.push(api);create(api);return this}
 addButton(create){const input=this.controlEl.createEl("button",{attr:{type:"button"}});const api={buttonEl:input,setButtonText(value){input.textContent=value;return api},setCta(){return api},setDestructive(){return api},setDisabled(value){input.disabled=value;return api},onClick(run){input.addEventListener("click",run);return api}};this.components.push(api);create(api);return this}
}
`;

/** Only host helper spellings are doubled; native DOM, CSS, iframe isolation and input events are real. */
export const initializeColorDom = `(()=>{
 function decorate(element,options={}){if(options.cls)element.setAttribute("class",options.cls);if(options.text)element.textContent=options.text;if(options.value!==undefined)element.value=options.value;for(const [key,value] of Object.entries(options.attr||{}))element.setAttribute(key,value);return element;}
 function create(tag,options){return decorate(document.createElement(tag),options)}
 window.createEl=create;window.createDiv=options=>create('div',options);window.createSpan=options=>create('span',options);window.createFragment=()=>document.createDocumentFragment();
 Object.defineProperty(Document.prototype,'win',{configurable:true,get(){return this.defaultView}});
 for(const proto of [HTMLElement.prototype,SVGElement.prototype,DocumentFragment.prototype]){
  proto.createEl=function(tag,options){const child=decorate(this.ownerDocument.createElement(tag),options);this.append(child);return child};
  proto.createDiv=function(options){return this.createEl('div',options)};proto.createSpan=function(options){return this.createEl('span',options)};
  proto.createSvg=function(tag,options){const child=decorate(this.ownerDocument.createElementNS('http://www.w3.org/2000/svg',tag),options);this.append(child);return child};
  proto.setText=function(value){this.textContent=value};proto.empty=function(){this.replaceChildren()};proto.addClass=function(...names){this.classList.add(...names)};
  proto.setCssStyles=function(styles){Object.assign(this.style,styles)};proto.setCssProps=function(styles){for(const [key,value] of Object.entries(styles))this.style.setProperty(key,value)};
  proto.toggle=function(shown){this.style.display=shown?'':'none'};
 }
 const migrations=new WeakMap();window.migrationListeners=0;
 HTMLElement.prototype.onWindowMigrated=function(callback){let set=migrations.get(this);if(!set){set=new Set();migrations.set(this,set)}set.add(callback);window.migrationListeners++;let live=true;return()=>{if(live){live=false;set.delete(callback);window.migrationListeners--}}};
 window.emitMigration=element=>{for(const callback of [...(migrations.get(element)||[])])callback(element.ownerDocument.defaultView)};
 window.notices=[];window.input=(element,value,type='input')=>{element.value=value;element.dispatchEvent(new Event(type,{bubbles:true}))};
 window.chooseThemeColor=(modal,value)=>{modal.contentEl.querySelector('.kplex-theme-color-choice').click();const chooser=sourceModules.TestModal.instances.at(-1);const choice=chooser.getSuggestions(value??'').find(item=>item.value===value);if(!choice)throw Error('Missing native color choice '+value);chooser.selectSuggestion(choice,new MouseEvent('click'));return chooser};
 window.waitFor=async check=>{for(let i=0;i<200;i++){if(check())return;await new Promise(r=>setTimeout(r,10))}throw Error('Timed out waiting for editor');};
 document.body.className='theme-dark';
 const sheet=new CSSStyleSheet();sheet.replaceSync('body{--text-normal:#eeeeee;--text-muted:#999999;--background-primary:#181818;--background-secondary:#282828;--background-modifier-border:#666666;--color-purple:#aa55ee;--color-green:#33aa66;--color-cyan:#22bbcc;--color-orange:#dd8833;--graph-line:#777777;--interactive-accent:#8888ff}body.theme-light{--background-primary:#ffffff;--background-secondary:#eeeeee;--text-normal:#222222;--text-muted:#555555}');document.adoptedStyleSheets=[sheet];
 window.scope=createDiv();scope.className='kplex-app';document.body.append(scope);window.preferences=sourceModules.defaultColorPreferences();
 return true;
})()`;
