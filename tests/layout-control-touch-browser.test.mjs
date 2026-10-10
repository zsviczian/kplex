/**
 * Trusted Chromium input and rectangle regressions for production native LayoutSlider/LayoutControls
 * with the shipped stylesheet, including the full-width typography stack at every pane size.
 * Surrounding gesture counters are observation fixtures, not Obsidian's
 * sidebar/camera; physical Mobile and native host recognizer acceptance remain separate lanes.
 */
import assert from "node:assert/strict";
import { build } from "esbuild";
import { readFileSync } from "node:fs";
import test from "node:test";
import { chromiumHarness } from "./support/browserTypeScript.mjs";

/** Bundle real components and installed React; fixture state models only the caller value contract. */
async function bundle() {
  const result = await build({ stdin: { resolveDir: process.cwd(), loader: "tsx", contents: `
    import React,{useState} from 'react';import {createRoot} from 'react-dom/client';import {flushSync} from 'react-dom';
    import {LayoutControls} from './src/ui/components/LayoutControls';import {LayoutSlider} from './src/ui/components/LayoutSlider';
    export function mountFixture(){
      document.body.style.margin='0';const host=document.createElement('div');host.className='kplex-view-host';
      const pane=document.createElement('div');pane.className='kplex-plex';pane.style.width='900px';pane.style.height='700px';pane.style.flex='none';host.append(pane);document.body.append(host);
      const state=window.fixture={host,pane,changes:[],inputs:[],surroundingTouches:0,device:'desktop'};
      pane.addEventListener('touchstart',()=>state.surroundingTouches++);pane.addEventListener('touchmove',()=>state.surroundingTouches++);
      pane.addEventListener('input',event=>{if(event.target.type==='range')state.inputs.push({key:event.target.getAttribute('aria-label'),value:Number(event.target.value),trusted:event.isTrusted})});
      const definitions=[['Horizontal',.75,4,.05,1.5],['Vertical',.75,4,.05,1.5],['Parents',1,3,1,2],['Children',1,7,1,3],['Font',8,28,.1,13],['Label',5,120,1,49],['Width',120,800,1,286]];
      /** Caller-owned state makes native input visible while the production shell only arranges it. */
      function Fixture(){
        const [geometry,setGeometry]=useState({width:900,height:700}),[open,setOpen]=useState(true),[values,setValues]=useState(definitions.map(item=>item[4])),[wrap,setWrap]=useState(false);
        Object.assign(state,{values,wrap,resize:(width,height)=>flushSync(()=>{pane.style.width=width+'px';pane.style.height=height+'px';setGeometry({width,height})}),setRail:(index,value)=>flushSync(()=>setValues(current=>current.map((old,key)=>key===index?value:old))),setOpen:value=>flushSync(()=>setOpen(value))});
        /** The actual rail emits scalar values; no fixture pointer/value math replaces native input. */
        const rail=index=>{const [label,min,max,step]=definitions[index];return <LayoutSlider key={label} label={label} caption={label} icon={<span />} value={values[index]} displayValue={String(values[index])} min={min} max={max} step={step} onChange={value=>{state.changes.push({index,value});setValues(current=>current.map((old,key)=>key===index?value:old))}}/>};
        return <><LayoutControls width={geometry.width} height={geometry.height} expanded={open} toggle={<button type="button" className="kplex-icon-button kplex-layout-toggle" aria-label="Configure" aria-expanded={open} onClick={()=>setOpen(value=>!value)}>L</button>}>
          <div className="kplex-density-axes">{rail(0)}{rail(1)}</div><div className="kplex-density-axes">{rail(2)}{rail(3)}</div>
          <div className="kplex-typography-group"><div className="kplex-typography-scope"><span>Desktop</span><button type="button" aria-label="Reset" onClick={()=>setValues(definitions.map(item=>item[4]))}>R</button></div>
            <div className="kplex-typography-controls"><div className="kplex-density-axes">{rail(4)}{rail(5)}{rail(6)}</div><label className="kplex-density-control kplex-wrap-label-control"><input type="checkbox" aria-label="Wrap" checked={wrap} onChange={event=>setWrap(event.currentTarget.checked)}/><span className="kplex-wrap-label-caption">Wrap node labels</span></label></div>
          </div>
        </LayoutControls><div className="kplex-zoom-controls">{['Zoom in','Zoom out','Fit','Fullscreen','Zen'].map(label=><button key={label} type="button" aria-label={label}>Z</button>)}</div></>;
      }
      const root=createRoot(pane);flushSync(()=>root.render(<Fixture/>));state.dispose=()=>{flushSync(()=>root.unmount());host.remove()};
    }
  ` }, bundle: true, write: false, platform: "browser", format: "iife", globalName: "sourceModules" });
  return result.outputFiles[0].text;
}

