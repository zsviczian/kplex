/**
 * Exact-build native layout assertions embedded in the owned UX fixture. Controls use production
 * React handlers and Settings routes; measurements compare physical gaps in camera-neutral units.
 * The parent driver owns note/settings/window cleanup and serial CLI polling.
 */
export const layoutEnhancementScenarios = `
  await c.go(c.hub);await c.editor(false);
  p.settings.graphDepth=1;p.settings.nodeSortOrder="name-asc";p.index.notify();await c.frames();
  const configToggle=root.querySelector(".kplex-layout-toggle");
  c.check(configToggle&&configToggle.getAttribute("aria-expanded")==="false"&&root.querySelectorAll('.kplex-layout-controls input[type="range"]').length===0,"Configuration must begin hidden with unmounted sliders");
  await c.click(configToggle);await c.frames();
  c.check(root.querySelectorAll('.kplex-layout-controls input[type="range"]').length===6,"Configuration toggle did not mount six sliders");
  await c.click(configToggle);await c.frames();
  c.check(root.querySelectorAll('.kplex-layout-controls input[type="range"]').length===0,"Configuration toggle did not unmount sliders");
  await c.click(configToggle);await c.frames();record("default-hidden-layout-toggle-mount-unmount");
  const layoutRail=key=>root.querySelector('.kplex-layout-controls input[aria-label="'+p.translator(key)+'"]');
  for(const key of ["graph.horizontalDensity","graph.verticalDensity","graph.parentColumns","graph.childColumns"]){
    const input=layoutRail(key);c.check(input&&input.type==="range"&&!input.disabled,"Missing usable layout rail: "+key);
  }
  const setRail=async(key,value)=>{const input=layoutRail(key);c.input(input,String(value));
    await c.until(()=>Number(layoutRail(key).value)===value,"Layout rail did not display its exact value: "+key);await c.wait(300);await c.frames()};
  await setRail("graph.parentColumns",2);await setRail("graph.childColumns",5);
  await setRail("graph.horizontalDensity",2);await setRail("graph.verticalDensity",2);
  await tab.setControlValue("compactView",false);await tab.setControlValue("minLinkLength",18);
  const layoutBuilds=p.index.getSemanticPreparationDiagnostics().fullBuilds;
  // Overflow nodes retain real positions outside their clip. World-unit gaps use the center's
  // transform scale and do not confuse camera fitting with layout or actual paint latency.
  const measureLayout=()=>{const scale=root.querySelector(".kplex-role-center").getBoundingClientRect().height/parseFloat(root.querySelector(".kplex-role-center").style.height);
    const nodes=Array.from(root.querySelectorAll(".kplex-role-child")).filter(n=>n.dataset.kplexPath.startsWith(c.folder+"/Child-"));
    const rects=nodes.map(n=>({path:n.dataset.kplexPath,r:n.getBoundingClientRect()})).sort((a,b)=>a.path.localeCompare(b.path));
    const a=rects[0].r,b=rects[1].r,row=rects[5].r;
    const profile=p.getActiveLayoutProfile("leaf");
    return {horizontal:(b.left-a.right)/scale,vertical:(row.top-a.bottom)/scale,height:a.height/scale,width:a.width/scale,
      profile:JSON.parse(JSON.stringify(profile)),columns:rects.filter(n=>Math.abs(n.r.top-a.top)<0.1).length};
  };
  const baseLayout=measureLayout();c.check(baseLayout.columns===5,"Child rail did not produce five columns");
  await setRail("graph.horizontalDensity",4);const horizontalLayout=measureLayout();
  c.check(horizontalLayout.horizontal<baseLayout.horizontal&&Math.abs(horizontalLayout.vertical-baseLayout.vertical)<0.1,"Horizontal rail did not independently tighten columns");
  c.check(horizontalLayout.profile.horizontalCompactingFactor===4&&horizontalLayout.profile.compactingFactor===2,"Horizontal rail changed the wrong saved axis");
  await setRail("graph.horizontalDensity",2);await setRail("graph.verticalDensity",0.75);const verticalLayout=measureLayout();
  c.check(verticalLayout.vertical>baseLayout.vertical&&Math.abs(verticalLayout.horizontal-baseLayout.horizontal)<0.1,"Vertical rail did not independently spread rows");
  c.check(verticalLayout.profile.compactingFactor===0.75&&verticalLayout.profile.horizontalCompactingFactor===2,"Vertical rail changed the wrong saved axis");
  await setRail("graph.verticalDensity",2);await tab.setControlValue("compactView",true);await c.frames();const compactLayout=measureLayout();
  c.check(compactLayout.horizontal<baseLayout.horizontal&&compactLayout.vertical<baseLayout.vertical,"Compact view did not tighten both axes");
  c.check(Math.abs(compactLayout.width-baseLayout.width)<0.1&&Math.abs(compactLayout.height-baseLayout.height)<0.1,"Compact view changed node interior dimensions");
  await tab.setControlValue("compactView",false);await tab.setControlValue("minLinkLength",6);await c.frames();const shortLinks=measureLayout();
  await tab.setControlValue("minLinkLength",40);await c.frames();const longLinks=measureLayout();
  c.check(longLinks.horizontal>shortLinks.horizontal&&longLinks.vertical>shortLinks.vertical,"Minimum link length does not affect rendered spacing");
  const columnCases=[];
  for(const columns of [1,7]){await setRail("graph.childColumns",columns);
    const nodes=Array.from(root.querySelectorAll(".kplex-role-child")).filter(n=>n.dataset.kplexPath.startsWith(c.folder+"/Child-"));
    const top=Math.min(...nodes.map(n=>n.getBoundingClientRect().top));const actual=nodes.filter(n=>Math.abs(n.getBoundingClientRect().top-top)<0.1).length;
    c.check(actual===columns&&p.getActiveLayoutProfile("leaf").childColumns===columns,"Child columns rail, profile and rows disagree");columnCases.push({configured:columns,actual});
  }
  await setRail("graph.parentColumns",3);
  const threeParents=Array.from(root.querySelectorAll(".kplex-role-parent"));
  const parentRows=threeParents.map(n=>{const r=n.getBoundingClientRect();return {path:n.dataset.kplexPath,top:r.top,center:r.top+r.height/2,width:r.width,height:r.height,style:n.getAttribute("style")}});
  // Unfiltered parents grow upward: their first complete row is nearest the center, at the bottom.
  const firstParentCenter=Math.max(...parentRows.map(n=>n.center)),firstRowCount=parentRows.filter(n=>Math.abs(n.center-firstParentCenter)<0.1).length;
  c.check(firstRowCount===3&&p.getActiveLayoutProfile("leaf").parentColumns===3,"Parent three-column rail, saved profile and rows disagree: "+JSON.stringify({firstRowCount,profile:p.getActiveLayoutProfile("leaf"),parentRows}));
  await setRail("graph.parentColumns",1);c.check(p.getActiveLayoutProfile("leaf").parentColumns===1,"Parent column value did not persist");
  const parents=Array.from(root.querySelectorAll(".kplex-role-parent")).filter(n=>n.dataset.kplexPath.startsWith(c.folder+"/Parent-"));
  c.check(new Set(parents.map(n=>Math.round(n.getBoundingClientRect().top))).size===parents.length,"Parent single-column rail did not update actual rows");
  c.check(p.index.getSemanticPreparationDiagnostics().fullBuilds===layoutBuilds,"Layout controls triggered semantic rebuilding");
  record("independent-density-exact-columns-compact-and-minimum-link-spacing",{base:baseLayout,horizontal:horizontalLayout,vertical:verticalLayout,compact:compactLayout,shortLinks,longLinks,columnCases,fullBuildDelta:0});
  // Real editable area frames establish seams independently of sparse scroll-box widths.
  if(!c.plex().classList.contains("is-area-settings-mode")){
    const originalShow=p.showKplexMenuAtMouseEvent;
    p.showKplexMenuAtMouseEvent=function(menu,event){menu.setUseNativeMenu(false);return originalShow.call(this,menu,event)};
    try{await c.click(c.button("app.settingsMenu"));await c.until(()=>Array.from(document.querySelectorAll(".menu-item")).some(item=>item.textContent.includes(p.translator("app.areaSettings"))),"Area settings item missing for seam probe");
      await c.click(Array.from(document.querySelectorAll(".menu-item")).find(item=>item.textContent.includes(p.translator("app.areaSettings"))))
    }finally{p.showKplexMenuAtMouseEvent=originalShow}
  }
  const areas=()=>Object.fromEntries(["parent","left","right","sibling"].map(zone=>{const area=root.querySelector(".kplex-area-"+zone);c.check(area,"Seam area missing: "+zone);return [zone,{left:parseFloat(area.style.left),width:parseFloat(area.style.width)}]}));
  const seams=[];await tab.setControlValue("minLinkLength",18);
  for(const columns of [1,2,3]){
    await setRail("graph.parentColumns",columns);await setRail("graph.horizontalDensity",3);await setRail("graph.childColumns",1);
    const touch=areas(),gapLeft=touch.parent.left-(touch.left.left+touch.left.width),gapRight=touch.right.left-(touch.parent.left+touch.parent.width);
    c.check(Math.abs(gapLeft)<0.1&&Math.abs(gapRight)<0.1,"Density 3 area edges did not touch: "+JSON.stringify({columns,touch,gapLeft,gapRight}));
    await setRail("graph.childColumns",7);const wideChildren=areas();
    c.check(["left","right","sibling"].every(zone=>Math.abs(wideChildren[zone].left-touch[zone].left)<0.1),"Child columns moved lateral areas horizontally");
    await setRail("graph.horizontalDensity",4);const packed=areas(),packedGaps=[packed.parent.left-(packed.left.left+packed.left.width),packed.right.left-(packed.parent.left+packed.parent.width)];
    c.check(packedGaps.every(gap=>gap<=0.1&&gap>=-packed.parent.width*0.05-0.1),"Density 4 overlap exceeded five percent or retained a gap: "+JSON.stringify({columns,packed,packedGaps}));
    seams.push({columns,touch,wideChildren,packed,packedGaps});
  }
  record("parent-1-2-3-weighted-area-seams-child-independent",{seams});
  // Slow native input crosses save debounce and overflow boundaries, exercising real React
  // rerenders while a held pointer remains on each rail. Slider values must track monotonically.
  await setRail("graph.parentColumns",3);await setRail("graph.childColumns",7);
  p.settings.animationSpeed=1;p.index.notify();await c.frames();
  const sweepSamples=[],sweepCamera=root.querySelector(".kplex-camera").style.transform;
  gateWindow.show();gateWindow.focus();app.workspace.setActiveLeaf(c.leaf,{focus:true});
  for(const axis of ["graph.horizontalDensity","graph.verticalDensity"]){
    await setRail(axis,4);const input=layoutRail(axis),r=input.getBoundingClientRect(),y=Math.round(r.top+r.height/2);
    let previous=4;const startX=Math.round(r.right-1);wc.sendInputEvent({type:"mouseMove",x:startX,y});wc.sendInputEvent({type:"mouseDown",x:startX,y,button:"left",clickCount:1});
    try{for(let i=0;i<=14;i++){
      const x=Math.round(r.right-1-(r.width-2)*i/14);wc.sendInputEvent({type:"mouseMove",x,y,modifiers:["leftbuttondown"]});await c.wait(240);await c.frames();
      const value=Number(input.value),nodes=Array.from(root.querySelectorAll(".kplex-thought")),scale=root.querySelector(".kplex-role-center").getBoundingClientRect().height/parseFloat(root.querySelector(".kplex-role-center").style.height);
      const maxAnimations=Math.max(...nodes.map(n=>n.getAnimations().length)),transforms=nodes.map(n=>getComputedStyle(n).transform);
      c.check(value<=previous+0.001,"Slow slider value rolled backwards during publication");previous=value;
      c.check(maxAnimations===0&&transforms.every(t=>t==="none"),"Slider left animation effects or transforms on nodes");
      c.check(nodes.every(n=>{const b=n.getBoundingClientRect();return Number.isFinite(b.left)&&Number.isFinite(b.top)&&Math.abs(b.height/scale-parseFloat(n.style.height))<0.1}),"Slider transiently scaled or invalidated node geometry");
      c.check(root.querySelector(".kplex-camera").style.transform===sweepCamera,"Slow slider moved the camera");
      sweepSamples.push({axis,value,maxAnimations,nodeCount:nodes.length});
    }}finally{wc.sendInputEvent({type:"mouseUp",x:Math.round(r.left+1),y,button:"left",clickCount:1})}
    await c.wait(300);c.check(Number(input.value)===0.75,"Slow native sweep did not reach the minimum");
    c.check(p.getActiveLayoutProfile("leaf")[axis==="graph.horizontalDensity"?"horizontalCompactingFactor":"compactingFactor"]===0.75,"Slow sweep failed latest profile persistence");
  }
  p.settings.animationSpeed=0;p.index.notify();await c.frames();
  record("slow-native-density-sweeps-no-animation-rollback-or-camera-jump",{samples:sweepSamples,fullBuildDelta:p.index.getSemanticPreparationDiagnostics().fullBuilds-layoutBuilds});
  // Typography controls share plugin settings; interleaved drafts cannot revert one another.
  const typographyBefore={baseFontSize:p.settings.baseFontSize,maxWidth:p.settings.baseNodeStyle.maxWidth,wrap:p.settings.wrapNodeLabels};
  await c.go(c.labelCenter);await tab.setControlValue("wrapNodeLabels",false);await tab.setControlValue("baseNodeStyle.maxLabelLength",120);await c.frames();
  const measureTypography=()=>{const node=root.querySelector(".kplex-role-left"),scale=root.querySelector(".kplex-role-center").getBoundingClientRect().height/parseFloat(root.querySelector(".kplex-role-center").style.height);return {font:Number.parseFloat(getComputedStyle(node).fontSize),width:node.getBoundingClientRect().width/scale,height:node.getBoundingClientRect().height/scale}};
  await setRail("settings.ui.maximum.node.width",160);const narrowTypography=measureTypography();
  await setRail("graph.baseFontSize",24);await setRail("settings.ui.maximum.node.width",500);
  const wrapControl=root.querySelector('.kplex-wrap-label-control input');await c.click(wrapControl);await c.wait(300);await c.frames();
  const wideTypography=measureTypography();
  c.check(wideTypography.font>narrowTypography.font&&wideTypography.width>narrowTypography.width&&wideTypography.height>narrowTypography.height,"Typography rails did not change actual font/width/two-line geometry");
  c.check(p.settings.baseFontSize===24&&tab.getControlValue("baseFontSize")===24&&tab.getControlValue("baseNodeStyle.maxWidth")===500&&p.settings.wrapNodeLabels===true,"Plex typography differs from plugin Settings");
  await tab.setControlValue("baseFontSize",16);await c.frames();c.check(Number(layoutRail("graph.baseFontSize").value)===16,"Plugin font setting did not update the Plex rail");
  await p.saveSettings(false);const savedTypography=await p.loadData();c.check(savedTypography.baseFontSize===16&&savedTypography.baseNodeStyle.maxWidth===500&&savedTypography.wrapNodeLabels===true,"Typography settings did not persist");
  c.check(p.index.getSemanticPreparationDiagnostics().fullBuilds===layoutBuilds,"Typography requested a full semantic rebuild");
  record("Plex-font-width-wrap-settings-geometry-and-persistence",{narrow:narrowTypography,wide:wideTypography,globalSettings:true});
  await tab.setControlValue("baseFontSize",typographyBefore.baseFontSize);await tab.setControlValue("baseNodeStyle.maxWidth",typographyBefore.maxWidth);await tab.setControlValue("wrapNodeLabels",typographyBefore.wrap);
  await c.go(c.hub);await c.frames();
  // Return to the established sparse test profile before relationship gestures.
  await setRail("graph.parentColumns",1);await setRail("graph.childColumns",1);
  await setRail("graph.horizontalDensity",2);await setRail("graph.verticalDensity",2);await tab.setControlValue("minLinkLength",18);
`;

