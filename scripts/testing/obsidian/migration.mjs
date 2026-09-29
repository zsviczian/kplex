/**
 * Exercises legacy settings import through the real K-Plex UI in an explicit disposable vault.
 * Uses canonical K-Plex selectors/commands and restores test-owned settings, notes and controllers.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Script } from "node:vm";
import { runObsidianVerification, validateTarget } from "./runner.mjs";
import { assertMigratedExcaliBrainSettings } from "../../../tests/support/excalibrainMigration.mjs";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const reportDir = process.env.KPLEX_HOST_REPORT_DIR || mkdtempSync(join(tmpdir(), "kplex-migration-host-"));
const target = {
  vaultName: process.env.KPLEX_TEST_VAULT_NAME,
  vaultPath: process.env.KPLEX_TEST_VAULT_PATH,
  configDir: process.env.KPLEX_TEST_CONFIG_DIR,
};
const fixtureText = readFileSync(join(projectRoot, "tests/fixtures/excalibrain-migration/data.json"), "utf8");
const fixture = JSON.parse(fixtureText);
const controller = "__kplexMigrationTest";
const sourcePath = "Kplex-Migration-Test-Source.md";
const targetPath = "Kplex-Migration-Test-Target.md";

function command(file, args, timeout = 30_000) {
  const result = spawnSync(file, args, { cwd: projectRoot, encoding: "utf8", timeout, killSignal: "SIGKILL", maxBuffer: 4 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${file} failed (${result.status}): ${(result.stderr || result.stdout).slice(0, 1000)}`);
  return result.stdout;
}
const cli = (vault, name, ...args) => {
  const executable = process.env.KPLEX_OBSIDIAN_CLI || "obsidian";
  // The start command can await initialization. Focus before invoking it, rather than after the
  // smoke runner has already waited on an occluded renderer's throttled hydration timer slices.
  if (name === "command" && args.includes("id=k-plex:kplex-start") && process.platform === "darwin") {
    const result = command(executable, [`vault=${vault}`, "eval", 'code=(()=>{const r=require("@electron/remote");r.app.focus({steal:true});const w=r.getCurrentWindow();w.show();w.focus();return JSON.stringify(true)})()']);
    if (/^Error:/m.test(result)) throw new Error(result);
  }
  return command(executable, [`vault=${vault}`, name, ...args]);
};
const evaluate = (code) => {
  new Script(code); // Parse the generated browser script before any native mutation.
  const output = cli(target.vaultName, "eval", `code=${code}`).trim().replace(/^=>\s*/, "");
  // CLI eval errors may have exit code zero; only structured successful output is accepted.
  if (/^Error:/m.test(output)) throw new Error(output);
  const payload = output.split("\n").findLast(line => line.startsWith("=> "))?.slice(3) ?? output;
  const value = JSON.parse(payload);
  if (value?.error) throw new Error(value.error);
  return value;
};
const wait = ms => new Promise(done => setTimeout(done, ms));
async function until(code, message, timeout = 120_000) {
  const deadline = Date.now() + timeout;
  do {
    const result = evaluate(code);
    if (result) return result;
    if (Date.now() >= deadline) throw new Error(message);
    await wait(500);
  } while (true);
}