/** Create one disposable browser with actual CSS and CDP-delivered touch enabled. */
async function browser() {
  const host = await chromiumHarness(await bundle());
  try {
    await host.command("Emulation.setDeviceMetricsOverride", { width: 1100, height: 900, deviceScaleFactor: 1, mobile: false });
    await host.command("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 2 });
    await host.evaluate(`(()=>{const style=document.createElement('style');style.textContent=${JSON.stringify(readFileSync("styles.css", "utf8"))};document.head.append(style);sourceModules.mountFixture()})()`);
    await host.evaluate("new Promise(resolve=>requestAnimationFrame(()=>resolve(true)))");
    return host;
  } catch (error) { await host.cleanup(); throw error; }
}

/** Read native range geometry and values after scrolling that actual control into the bounded panel. */
async function rail(host, label) {
  return host.evaluate(`(()=>{const input=fixture.pane.querySelector('input[aria-label=${JSON.stringify(label)}]');input.scrollIntoView({block:'nearest'});const bounds=input.getBoundingClientRect();return{left:bounds.left,top:bounds.top,width:bounds.width,height:bounds.height,min:Number(input.min),max:Number(input.max),step:Number(input.step),value:Number(input.value)}})()`);
}

/** Send one browser-native touch phase; this exercises the native control instead of dispatching a synthetic Event. */
async function touch(host, type, x = 0, y = 0, id = 1) {
  return host.command("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" || type === "touchCancel" ? [] : [{ x, y, id, radiusX: 1, radiusY: 1, force: 1 }] });
}

/** Exercise thumb/track origins with an independently selected immediate versus hold timing. */
async function drag(host, label, origin, hold) {
  const bounds = await rail(host, label);
  const fraction = (bounds.value - bounds.min) / (bounds.max - bounds.min);
  const startX = bounds.left + 4 + (bounds.width - 8) * (origin === "thumb" ? fraction : .32);
  const y = bounds.top + bounds.height / 2;
  await host.evaluate("fixture.inputs=[];fixture.changes=[];fixture.surroundingTouches=0");
  await touch(host, "touchStart", startX, y);
  if (hold) await new Promise(/** A deliberate hold is a separate case, never an input workaround. */ resolve => setTimeout(resolve, 450));
  for (const position of [.48, .64, .82, .95]) await touch(host, "touchMove", bounds.left + 4 + (bounds.width - 8) * position, y);
  await touch(host, "touchEnd");
  const result = await host.evaluate(`(()=>{const input=fixture.pane.querySelector('input[aria-label=${JSON.stringify(label)}]');return{value:Number(input.value),events:fixture.inputs,changes:fixture.changes,surroundingTouches:fixture.surroundingTouches}})()`);
  assert(result.events.length >= 2, `${label}/${origin}/${hold ? "hold" : "immediate"}: native intermediate input values missing`);
  assert(new Set(result.events.map(item => item.value)).size >= 2, "native drag must change over several positions");
  assert(result.events.every(item => item.trusted), "CDP input must reach the native control as trusted events");
  assert(result.changes.length >= 2, "production React onChange must receive intermediate native values");
  assert.equal(result.surroundingTouches, 0, "control-origin touch must not reach the surrounding bubble recognizer fixture");
  assert(result.value >= bounds.min && result.value <= bounds.max);
  assert(Math.abs((result.value - bounds.min) / bounds.step - Math.round((result.value - bounds.min) / bounds.step)) < 1e-7, "native step policy must remain intact");
  return result;
}

