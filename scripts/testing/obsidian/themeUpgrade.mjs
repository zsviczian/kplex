/** Native Settings acceptance for marker-owned native-base adoption; no notes or release metadata change. */
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {runControlledProbe} from './controlledProbe.mjs';

/** Exercise the production queue and native declarative Settings, preserving the selected fixture configuration. */
async function scenario(app,c) {
  const p=app.plugins.plugins['k-plex'];
  if(!p||app.setting.isOpen)throw Error('Clean native Settings owner required');
  const settings=structuredClone(p.settings),policy=p.savedSettingsPolicy,external=p.externalSettingsReceived;
  const native=require('@electron/remote').getCurrentWindow(),bounds=native.getBounds(),maximized=native.isMaximized();
  const wait=ms=>new Promise(resolve=>window.setTimeout(resolve,ms));
  const check=(value,message)=>{if(!value)throw Error(message)};
  /** Native page replacement and queue publication are independently asynchronous. */
  const until=async(predicate,message)=>{const end=Date.now()+15000;while(!predicate()){check(!c.closed&&Date.now()<end,message);await wait(30)}};
  let originalSave,originalMount;
  try {
    await until(()=>!p.isStartupInitializing(),'Startup did not settle');
    const remote=require('@electron/remote');remote.app.show?.();remote.app.focus({steal:true});native.restore();native.show();native.focus();
    check(p.settings.appearanceThemes&&!p.settings.appearanceThemesFuture,'Supported native library required');
    // This probe simulates startup on the installed instance after other probes restored raw data.
    // Preserve the external-adoption fence; an actual startup never reopens it after remote adoption.
    p.externalSettingsReceived=false;
    p.settings.appearanceThemes=structuredClone(p.settings.appearanceThemes);
    delete p.settings.appearanceThemes.nativeBaseMigration;
    const previous=structuredClone(p.settings.appearanceThemes),previousId=previous.selectedId;
    const semantics=JSON.stringify([p.settings.tagNodeStyles,p.settings.tagStyleList,p.settings.hierarchyLinkStyles,p.settings.colorPreferences,p.settings.graphLenses]);
    let writes=0;originalSave=p.saveData;
    p.saveData=function(...args){writes++;return originalSave.apply(this,args)};
    await p.updateStyleSettings(()=>{},p.captureAppearanceOwner(),{initializeThemes:{existing:true,adoptNativeBase:true,notifyMigration:true}});
    c.progress={phase:'upgrade',writes,marker:p.settings.appearanceThemes.nativeBaseMigration,external:p.externalSettingsReceived};
    check(writes===1&&p.settings.appearanceThemes.nativeBaseMigration===1,'Upgrade did not use one durable operation');
    check(p.settings.standardStyleDefaults==='native'&&p.settings.appearanceThemes.selectedId!=='default','Native base not selected');
    check(JSON.stringify(p.settings.appearanceThemes.themes.slice(0,previous.themes.length))===JSON.stringify(previous.themes),'Prior theme was overwritten');
    check(JSON.stringify([p.settings.tagNodeStyles,p.settings.tagStyleList,p.settings.hierarchyLinkStyles,p.settings.colorPreferences,p.settings.graphLenses])===semantics,'Semantic appearance changed');
    const notification=document.querySelector('.kplex-notification-modal');
    check(notification?.getClientRects().length&&notification.textContent.includes(p.translator('themes.nativeBaseAdopted'))&&notification.querySelector('.modal-title')?.textContent===p.translator('themes.nativeBaseTitle'),'Committed upgrade notification modal missing');
    check(![...document.querySelectorAll('.notice')].some(el=>el.textContent.includes(p.translator('themes.nativeBaseAdopted'))),'Competing brief upgrade popup displayed');
    await p.updateStyleSettings(()=>{},p.captureAppearanceOwner(),{initializeThemes:{existing:true,adoptNativeBase:true,notifyMigration:true}});
    check(document.querySelectorAll('.kplex-notification-modal').length===1,'Duplicate live upgrade modal');
    const done=[...notification.querySelectorAll('button')].find(button=>button.textContent===p.translator('common.done'));
    check(done,'Native notification acknowledgment missing');done.click();
    await until(()=>!p.settings.appearanceThemes.migrationNotice,'Modal acknowledgment did not persist');
    check(!notification.isConnected&&!p.appearanceMigrationDialog,'Notification owner retained after acknowledgment');
    const tab=p.settingsTab;originalMount=tab.mountThemeControls;
    tab.mountThemeControls=function(setting){c.themeRow=setting;return originalMount.call(this,setting)};
    p.openSettings();await until(()=>p.settingsTab.containerEl.isConnected,'Native Settings missing');
    check(p.settingsTab.openSettingsPage(p.translator('settings.ui.visual.styling')),'Visual styling page missing');
    const row=()=>c.themeRow?.settingEl.isConnected ? c.themeRow.settingEl : null;
    await until(()=>row()?.querySelector('select'),'Native theme selection missing');
    const select=row().querySelector('select');check(select.value===p.settings.appearanceThemes.selectedId,'Native selector displays old theme');
    check(![...row().ownerDocument.querySelectorAll('[aria-label="'+p.translator('themes.dismissMigration')+'"]')].some(button=>button.getClientRects().length),'Acknowledged migration row remains visible');
    select.value=previousId;select.dispatchEvent(new Event('change',{bubbles:true}));
    await until(()=>p.settings.appearanceThemes.selectedId===previousId,'Native theme selection did not persist');
    app.setting.close();await p.settingsWriteQueue;const before=writes;
    await p.updateStyleSettings(()=>{},p.captureAppearanceOwner(),{initializeThemes:{existing:true,adoptNativeBase:true,notifyMigration:true}});
    check(writes===before&&p.settings.appearanceThemes.selectedId===previousId,'Later version reset the user selection');
    check(!document.querySelector('.kplex-notification-modal'),'Acknowledged modal reappeared on later startup');
    // A first installation is represented by its actual absence of prior K-Plex data, not version absence.
    await p.updateAppearanceThemes({kind:'select',id:'default'});
    p.settings.appearanceThemes={version:1,migrationComplete:true,selectedId:'default',themes:p.settings.appearanceThemes.themes.filter(theme=>theme.id==='default'),migrationNotice:false};
    await p.updateStyleSettings(()=>{},p.captureAppearanceOwner(),{initializeThemes:{existing:false,adoptNativeBase:true,notifyMigration:false}});
    check(p.settings.appearanceThemes.themes.length===1&&!p.settings.appearanceThemes.migrationNotice,'Fresh install acquired an upgrade theme/message');
    check(!document.querySelector('.kplex-notification-modal'),'Fresh install displayed an upgrade modal');
    p.openSettings();await until(()=>p.settingsTab.containerEl.isConnected,'Fresh Settings missing');p.settingsTab.openSettingsPage(p.translator('settings.ui.visual.styling'));
    await until(()=>row()?.querySelector('select'),'Fresh theme row missing');
    check(![...row().ownerDocument.querySelectorAll('.setting-item')].some(el=>el.getClientRects().length&&el.querySelector('.setting-item-name')?.textContent===p.translator('themes.nativeBaseAdopted')),'Fresh Settings displayed migration row');
    return {cases:['atomic existing-user adoption','native notification content and single-modal ownership','durable modal acknowledgment','native Visual styling selection','later startup preserves manual selection without notification','fresh Default-only installation without modal or Settings message'],version:p.manifest.version,writes};
  } finally {
    if(p.appearanceMigrationDialog)p.appearanceMigrationDialog.close();
    if(app.setting.isOpen)app.setting.close();await p.settingsWriteQueue;
    if(originalSave)p.saveData=originalSave;
    if(originalMount)p.settingsTab.mountThemeControls=originalMount;
    p.settings=settings;p.savedSettingsPolicy=policy;p.externalSettingsReceived=external;
    await wait(300);await app.vault.adapter.write(p.manifest.dir+'/data.json',c.originalData);
    native.setBounds(bounds);if(maximized)native.maximize();
  }
}

if(process.env.KPLEX_TEST_VAULT_NAME!=='kplex-test-small')throw Error('Theme upgrade requires the explicit Small fixture');
const data=readFileSync(join(process.env.KPLEX_TEST_CONFIG_DIR,'plugins/k-plex/data.json'),'utf8');
await runControlledProbe('theme-upgrade-020',scenario,'c.originalData='+JSON.stringify(data)+';',['src/main.ts','src/settings.ts','src/core/plex/appearanceThemes.ts','src/ui/NotificationModal.ts']);
