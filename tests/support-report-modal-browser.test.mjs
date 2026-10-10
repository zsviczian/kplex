/**
 * Real Chromium DOM/CSS contracts for the production support modal, clipboard session and English
 * translator. Public Modal/Setting shell doubles supply only native container/button construction;
 * this lane cannot prove real Obsidian focus handling, clipboard permission or physical touch.
 * Profiles, frames and test-only DOM helpers are discarded independently of assertion outcomes.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { browserBundle, chromiumHarness } from "./support/browserTypeScript.mjs";

const report = "## Synthetic diagnostics\n\n```json\n{\"formatVersion\":1,\"sample\":\"é 🧠 <img src=x>\"}\n```\n";
const nativeShell = `
  /** Install only the Obsidian element helpers consumed by the actual modal on its owning realm. */
  function installHelpers(view) {
    const prototype = view.HTMLElement.prototype;
    /** Native-style class addition follows the element's existing realm. */
    prototype.addClass = function(name) { this.classList.add(name); };
    /** Native-style attribute writes remain on the actual browser element. */
    prototype.setAttr = function(name,value) { this.setAttribute(name,value); };
    /** Native-style text updates never interpret diagnostic content as HTML. */
    prototype.setText = function(value) { this.textContent=value; };
    /** Support status uses the real class list, not simulated presentation state. */
    prototype.toggleClass = function(name,value) { this.classList.toggle(name,value); };
    /** Native content disposal removes all actual descendants. */
    prototype.empty = function() { this.replaceChildren(); };
    /** Native element construction derives the document from its parent and accepts public options. */
    prototype.createEl = function(tag,options={}) {
      const child=this.ownerDocument.createElement(tag);
      if(options.cls)child.className=options.cls;
      if(options.text)child.textContent=options.text;
      if(options.href)child.setAttribute('href',options.href);
      this.append(child);return child;
    };
    /** Delegate the public div helper without introducing an additional document source. */
    prototype.createDiv = function(options) { return this.createEl('div',options); };
  }
  let activeWindow=window;
  /** Test-only selection of the public native shell's active window, independent of any App internals. */
  window.setSupportTestActiveWindow = function(view) { activeWindow=view;installHelpers(view); };
  /** Bounded public Modal double: production constructor/onOpen/onClose remain unchanged. */
  exports.Modal = class Modal {
    /** Construct the native-style shell in the selected owning document without reading plugin state. */
    constructor(app) {
      this.app=app;installHelpers(activeWindow);this.document=activeWindow.document;
      this.containerEl=this.document.createElement('div');this.containerEl.className='modal-container';
      this.modalEl=this.containerEl.createDiv({cls:'modal'});
      this.titleEl=this.modalEl.createEl('h2',{cls:'modal-title'});
      this.contentEl=this.modalEl.createDiv({cls:'modal-content'});
      this.opened=false;
    }
    /** Set the real text heading through the native shell's public title method. */
    setTitle(text) { this.titleEl.textContent=text; }
    /** Attach the shell and invoke actual feature construction; base focus behavior is explicitly a double. */
    open() { this.previousFocus=this.document.activeElement;this.document.body.append(this.containerEl);this.opened=true;this.onOpen?.(); }
    /** Invoke actual feature cleanup once before dropping the shell and restoring the captured fixture focus. */
    close() { if(!this.opened)return;this.opened=false;this.onClose?.();this.containerEl.remove();this.previousFocus?.focus(); }
  };
  /** Bounded public Setting double that creates real buttons with native callback chaining. */
  exports.Setting = class Setting {
    /** Native setting controls are scoped to the parent document provided by the feature. */
    constructor(container) { this.settingEl=container.createDiv({cls:'setting-item'});this.controls=this.settingEl.createDiv({cls:'setting-item-control'}); }
    /** Invoke the feature's actual callback with a real semantic button and public fluent methods. */
    addButton(configure) {
      const buttonEl=this.controls.createEl('button');buttonEl.type='button';
      const button={buttonEl,
        /** Set literal catalog copy on the actual button. */
        setButtonText(text) { buttonEl.textContent=text;return button; },
        /** Use the real browser click listener, allowing CDP-delivered trusted mouse activation. */
        onClick(callback) { buttonEl.addEventListener('click',callback);return button; }
      };
      configure(button);return this;
    }
  };