test("trusted thumb/track immediate and hold drags keep native range values, steps and local touch ownership", /** Physical Mobile sidebar behavior still requires the separate native target-device lane. */ async () => {
  const host = await browser();
  try {
    await host.evaluate("fixture.resize(390,700)");
    for (const label of ["Horizontal", "Children", "Font", "Label", "Width"]) {
      const index = { Horizontal: 0, Children: 3, Font: 4, Label: 5, Width: 6 }[label];
      for (const origin of ["thumb", "track"]) for (const hold of [false, true]) {
        await host.evaluate(`fixture.setRail(${index},${{ Horizontal: 1.5, Children: 3, Font: 13, Label: 49, Width: 286 }[label]})`);
        await drag(host, label, origin, hold);
      }
    }
    // A cancelled contact cannot leave custom capture/state because the helper owns neither.
    const bounds = await rail(host, "Horizontal");
    await touch(host, "touchStart", bounds.left + bounds.width / 2, bounds.top + 6);
    await touch(host, "touchCancel");
    await host.evaluate("fixture.setRail(0,1.5)");
    await drag(host, "Horizontal", "thumb", false);
    const point = await rail(host, "Horizontal"), x = point.left + point.width / 2, y = point.top + 6;
    await touch(host, "touchStart", x, y);
    await host.command("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y, id: 1 }, { x: x + 10, y, id: 2 }] });
    await touch(host, "touchCancel");
    await host.evaluate("fixture.setRail(0,1.5)");
    await drag(host, "Horizontal", "thumb", false);
    const collapse = await rail(host, "Horizontal");
    await touch(host, "touchStart", collapse.left + collapse.width / 2, collapse.top + 6);
    await host.evaluate("fixture.setOpen(false)");
    await touch(host, "touchEnd");
    await host.evaluate("fixture.setOpen(true);fixture.setRail(0,1.5)");
    await drag(host, "Horizontal", "thumb", false);
    await host.evaluate("fixture.surroundingTouches=0");
    await touch(host, "touchStart", 280, 100);
    await touch(host, "touchMove", 310, 100);
    await touch(host, "touchEnd");
    assert((await host.evaluate("fixture.surroundingTouches")) > 0, "outside gestures must remain available to surrounding owners");
  } finally { try { await host.evaluate("fixture?.dispose()"); } finally { await host.cleanup(); } }
});

test("pane-fit disclosure stays bottom-left with bounded controls above, no zoom overlap and no collapsed hit shield", /** Rectangles verify the typography stack and pane-fit policy while hit tests preserve usable native controls. */ async () => {
  const host = await browser();
  try {
    for (const [width, height] of [[320, 700], [390, 700], [480, 700], [600, 700], [900, 700], [390, 220], [900, 220]]) {
      const result = await host.evaluate(`(()=>{
        fixture.resize(${width},${height});const p=fixture.pane,c=p.querySelector('.kplex-layout-controls'),t=c.querySelector('button'),panel=c.querySelector('.kplex-layout-panel'),zoom=p.querySelector('.kplex-zoom-controls');
        const rect=element=>{const b=element.getBoundingClientRect();return{left:b.left,right:b.right,top:b.top,bottom:b.bottom,width:b.width,height:b.height}};
        const pane=rect(p),toggle=rect(t),group=rect(panel),opposite=rect(zoom),stacked=c.classList.contains('is-stacked');
        const overlap=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
        const controls=[...panel.querySelectorAll('input')].map(input=>{input.scrollIntoView({block:'nearest'});const box=rect(input);return box.left>=pane.left&&box.right<=pane.right&&box.top>=pane.top&&box.bottom<=pane.bottom&&document.elementFromPoint((box.left+box.right)/2,(box.top+box.bottom)/2)===input});
        panel.scrollTop=0;const typography=panel.querySelector('.kplex-typography-controls'),wrap=typography.querySelector('.kplex-wrap-label-control');
        return{pane,toggle,group,opposite,stacked,zoomButton:rect(zoom.querySelector('button')),overlap:overlap(group,opposite)||overlap(toggle,opposite),controls,hit:document.elementFromPoint(toggle.left+toggle.width/2,toggle.top+toggle.height/2)===t,scrollable:panel.scrollHeight>panel.clientHeight,
          typography:{rails:[...typography.querySelectorAll('.kplex-density-axes > .kplex-density-control')].map(rect),wrap:rect(wrap),checkbox:rect(wrap.querySelector('input')),caption:rect(wrap.querySelector('.kplex-wrap-label-caption'))}};
      })()`);
      assert.equal(result.stacked, width < 760 || height < 300, `${width}x${height}`);
      assert.equal(result.toggle.height, result.zoomButton.height, "stacking must preserve the shared control height");
      assert.equal(result.toggle.width, result.zoomButton.width, "stacking must preserve the shared control width");
      assert(result.toggle.left - result.pane.left <= 20 && result.pane.bottom - result.toggle.bottom <= 20, "toggle must stay anchored bottom-left");
      if (result.stacked) assert(result.group.bottom <= result.toggle.top, "expanded panel must be above the disclosure");
      assert(result.group.top >= result.pane.top && result.group.right <= result.pane.right);
      assert.equal(result.overlap, false, `${width}x${height}: layout and zoom controls must not intersect`);
      assert(result.controls.every(Boolean), `${width}x${height}: each scrolled native input must be in-bounds and hit-testable`);
      assert.equal(result.hit, true);
      const typography = result.typography;
      assert(typography.rails.every(/** Compare each rail to the separate wrap card without relying on a fixed tile width. */ card => card.left === typography.wrap.left && card.width === typography.wrap.width), `${width}x${height}: typography cards must share the full column width`);
      assert(typography.wrap.top > typography.rails.at(-1).bottom, "wrap checkbox must sit below the last typography rail in every layout");
      assert(typography.caption.left > typography.checkbox.right && typography.caption.top < typography.checkbox.bottom && typography.caption.bottom > typography.checkbox.top, "wrap label must sit beside its checkbox");
      if (height === 220) assert.equal(result.scrollable, true, "short pane must scroll only its bounded expanded panel");
    }
    const retained = await host.evaluate(`(()=>{fixture.resize(390,700);fixture.setRail(6,421);const input=fixture.pane.querySelector('input[aria-label=Width]');input.focus();fixture.resize(900,700);const wide=fixture.pane.querySelector('.kplex-layout-controls');const result={sameInput:fixture.pane.querySelector('input[aria-label=Width]')===input,focus:document.activeElement===input,value:input.value,device:fixture.device,stacked:wide.classList.contains('is-stacked')};fixture.setOpen(false);const toggle=wide.querySelector('button'),r=toggle.getBoundingClientRect();return{...result,noPanel:!wide.querySelector('.kplex-layout-panel'),toggleHit:document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)===toggle,outsideHit:!document.elementFromPoint(r.left+80,r.top-50)?.closest('.kplex-layout-controls')}})()`);
    assert.deepEqual(retained, { sameInput: true, focus: true, value: "421", device: "desktop", stacked: false, noPanel: true, toggleHit: true, outsideHit: true });
  } finally { try { await host.evaluate("fixture?.dispose()"); } finally { await host.cleanup(); } }
});

test("short expanded panels preserve native vertical scrolling without leaking the control-origin stream", /** The first scrolling container owns pan-y; the surrounding graph fixture must stay untouched. */ async () => {
  const host = await browser();
  try {
    const point = await host.evaluate(`(()=>{
      fixture.resize(390,220);fixture.surroundingTouches=0;const panel=fixture.pane.querySelector('.kplex-layout-panel');panel.scrollTop=0;
      const heading=panel.querySelectorAll('.kplex-density-heading')[1],r=heading.getBoundingClientRect(),p=panel.getBoundingClientRect();
      return{x:r.left+r.width*.8,y:r.top+r.height/2,minY:p.top+5};
    })()`);
    await touch(host, "touchStart", point.x, point.y);
    for (const distance of [15, 30, 45, 60]) await touch(host, "touchMove", point.x, Math.max(point.minY, point.y - distance));
    await touch(host, "touchEnd");
    await host.evaluate("new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(true))))");
    const result = await host.evaluate("({scroll:fixture.pane.querySelector('.kplex-layout-panel').scrollTop,paneScroll:fixture.pane.scrollTop,surroundingTouches:fixture.surroundingTouches})");
    assert(result.scroll > 0, "native label/background swipe must scroll the short bounded panel");
    assert.equal(result.paneScroll, 0);
    assert.equal(result.surroundingTouches, 0);
  } finally { try { await host.evaluate("fixture?.dispose()"); } finally { await host.cleanup(); } }
});

/** Deliver native key phases through CDP without synthesizing browser KeyboardEvents. */
async function key(host, name, code, virtualCode, modifiers = 0) {
  await host.command("Input.dispatchKeyEvent", { type: "keyDown", key: name, code, windowsVirtualKeyCode: virtualCode, modifiers });
  await host.command("Input.dispatchKeyEvent", { type: "keyUp", key: name, code, windowsVirtualKeyCode: virtualCode, modifiers });
}

test("native arrows, Tab/Shift+Tab, mouse range input and reset retain the disclosed control contract", /** Actual preference persistence remains caller-owned and is covered by typography/profile suites. */ async () => {
  const host = await browser();
  try {
    await host.evaluate("fixture.resize(390,700);fixture.setRail(0,1.5);fixture.pane.querySelector('.kplex-layout-toggle').focus()");
    await key(host, "Tab", "Tab", 9);
    assert.equal(await host.evaluate("document.activeElement.getAttribute('aria-label')"), "Horizontal");
    await key(host, "Tab", "Tab", 9, 8);
    assert.equal(await host.evaluate("document.activeElement.getAttribute('aria-label')"), "Configure");
    await key(host, "Tab", "Tab", 9);
    for (const expected of ["Vertical", "Parents", "Children", "Reset", "Font", "Label", "Width", "Wrap"]) {
      await key(host, "Tab", "Tab", 9);
      assert.equal(await host.evaluate("document.activeElement.getAttribute('aria-label')"), expected, "Tab follows the visible panel's DOM order");
    }
    await key(host, "Tab", "Tab", 9, 8);
    assert.equal(await host.evaluate("document.activeElement.getAttribute('aria-label')"), "Width");
    await host.evaluate("fixture.pane.querySelector('input[aria-label=Horizontal]').focus()");
    await key(host, "ArrowRight", "ArrowRight", 39);
    assert.equal(await host.evaluate("Number(document.activeElement.value)"), 1.55);
    const bounds = await rail(host, "Horizontal");
    const x = bounds.left + bounds.width * .8, y = bounds.top + bounds.height / 2;
    await host.command("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 });
    await host.command("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 });
    assert((await host.evaluate("fixture.values[0]")) > 2, "native mouse track interaction must remain active");
    const reset = await host.evaluate("(async()=>{fixture.pane.querySelector('input[aria-label=Wrap]').click();await new Promise(resolve=>setTimeout(resolve,0));const checked=fixture.wrap;fixture.setRail(6,700);fixture.pane.querySelector('button[aria-label=Reset]').click();await new Promise(resolve=>setTimeout(resolve,0));return{checked,width:fixture.values[6]}})()");
    assert.deepEqual(reset, { checked: true, width: 286 });
  } finally { try { await host.evaluate("fixture?.dispose()"); } finally { await host.cleanup(); } }
});