/** Certify ordinary neighbor counts on a requested-only scope after existing interaction checks. */
export const gateCountScenarios = `
  await c.go(c.hub);await c.editor(false);
  await tab.setControlValue("renderSiblings",false);await tab.setControlValue("showNeighborCount",true);
  const countBuilds=p.index.getSemanticPreparationDiagnostics().fullBuilds;
  p.index.invalidateSemanticPolicy();await p.index.refreshSemanticSettings();await c.frames();
  const countNodes=[];
  for(const role of ["Parent","Friend","Challenger","Child"]){
    const path=c.folder+"/"+role+"-00.md",page=p.index.get(path),info=p.index.preparedPageInfo.get(page);
    c.check(info&&!info.completeRelations&&info.gates,"Ordinary neighbor lacks separate count-only proof: "+role);
    const node=Array.from(root.querySelectorAll(".kplex-thought")).find(el=>el.dataset.kplexPath===path);
    c.check(node,"Count fixture node missing: "+role);
    const gates=p.index.gateStats(page),counts={};
    for(const side of ["top","bottom","left","right"]){
      const stat=gates[side],text=node.querySelector(".gate-wrap-"+side+" .kplex-gate-count")?.textContent?.trim()??"";
      c.check(stat.complete===true,"Count remains uncertified: "+role+" "+side);
      c.check(!text.includes("…")&&!text.includes("≥"),"Settled ordinary gate retained a placeholder: "+text);
      c.check(stat.visibleCount===0?text==="":text.split("/").pop()===String(stat.visibleCount),"Rendered count differs from certified total: "+role+" "+side+" "+text);
      counts[side]={total:stat.visibleCount,text};
    }
    countNodes.push({role,counts,completeRelations:info.completeRelations});
  }
  c.check(p.index.getSemanticPreparationDiagnostics().fullBuilds===countBuilds,"Gate certification caused a full semantic rebuild");
  record("partial-neighbor-certified-directional-gate-counts",{nodes:countNodes,fullBuildDelta:0});
`;