`;

// Native shell geometry is a declared minimal fixture. Feature rules below come from shipped CSS.
const shellCss = `body{margin:0;font:14px sans-serif;--font-monospace:monospace;--font-ui-small:13px;--text-warning:#9a6700;} .modal-container{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;} .modal{box-sizing:border-box;padding:16px;max-height:calc(100vh - 32px);overflow:auto;background:white;} .modal-title{margin:0 0 16px;} .setting-item-control{display:flex;flex-wrap:wrap;gap:8px;} .mod-warning{color:var(--text-warning);}`;

/** Create a production bundle with only the documented native-shell boundary substituted. */
async function bundle() {
  const source = await browserBundle(["src/adapters/obsidian/SupportReportModal.ts", "src/application/supportClipboard.ts", "src/lang/index.ts"], { obsidian: nativeShell });
  return source + `
    /** Mount disposable main-document or iframe fixtures with controlled clipboard result promises. */
    window.mountSupportFixture = async function(options={}) {
      const state=window.supportFixture={calls:[],releaseCount:0,frame:null,owner:window,session:null,modal:null,status:null};
      if(options.iframe){
        state.frame=document.createElement('iframe');state.frame.style.cssText='width:390px;height:700px;border:0';document.body.append(state.frame);
        state.owner=state.frame.contentWindow;
      }
      const owner=state.owner,doc=owner.document;
      const style=doc.createElement('style');style.textContent=${JSON.stringify(shellCss + readFileSync("styles.css", "utf8"))};doc.head.append(style);state.style=style;
      const launch=doc.createElement('button');launch.textContent='Fixture launcher';doc.body.append(launch);launch.focus();state.launch=launch;
      window.setSupportTestActiveWindow(owner);
      const payload=${JSON.stringify(report)};
      /** A gesture-safe writer records exact bytes and returns a deferred host result without performing real clipboard I/O. */
      const writer=text=>new Promise(/** Keep real promise settlement under test control while preserving the synchronous writer call. */ (resolve,reject)=>state.calls.push({text,resolve,reject}));
      state.session=new sourceModules.SupportClipboardSession(payload,options.unavailable?null:writer);
      state.session.copy();
      state.modal=new sourceModules.SupportReportModal({},state.session,sourceModules.createTranslator('en'),/** Record the actual feature's idempotent native teardown notification. */ ()=>state.releaseCount++);
      state.modal.open();
      state.status=state.modal.contentEl.querySelector('[role=status]');
      /** Read the real DOM without depending on private feature fields or a mocked view model. */
      state.snapshot=()=>{
        const modal=state.modal.modalEl,preview=modal.querySelector('textarea'),retry=modal.querySelector('button');
        const bounds=modal.getBoundingClientRect();
        const descendants=[...modal.querySelectorAll('p,a,textarea,button')];
        return {title:state.modal.titleEl.textContent,status:state.status.textContent,warning:state.status.classList.contains('mod-warning'),live:state.status.getAttribute('aria-live'),state:state.session.state,
          preview:preview?.value??null,readonly:preview?.readOnly??null,spellcheck:preview?.spellcheck??null,label:preview?.getAttribute('aria-label')??null,retryDisabled:retry?.disabled??null,
          paragraphs:[...modal.querySelectorAll('p')].map(/** Preserve displayed instruction order as visible to a user. */ p=>p.textContent),
          links:[...modal.querySelectorAll('a')].map(/** Inspect literal external navigation without opening a real site. */ a=>({href:a.getAttribute('href'),target:a.target,rel:a.rel,text:a.textContent})),
          bytes:state.calls.map(/** Recorded write text is the independent clipboard-byte oracle. */ call=>call.text),releaseCount:state.releaseCount,attached:state.modal.containerEl.isConnected,
          selection:preview?{start:preview.selectionStart,end:preview.selectionEnd}:null,
          owners:{modal:modal.ownerDocument===doc,preview:preview?.ownerDocument===doc,mainHasModal:document.querySelector('.kplex-support-report-modal')!==null},
          bounds:{left:bounds.left,right:bounds.right,width:bounds.width,viewport:owner.innerWidth},
          noOverflow:modal.scrollWidth<=modal.clientWidth&&doc.documentElement.scrollWidth<=owner.innerWidth&&descendants.every(/** Each rendered control must remain inside the owning viewport. */ el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=owner.innerWidth;})};
      };
      /** Fulfill or deny the latest host attempt, then drain its real production settlement callback. */
      state.settle=async(success,index=state.calls.length-1)=>{if(success)state.calls[index].resolve();else state.calls[index].reject(new Error('private/file.md bearer=fake-token'));await Promise.resolve();await Promise.resolve();};
      /** Return coordinates of an actual native-shell button for trusted CDP input. */
      state.buttonPoint=index=>{const r=state.modal.contentEl.querySelectorAll('button')[index].getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2};};
      /** Select the exact read-only text using the browser's genuine textarea selection. */
      state.selectPreview=()=>{const p=state.modal.contentEl.querySelector('textarea');p.focus();p.select();};
      /** Retire modal/clipboard captures and all owned fixture DOM even after a failed assertion. */
      state.dispose=()=>{state.modal.close();state.launch.remove();state.style.remove();state.frame?.remove();window.setSupportTestActiveWindow(window);delete window.supportFixture;};
      return true;
    };
  `;
}

/** Own one real Chromium profile; this function does not grant or emulate clipboard permission. */
async function browser(options = {}) {
  const host = await chromiumHarness(await bundle());
  try {
    await host.command("Emulation.setDeviceMetricsOverride", { width: 900, height: 750, deviceScaleFactor: 1, mobile: false });
    await host.evaluate(`mountSupportFixture(${JSON.stringify(options)})`);
    return host;
  } catch (error) { await host.cleanup(); throw error; }
}

/** Activate a real button with browser-trusted mouse input without navigating external links. */
async function clickButton(host, index) {
  const { x, y } = await host.evaluate(`supportFixture.buttonPoint(${index})`);
  await host.command("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 });
  await host.command("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 });
}

/** Always release feature callbacks before destroying the disposable browser realm/profile. */
async function cleanup(host) {
  try { await host.evaluate("supportFixture?.dispose()"); } finally { await host.cleanup(); }
}

test("native-shell modal displays exact inert report bytes, ordered instructions and truthful pending/success states", /** Feature content, state and real DOM are tested; the surrounding Modal shell is an explicit public-API double. */ async () => {
  const host = await browser();
  try {
    const before = await host.evaluate("supportFixture.snapshot()");
    assert.equal(before.preview, report);
    assert.deepEqual(before.bytes, [report]);
    assert.equal(before.title, "Report a bug");
    assert.equal(before.status, "Copying…");
    assert.equal(before.state, "copying");
    assert.equal(before.retryDisabled, true);
    assert.equal(before.warning, false);
    assert.equal(before.readonly, true); assert.equal(before.spellcheck, false);
    assert.equal(before.label, "Diagnostic report"); assert.equal(before.live, "polite");
    assert.match(before.paragraphs[0], /^Search existing issues first/);
    assert.match(before.paragraphs[1], /paste this diagnostic report at the bottom/);
    assert.match(before.paragraphs[2], /Inspect it for private data before posting/);
    assert.equal(await host.evaluate("supportFixture.modal.modalEl.querySelector('img')===null"), true);
    assert.deepEqual(before.links, [
      { href: "https://github.com/zsviczian/kplex/issues", target: "_blank", rel: "noopener noreferrer", text: "Search issues" },
      { href: "https://github.com/zsviczian/kplex/issues/new", target: "_blank", rel: "noopener noreferrer", text: "Create issue" },
    ]);
    await host.evaluate("supportFixture.settle(true)");
    const after = await host.evaluate("supportFixture.snapshot()");
    assert.equal(after.status, "Copied. Paste the report at the bottom of your issue.");
    assert.equal(after.retryDisabled, false);
    assert.equal(after.preview, after.bytes[0]);
  } finally { await cleanup(host); }
});

test("denial keeps manual selection and trusted retry usable without exposing private errors", /** A mocked host denial exercises the actual UI fallback while physical clipboard activation remains a separate check. */ async () => {
  const host = await browser();
  try {
    await host.evaluate("supportFixture.settle(false)");
    const failed = await host.evaluate("supportFixture.snapshot()");
    assert.equal(failed.status, "Copy failed. Select the report below to copy it manually, or try Copy again.");
    assert.equal(failed.warning, true); assert.equal(failed.retryDisabled, false);
    assert(!JSON.stringify(failed).includes("fake-token"));
    await host.evaluate("supportFixture.selectPreview()");
    assert.deepEqual((await host.evaluate("supportFixture.snapshot()")).selection, { start: 0, end: report.length });
    await clickButton(host, 0);
    const retry = await host.evaluate("supportFixture.snapshot()");
    assert.deepEqual(retry.bytes, [report, report]);
    assert.equal(retry.status, "Copying…"); assert.equal(retry.retryDisabled, true);
    assert.equal(retry.warning, false);
    await host.evaluate("supportFixture.settle(true)");
    assert.equal((await host.evaluate("supportFixture.snapshot()")).state, "copied");
  } finally { await cleanup(host); }
});

test("unavailable clipboard remains copyable and the real feature CSS fits narrow viewports", /** Measure actual bounds at phone-like widths without claiming emulated native touch or host theme coverage. */ async () => {
  const host = await browser({ unavailable: true });
  try {
    for (const width of [320, 390, 600]) {
      await host.command("Emulation.setDeviceMetricsOverride", { width, height: 750, deviceScaleFactor: 1, mobile: false });
      const state = await host.evaluate("supportFixture.snapshot()");
      assert.equal(state.state, "failed"); assert.equal(state.warning, true);
      assert.equal(state.preview, report); assert.equal(state.retryDisabled, false);
      assert.equal(state.noOverflow, true, `${width}px modal must fit its owning viewport`);
      assert(state.bounds.left >= 0 && state.bounds.right <= width);
    }
    await clickButton(host, 0);
    const retry = await host.evaluate("supportFixture.snapshot()");
    assert.equal(retry.state, "failed"); assert.deepEqual(retry.bytes, []);
  } finally { await cleanup(host); }
});

test("closing a pending modal retires both settlement branches and invokes release once", /** No detached DOM mutation, writer restart or callback rebinding is permitted after the native close boundary. */ async () => {
  for (const success of [true, false]) {
    const host = await browser();
    try {
      await clickButton(host, 1);
      await host.evaluate(`supportFixture.settle(${success})`);
      await host.evaluate("supportFixture.modal.close();supportFixture.session.copy()");
      const result = await host.evaluate("supportFixture.snapshot()");
      assert.equal(result.attached, false); assert.equal(result.preview, null);
      assert.equal(result.status, "Copying…"); assert.equal(result.state, "copying");
      assert.equal(result.releaseCount, 1); assert.deepEqual(result.bytes, [report]);
    } finally { await cleanup(host); }
  }
});

test("selected iframe native-shell owner receives modal controls, selection and teardown", /** This owner-document regression does not substitute an iframe for a real Obsidian pop-out acceptance run. */ async () => {
  const host = await browser({ iframe: true });
  try {
    const state = await host.evaluate("supportFixture.snapshot()");
    assert.deepEqual(state.owners, { modal: true, preview: true, mainHasModal: false });
    assert.equal(state.bounds.viewport, 390); assert.equal(state.noOverflow, true);
    await host.evaluate("supportFixture.selectPreview();supportFixture.settle(false)");
    assert.deepEqual((await host.evaluate("supportFixture.snapshot()")).selection, { start: 0, end: report.length });
    await host.evaluate("supportFixture.modal.close()");
    assert.equal(await host.evaluate("supportFixture.owner.document.activeElement===supportFixture.launch"), true, "the declared native-shell fixture restores its owning-document focus");
    assert.equal((await host.evaluate("supportFixture.snapshot()")).releaseCount, 1);
  } finally { await cleanup(host); }
});