let report;
let installedController = false;
try {
  validateTarget(target);
  report = await runObsidianVerification({
    ...target, projectRoot, reportDir, runCli: cli,
    source: { revision: command("git", ["rev-parse", "HEAD"]).trim(), dirty: Boolean(command("git", ["status", "--porcelain"]).trim()), node: process.version },
    runVerify: () => {
      const result = spawnSync("npm", ["run", "verify"], { cwd: projectRoot, stdio: "inherit", timeout: 180_000 });
      if (result.error) throw result.error;
      if (result.status !== 0) throw new Error(`npm run verify failed (${result.status})`);
    },
  });
  console.log("Built/staged plugin and native smoke passed");
  assert.equal(report.status, "passed", report.error);
  assert(cli(target.vaultName, "help").includes("eval"), "Obsidian CLI eval is unavailable");
  report.fixture = { path: "tests/fixtures/excalibrain-migration/data.json", sha256: createHash("sha256").update(fixtureText).digest("hex"), nodeStyles: 32, linkStyles: 297 };
  // Focus the selected renderer on macOS; an occluded Electron window throttles timer slices.
  // Do not change background-throttling policy or interpret this test as a performance benchmark.
  if (process.platform === "darwin") evaluate(`(()=>{
    const remote=require("@electron/remote");remote.app.focus({steal:true});
    const win=remote.getCurrentWindow();win.show();win.focus();return JSON.stringify(true);
  })()`);
  await until('JSON.stringify(app.plugins.plugins["k-plex"].getIndexStatus().upToDate)', "Initial indexing did not settle");
  evaluate(`(()=>{
    if (window.${controller}) throw new Error("Migration controller already exists");
    if (app.vault.getAbstractFileByPath(${JSON.stringify(sourcePath)}) || app.vault.getAbstractFileByPath(${JSON.stringify(targetPath)})) throw new Error("Migration test paths already exist");
    const plugin=app.plugins.plugins["k-plex"];
    window.${controller}={ settings:JSON.parse(JSON.stringify(plugin.settings)), owned:[], modal:null, done:false, error:null };
    return JSON.stringify(true);
  })()`);
  installedController = true;
  evaluate(`(()=>{
    app.setting.open(); app.setting.openTabById("k-plex");
    const tab=app.setting.pluginTabs.find(t=>t.id==="k-plex");
    const flatten=items=>items.flatMap(i=>[i,...flatten(i.items||[])]);
    const action=flatten(tab.getSettingDefinitions()).find(i=>i.name==="Import ExcaliBrain settings");
    if(!action) throw new Error("Import action missing from settings");
    action.action();
    const doc=app.setting.doc;
    const modal=doc.querySelector(".kplex-import-settings-modal");
    const input=modal.querySelector('input[type="file"]');
    const transfer=new doc.defaultView.DataTransfer();
    transfer.items.add(new doc.defaultView.File([${JSON.stringify(fixtureText)}],"data.json",{type:"application/json"}));
    input.files=transfer.files; input.dispatchEvent(new doc.defaultView.Event("change",{bubbles:true}));
    window.${controller}.modal=modal;
    return JSON.stringify(true);
  })()`);
  installedController = true;
  await until(`JSON.stringify(window.${controller}.modal.querySelector(".kplex-import-status").textContent==="data.json")`, "Fixture file was not read by the actual import dialog");
  evaluate(`(()=>{const modal=window.${controller}.modal; modal.querySelector("button.mod-cta").click(); return JSON.stringify(true)})()`);
  await until('JSON.stringify(!app.setting.doc.querySelector(".kplex-import-settings-modal"))', "Import did not save/close");
  const previousSettings = evaluate(`JSON.stringify(window.${controller}.settings)`);
  const imported = evaluate('JSON.stringify(app.plugins.plugins["k-plex"].settings)');
  assertMigratedExcaliBrainSettings(imported, fixture, previousSettings);
  const persisted = JSON.parse(readFileSync(join(target.configDir, "plugins/k-plex/data.json"), "utf8"));
  assertMigratedExcaliBrainSettings(persisted, fixture, previousSettings);
  console.log("Fixture import and persistence passed");
  report.scenarios.push({ id: "fixture-import-and-persistence", status: "passed", assertions: ["actual file input and import button", "complete ontology/settings/style dictionaries", "persisted data.json"] });

  // Navigate the real declarative subpages and click their actual manager actions. Inspect all
  // bounded batches and then open a legacy style editor, not merely the settings object.
  const managers = evaluate(`(()=>{
    const tab=app.setting.pluginTabs.find(t=>t.id==="k-plex");
    const flatten=items=>items.flatMap(i=>[i,...flatten(i.items||[])]);
    const definitions=flatten(tab.getSettingDefinitions());
    const nodePage=definitions.find(i=>i.name==="Node styling");
    if(!nodePage) throw new Error("Node styling page missing");
    const doc=app.setting.doc;
    const openSubpage=name=>{
      const row=Array.from(app.setting.getCurrentPageEl().querySelectorAll(".setting-item")).find(el=>el.querySelector(".setting-item-name")?.textContent===name);
      if(!row)throw new Error("Settings subpage missing: "+name);
      row.click();
    };
    openSubpage("Visual styling");openSubpage("Node styling");
    const nodeAction=Array.from(app.setting.getCurrentPageEl().querySelectorAll(".setting-item")).find(el=>el.querySelector(".setting-item-name")?.textContent==="Node styles");
    if(!nodeAction) throw new Error("Node styles action absent from rendered settings");
    nodeAction.click();
    let modal=doc.querySelector(".kplex-style-manager").closest(".modal");
    const content=modal.querySelector(".kplex-style-manager");
    let more; while((more=content.querySelector(".kplex-style-manager-more"))) more.click();
    if(!content.isConnected || !content.getBoundingClientRect().width || content.ownerDocument.defaultView.closed)throw new Error("Node manager is not visibly mounted");
    const names=Array.from(content.querySelectorAll(".kplex-style-manager-name")).map(el=>el.textContent);
    const row=Array.from(content.querySelectorAll(".kplex-style-manager-row")).find(el=>el.querySelector(".kplex-style-manager-name").textContent==="#person");
    if(!row) throw new Error("Imported #person style missing");
    const nodeSwatch=row.querySelector(".kplex-style-manager-node-swatch").style.getPropertyValue("--kplex-style-node-border");
    row.click();
    const editor=doc.querySelector(".kplex-style-editor");
    const inputs=Array.from(editor.querySelectorAll("input")).map(el=>({type:el.type,value:el.value}));
    const prefix=inputs.some(i=>i.value==="🧑 ");
    editor.closest(".modal").querySelector(".modal-close-button, .modal-header-button").click();
    modal.querySelector(".modal-close-button, .modal-header-button").click();
    app.setting.closePage();
    openSubpage("Link styling");
    const linkAction=Array.from(app.setting.getCurrentPageEl().querySelectorAll(".setting-item")).find(el=>el.querySelector(".setting-item-name")?.textContent==="Relationship-specific styles");
    if(!linkAction) throw new Error("Link styles action absent from rendered settings");
    linkAction.click();
    modal=doc.querySelector(".kplex-style-manager").closest(".modal");
    const links=modal.querySelector(".kplex-style-manager");
    if(!links.isConnected || !links.getBoundingClientRect().width || links.ownerDocument.defaultView.closed)throw new Error("Link manager is not visibly mounted");
    const select=links.querySelector('select[aria-label="Link style scope"]');
    while((more=links.querySelector(".kplex-style-manager-more"))) more.click();
    const customNames=Array.from(links.querySelectorAll(".kplex-style-manager-name")).map(el=>el.textContent);
    select.value="all";select.dispatchEvent(new doc.defaultView.Event("change",{bubbles:true}));
    while((more=links.querySelector(".kplex-style-manager-more"))) more.click();
    const linkNames=Array.from(links.querySelectorAll(".kplex-style-manager-name")).map(el=>el.textContent);
    const inspired=Array.from(links.querySelectorAll(".kplex-style-manager-row")).find(el=>el.querySelector(".kplex-style-manager-name").textContent==="Inspired by");
    const linkSwatch=inspired?.querySelector(".kplex-style-manager-line-swatch").style.getPropertyValue("--kplex-style-swatch");
    inspired.click();
    const linkEditor=Array.from(doc.querySelector(".kplex-style-editor").querySelectorAll("input")).map(el=>({type:el.type,value:el.value,checked:el.checked}));
    doc.querySelector(".kplex-style-editor").closest(".modal").querySelector(".modal-close-button, .modal-header-button").click();
    modal.querySelector(".modal-close-button, .modal-header-button").click();
    app.setting.close();
    return JSON.stringify({names,nodeSwatch,prefix,linkNames,customNames,linkSwatch,linkEditor});
  })()`);
  for (const key of Object.keys(fixture.tagNodeStyles)) assert(managers.names.includes(key), `Node manager missing ${key}`);
  assert.equal(managers.nodeSwatch, "#f7ce46"); assert.equal(managers.prefix, true);
  for (const key of Object.keys(fixture.hierarchyLinkStyles).filter(Boolean))
    assert(managers.linkNames.some(name => name.toLowerCase().replaceAll(" ", "-") === key.toLowerCase().replaceAll(" ", "-")), `Link manager missing ${key}`);
  assert(managers.customNames.includes("Inspired by"));
  assert.equal(managers.linkSwatch, "#fefb41");
  assert(managers.linkEditor.some(input => input.type === "color" && input.value === "#fefb41"));
  console.log("Node and link style managers passed");
  report.scenarios.push({ id: "rendered-settings-style-managers", status: "passed", ...managers });

  // Saving an unchanged imported style must not flatten alpha or add default overrides.
  evaluate(`(()=>{
    app.setting.open();app.setting.openTabById("k-plex");
    const tab=app.setting.pluginTabs.find(t=>t.id==="k-plex");tab.openNoteTypeStylesManager();
    const doc=app.setting.doc, manager=doc.querySelector(".kplex-style-manager");
    let more;while((more=manager.querySelector(".kplex-style-manager-more")))more.click();
    const row=Array.from(manager.querySelectorAll(".kplex-style-manager-row")).find(el=>el.querySelector(".kplex-style-manager-name").textContent==="#moc");
    row.click();doc.querySelector(".kplex-style-editor button.mod-cta").click();return JSON.stringify(true);
  })()`);
  await until('JSON.stringify(!app.setting.doc.querySelector(".kplex-style-editor"))', "Unchanged imported style save did not close");
  const edited=evaluate('JSON.stringify(app.plugins.plugins["k-plex"].settings)');
  assert.deepEqual(edited.tagNodeStyles,fixture.tagNodeStyles);
  assert.deepEqual(edited.tagStyleList,fixture.tagStyleList);
  evaluate(`(()=>{app.setting.doc.querySelector(".kplex-style-manager").closest(".modal").querySelector(".modal-close-button, .modal-header-button").click();app.setting.close();return JSON.stringify(true)})()`);
  console.log("Unchanged legacy-style save passed");
  report.scenarios.push({id:"unchanged-legacy-style-save",status:"passed",assertions:["#moc alpha #6e0707b2 preserved", "complete legacy overrides and matching order unchanged"]});

  evaluate(`(()=>{
    const state=window.${controller};state.done=false;
    (async()=>{try{
      await app.vault.create(${JSON.stringify(targetPath)},${JSON.stringify("# Migration target\n")});state.owned.push(${JSON.stringify(targetPath)});
      await app.vault.create(${JSON.stringify(sourcePath)},${JSON.stringify('---\nNote type: "#person"\ntags: [person, work]\nInspired by: "[[Kplex-Migration-Test-Target]]"\n---\n# Migration source\n')});state.owned.push(${JSON.stringify(sourcePath)});
      state.done=true;
    }catch(error){state.error=String(error)}})();return JSON.stringify(true);
  })()`);
  await until(`JSON.stringify(window.${controller}.error?{error:window.${controller}.error}:window.${controller}.done)`, "Test-note creation failed");
  await until(`JSON.stringify((()=>{const p=app.plugins.plugins["k-plex"];return p.getIndexStatus().upToDate && p.index.get(${JSON.stringify(sourcePath)})?.primaryStyleTag==="#person"})())`, "Imported settings index did not reconcile");
  // Exercise the real search activation path: focusInKplex persists history but does not
  // update the active React scene of an already open view.
  evaluate(`(()=>{
    const input=document.querySelector(".kplex-app input.kplex-search");
    if(!input)throw new Error("Plex search input missing");
    input.focus();input.select();return JSON.stringify(true);
  })()`);
  // Synthetic input events update the DOM value but are ignored by React in the real Electron
  // host. Insert text through the CLI's CDP bridge so this follows the native input path.
  cli(target.vaultName, "dev:cdp", "method=Input.insertText",
    `params=${JSON.stringify({ text: sourcePath.replace(/\.md$/, "") })}`);
  await until(`JSON.stringify((()=>{
    const result=Array.from(document.querySelectorAll(".kplex-search-result")).find(el=>el.querySelector("small")?.textContent===${JSON.stringify(sourcePath)});
    if(!result)return false;result.click();return true;
  })())`, "Indexed migration note did not appear in Plex search");
  console.log("Checking native Plex node and link rendering");
  const rendered = await until(`JSON.stringify((()=>{
    const node=document.querySelector('[data-kplex-path="${sourcePath}"]');
    const edge=Array.from(document.querySelectorAll(".kplex-edge-visible")).find(el=>el.getAttribute("stroke")?.includes("254, 251, 65"));
    if(!node || !edge) return false;
    return {label:node.textContent,border:node.style.borderColor,stroke:edge.getAttribute("stroke"),width:edge.getAttribute("stroke-width")};
  })())`, "Imported node/link styles did not render on the Plex");
  assert(rendered.label.includes("🧑 "));assert.equal(rendered.border,"rgb(247, 206, 70)");
  assert.equal(rendered.width,"2");
  report.scenarios.push({ id: "rendered-plex-styles", status: "passed", ...rendered });

  const beforeReload = evaluate('JSON.stringify(app.plugins.plugins["k-plex"].settings)');
  cli(target.vaultName,"plugin:disable","id=k-plex");cli(target.vaultName,"plugin:enable","id=k-plex");
  cli(target.vaultName,"command","id=k-plex:kplex-start");
  const reloaded=evaluate('JSON.stringify(app.plugins.plugins["k-plex"].settings)');
  // Compare local preferences with the actual pre-reload state, including navigation from the test.
  assertMigratedExcaliBrainSettings(reloaded, fixture, beforeReload);
  console.log("Plugin reload preserved imported settings");
  report.scenarios.push({id:"reload-preserves-import",status:"passed"});
  const errors=cli(target.vaultName,"dev:errors").trim();
  assert(!errors || /^No errors captured\.?$/i.test(errors),errors);
} catch(error) {
  report ??= {schemaVersion:1,target,scenarios:[]};report.status="failed";report.error=error instanceof Error?error.message:String(error);
} finally {
  console.log("Restoring test settings and removing owned notes");
  if(installedController){
    try {
      evaluate(`(()=>{const state=window.${controller};state.done=false;state.error=null;
        (async()=>{try{
          app.setting.doc.querySelectorAll(".kplex-style-editor,.kplex-style-manager,.kplex-import-settings-modal").forEach(el=>el.closest(".modal").querySelector(".modal-close-button, .modal-header-button").click());
          app.setting.close();
          for(const path of state.owned){const file=app.vault.getFileByPath(path);if(file)await app.vault.delete(file);}
          const p=app.plugins.plugins["k-plex"];p.settings=state.settings;await p.saveSettings(false);state.done=true;
        }catch(error){state.error=String(error)}})();return JSON.stringify(true)})()`);
      await until(`JSON.stringify(window.${controller}.error?{error:window.${controller}.error}:window.${controller}.done)`,"Cleanup failed");
      evaluate(`(()=>{delete window.${controller};return JSON.stringify(true)})()`);
      // Reload against the restored settings so K-Plex can reuse the matching pre-test snapshot.
      // Forcing a cold rebuild here makes cleanup depend on the size of the disposable vault.
      cli(target.vaultName,"plugin:disable","id=k-plex");cli(target.vaultName,"plugin:enable","id=k-plex");
      cli(target.vaultName,"command","id=k-plex:kplex-start");
      await until('JSON.stringify(app.plugins.plugins["k-plex"].getIndexStatus().upToDate)',"Restored settings index did not settle");
      report.cleanup={settingsRestored:true,notesRemoved:true,controllerRemoved:true,indexSettled:true};
    }catch(error){report.status="failed";report.cleanupError=String(error);}
  }
  report.completedAt=new Date().toISOString();
  writeFileSync(join(reportDir,"migration-report.json"),JSON.stringify(report,null,2)+"\n");
}
console.log(`ExcaliBrain migration verification ${report.status}; report: ${join(reportDir,"migration-report.json")}`);
if(report.error)console.error(report.error);
if(report.cleanupError)console.error(report.cleanupError);
if(report.status!=="passed")process.exitCode=1;
