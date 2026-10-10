/**
 * Native UX scenario fragment for external area drops and pinned fixed endpoints.
 * The serial UX driver supplies its existing controller, composer helpers and trusted pointer
 * injector. Fixtures belong to the driver's disposable folder; canonical Markdown patches and
 * MetadataCache settlement prepare only these notes. No index rebuild or native launch occurs here.
 */

/** Embed after the main driver's composer/pointer helpers, while its fixture view is still alive. */
export const relationshipEnhancementScenarios = `
  {
    const roles=["parent","child","left","right"],sideFor={parent:"top",child:"bottom",left:"left",right:"right"};
    const fieldsFor={parent:"parents",child:"children",left:"leftFriends",right:"rightFriends"};
    const originalPins=[...p.settings.pinnedNodes],originalDrag=app.dragManager.draggable;
    const originalMenuPresenter=p.showKplexMenuAtPosition;
    const areaPaths={},pinPaths={},newPaths=[];
    /** Create and register only a test-owned note before incremental source replacement. */
    const createEnhancementNote=async(name)=>{
      const path=c.folder+"/"+name+".md";
      c.check(!app.vault.getFileByPath(path),"Relationship fixture already exists: "+path);
      const file=await app.vault.create(path,"# "+name+"\\n");c.owned.push(path);newPaths.push(path);
      // Incremental Markdown patches replace existing endpoints. In an on-demand session an
      // unrelated new note is not automatically materialized; register this owned creation
      // through the same optimistic endpoint API used by the driver's initial fixture.
      p.index.insertCreatedFile(file);return file.path;
    };
    for(const role of roles){areaPaths[role]=await createEnhancementNote("Area-"+role);pinPaths[role]=await createEnhancementNote("Pinned-"+role)}
    const centerDropPath=await createEnhancementNote("Drop-center"),bodyPath=await createEnhancementNote("Pinned-body");
    await c.until(()=>newPaths.every(path=>app.metadataCache.getFileCache(app.vault.getFileByPath(path))),"Relationship fixture metadata did not settle");
    // Create events may retire a source patch while the visible scope catches up. Join the
    // existing owner and retry only its pending paths after a proven competing generation.
    c.enhancementPatchAttempts=[];let enhancementPending=[...newPaths];
    const enhancementPatchDeadline=Date.now()+180000;
    while(enhancementPending.length){
      await c.until(()=>!p.index.building&&!p.index.hasActiveSemanticPreparation(),"Relationship fixture owner did not settle",Math.max(1,enhancementPatchDeadline-Date.now()));
      c.check(Date.now()<enhancementPatchDeadline&&c.enhancementPatchAttempts.length<16,"Owned relationship source patches did not converge");
      const generationBefore=p.index.generation,sourceBefore=p.getIndexSourceRevision();
      const enhancementPatch=await p.index.patchMarkdownPaths(enhancementPending);
      const generationAfter=p.index.generation,sourceAfter=p.getIndexSourceRevision();
      c.enhancementPatchAttempts.push({result:enhancementPatch,generationBefore,generationAfter,sourceBefore,sourceAfter});
      if(enhancementPatch.outcome==="patched")break;
      c.check(enhancementPatch.outcome==="cancelled"&&(generationAfter!==generationBefore+1||sourceBefore!==sourceAfter),"Owned relationship patch failed without observed retirement: "+JSON.stringify(c.enhancementPatchAttempts));
      enhancementPending=enhancementPatch.pendingPaths??enhancementPending;
    }
    await c.until(()=>newPaths.every(path=>p.index.get(path)?.file===app.vault.getFileByPath(path)),"Owned relationship endpoints were not patched");
    const doc=root.ownerDocument,view=doc.defaultView;
    const cancelEnhancementComposer=async()=>{
      for(let attempt=0;attempt<2&&modal();attempt++){wc.sendInputEvent({type:"keyDown",keyCode:"Escape"});wc.sendInputEvent({type:"keyUp",keyCode:"Escape"});await c.frames()}
      c.check(!modal(),"Enhancement composer did not cancel");
    };
    // A saved pair can precede optional current-view P3 publication. Await tracked owners rather
    // than treating primary-ready or a single animation frame as quiescence or changing the production pair-admission fence.
    const settleEnhancementView=async()=>{
      let quiet=0;
      for(let attempt=0;attempt<30;attempt++){
        await p.index.workScheduler.checkpoint(4);
        const revision=p.index.publicationRevision,source=p.getIndexSourceRevision(),maintenance=p.index.sourceAcquisition.getMaintenanceRevision();
        await c.wait(100);await c.frames();await p.index.workScheduler.checkpoint(4);
        const stable=!p.index.hasPendingSemanticPreparation()&&revision===p.index.publicationRevision&&source===p.getIndexSourceRevision()&&maintenance===p.index.sourceAcquisition.getMaintenanceRevision();
        quiet=stable?quiet+1:0;if(quiet===3)return;
      }
      throw new Error("Current-view publication did not settle before enhancement commit");
    };
    const commitEnhancement=async(path,role)=>{
      await c.until(()=>modal()&&linkButton()&&!linkButton().disabled,"Fixed endpoint composer did not become linkable: "+role);
      const selected=modal().querySelector(".kplex-add-related-note-search input");
      c.check(selected.value===p.index.titleFor(p.index.get(path)),"Composer lost fixed dropped/pinned endpoint");
      const field=modal().querySelector(".kplex-add-related-ontology-search input").value;
      c.check(p.settings.hierarchy[fieldsFor[role]].some(value=>value.toLowerCase()===field.toLowerCase()),"Composer default field does not belong to expected role: "+role);
      await settleEnhancementView();
      linkButton().click();await c.until(()=>!modal(),"Enhancement Link did not close after commit: "+role,30000);
      await linked(path,field);
      c.check(p.index.neighbours(p.index.get(c.hub),role).some(item=>item.page.path===path),"Canonical published role disagrees with enhancement drop: "+role);
      await settleEnhancementView();
      return field;
    };
    // The host payload is real; synthetic DOM DragEvents exercise the actual mounted handlers.
    // This is File Explorer routing evidence, not a claim of trusted OS drag delivery.
    const dropExplorerNote=async(path,point,role="center")=>{
      const hit=doc.elementFromPoint(point.x,point.y);
      c.check(hit&&c.plex().contains(hit),"File-drop point is outside the visible Plex");
      app.dragManager.draggable={type:"file",file:app.vault.getFileByPath(path)};
      const transfer=new view.DataTransfer();
      hit.dispatchEvent(new view.DragEvent("dragover",{bubbles:true,cancelable:true,clientX:point.x,clientY:point.y,dataTransfer:transfer}));
      await c.frames();
      const preview=root.querySelector(role==="center"?".is-navigation-drop-target":".is-relationship-drop-area");
      c.check(preview?.classList.contains(role==="center"?"kplex-center-drop-preview":"kplex-area-"+role),"External drop area feedback disagrees with routing: "+role);
      if(preview){const style=view.getComputedStyle(preview);c.check(style.pointerEvents==="none"&&Number(style.zIndex)>=19&&preview.parentElement===c.plex()&&view.getComputedStyle(preview,"::before").opacity==="0.08"&&style.borderTopWidth==="2px","Drop feedback is not a translucent viewport overlay")}
      hit.dispatchEvent(new view.DragEvent("drop",{bubbles:true,cancelable:true,clientX:point.x,clientY:point.y,dataTransfer:transfer}));
      await c.frames();
      c.check(!root.querySelector(".is-relationship-drop-area,.is-navigation-drop-target"),"External drop retained area feedback");
      return {point,hitClass:hit.getAttribute("class"),dropEffect:transfer.dropEffect,previewRole:role};
    };
    // Use actual rendered semantic frame bounds. Admit only exposed empty pixels exclusive to
    // that role; this avoids guessing quadrants or accidentally dropping on an unrelated node.
    const emptyEnhancementAreaPoint=(role)=>{
      const plex=c.plex().getBoundingClientRect(),frames=roles.map(key=>({key,rect:root.querySelector(".kplex-area-"+key)?.getBoundingClientRect()}));
      const area=frames.find(frame=>frame.key===role)?.rect;c.check(area?.width>0&&area.height>0,"Rendered relationship area missing: "+role);
      const inside=(rect,x,y)=>rect&&x>rect.left&&x<rect.right&&y>rect.top&&y<rect.bottom;
      for(let row=1;row<16;row++)for(let column=1;column<16;column++){
        const x=Math.round(area.left+area.width*column/16),y=Math.round(area.top+area.height*row/16),hit=doc.elementFromPoint(x,y);
        if(!inside(plex,x,y)||!inside(area,x,y)||!hit||!c.plex().contains(hit))continue;
        if(frames.some(frame=>frame.key!==role&&inside(frame.rect,x,y)))continue;
        if(hit.closest(".kplex-thought,.kplex-edge-hit,[data-kplex-gate],[data-kplex-path],.kplex-expanded-cluster,.kplex-zone-tools,.kplex-layout-controls,.kplex-zoom-controls,.kplex-find,input,select,textarea,button"))continue;
        return {x,y,area:{left:area.left,top:area.top,width:area.width,height:area.height}};
      }
      throw new Error("No exposed exclusive empty pixels in semantic area: "+role);
    };
    try {
      await c.go(c.hub);await c.editor(false);c.button("graph.fitGraph").click();await c.frames();
      // Cancellation/outside delivery retires feedback without opening a composer or consuming host events.
      const previewPoint=emptyEnhancementAreaPoint("parent"),previewHit=doc.elementFromPoint(previewPoint.x,previewPoint.y);
      app.dragManager.draggable={type:"file",file:app.vault.getFileByPath(areaPaths.parent)};
      const previewEvent=(type,point=previewPoint)=>new view.DragEvent(type,{bubbles:true,cancelable:true,clientX:point.x,clientY:point.y,dataTransfer:new view.DataTransfer()});
      for(const finish of ["dragend","outside-dragover","outside-drop","blur","dragleave"]){
        previewHit.dispatchEvent(previewEvent("dragover"));await c.frames();
        c.check(root.querySelector(".kplex-area-parent.is-relationship-drop-area"),"Lifecycle fixture did not highlight parent");
        const e=finish==="blur"?new view.Event("blur"):previewEvent(finish==="outside-dragover"?"dragover":finish==="outside-drop"?"drop":finish, {x:-1,y:-1});
        (finish==="blur"?view:finish==="dragleave"?c.plex():doc.body).dispatchEvent(e);await c.frames();
        c.check(!root.querySelector(".is-relationship-drop-area,.is-navigation-drop-target")&&!modal(),"Feedback survived lifecycle boundary: "+finish);
        c.check(!e.defaultPrevented,"Feedback cleanup consumed host event: "+finish);
      }
      record("external-area-preview-lifecycle",{boundaries:5});
      const central=root.querySelector(".kplex-role-center"),centralRect=central.getBoundingClientRect();
      const centerPoint={x:Math.round(centralRect.left+centralRect.width/2),y:Math.round(centralRect.top+centralRect.height/2)};
      c.check(doc.elementFromPoint(centerPoint.x,centerPoint.y)?.closest(".kplex-role-center")===central,"Center drop must hit the actual center");
      const centerDrop=await dropExplorerNote(centerDropPath,centerPoint);
      await c.until(()=>c.center()===centerDropPath,"Actual center file drop did not navigate");c.check(!modal(),"Actual center drop opened a relationship composer");
      record("external-file-actual-center-navigates",{path:centerDropPath,...centerDrop});
      for(const role of roles){
        await c.go(c.hub);c.button("graph.fitGraph").click();await c.frames();
        const point=emptyEnhancementAreaPoint(role),drop=await dropExplorerNote(areaPaths[role],point,role);
        c.check(c.center()===c.hub,"Area file drop navigated away from its origin");
        const field=await commitEnhancement(areaPaths[role],role);
        record("external-file-empty-area-commit-"+role,{field,path:areaPaths[role],...drop});
      }
      app.dragManager.draggable=originalDrag;
      // Pin through the production setting owner so the mounted App exposes genuine chip targets.
      for(const path of [...Object.values(pinPaths),bodyPath,c.hub])if(!p.isPinned(path))await p.togglePinned(path);
      await c.until(()=>Object.values(pinPaths).every(path=>Array.from(root.querySelectorAll("[data-kplex-pinned-path]")).some(button=>button.dataset.kplexPinnedPath===path)),"Pinned fixture buttons did not render");
      const pinButton=(path)=>Array.from(root.querySelectorAll("[data-kplex-pinned-path]")).find(button=>button.dataset.kplexPinnedPath===path);
      const exposedPinPoint=async(button)=>{
        c.check(button,"Pinned gesture target is missing");button.scrollIntoView({block:"nearest",inline:"center"});await c.frames();
        const rect=button.getBoundingClientRect(),point={x:Math.round(rect.left+rect.width/2),y:Math.round(rect.top+rect.height/2)};
        c.check(doc.elementFromPoint(point.x,point.y)?.closest("[data-kplex-pinned-path]")===button,"Trusted pinned gesture target is clipped or covered");return point;
      };
      for(const role of roles){
        await c.go(c.hub);c.button("graph.fitGraph").click();await c.frames();
        const button=pinButton(pinPaths[role]);await dragGate(await exposedPinPoint(button),sideFor[role],button);
        const field=await commitEnhancement(pinPaths[role],role);
        record("gate-to-pinned-fixed-commit-"+role,{field,path:pinPaths[role]});
      }
      // A body drag supplies its own note origin; the shared DOM chooser keeps the pinned target fixed.
      p.showKplexMenuAtPosition=function(menu,point,owner){menu.setUseNativeMenu(false);return originalMenuPresenter.call(this,menu,point,owner)};
      await c.go(c.hub);c.button("graph.fitGraph").click();await c.frames();
      const bodyTarget=pinButton(bodyPath);bodyTarget.scrollIntoView({block:"nearest",inline:"center"});await c.frames();
      const bodyOrigin=Array.from(root.querySelectorAll(".kplex-thought.kplex-role-parent")).find(node=>{
        const rect=node.getBoundingClientRect(),hit=doc.elementFromPoint(rect.left+rect.width/2,rect.top+rect.height/2);
        return hit?.closest(".kplex-thought")===node&&!hit.closest("[data-kplex-gate],button");
      });c.check(bodyOrigin,"Pinned body gesture needs an exposed parent note");
      const bodyOriginPath=bodyOrigin.dataset.kplexPath,bodyFile=app.vault.getFileByPath(bodyOriginPath),beforeBody=await app.vault.read(bodyFile),beforeTarget=await app.vault.read(app.vault.getFileByPath(bodyPath));
      const a=bodyOrigin.getBoundingClientRect(),b=bodyTarget.getBoundingClientRect(),x=Math.round(a.left+a.width/2),y=Math.round(a.top+a.height/2),tx=Math.round(b.left+b.width/2),ty=Math.round(b.top+b.height/2);
      wc.sendInputEvent({type:"mouseMove",x,y});wc.sendInputEvent({type:"mouseDown",x,y,button:"left",clickCount:1});await c.frames();
      for(let step=1;step<=5;step++){wc.sendInputEvent({type:"mouseMove",x:Math.round(x+(tx-x)*step/5),y:Math.round(y+(ty-y)*step/5),modifiers:["leftbuttondown"]});await c.frames()}
      c.check(bodyTarget.classList.contains("is-relationship-drop-target"),"Pinned body target did not highlight");
      wc.sendInputEvent({type:"mouseUp",x:tx,y:ty,button:"left",clickCount:1});await c.frames();
      await c.until(()=>doc.querySelector(".menu .menu-item"),"Pinned body drop did not open role chooser");
      const items=Array.from(doc.querySelectorAll(".menu .menu-item")),roleLabels=["role.parent","role.child","role.friend","role.challenger"].map(key=>p.translator(key));
      c.check(roleLabels.every(label=>items.some(item=>item.textContent.includes(label))),"Unrelated pinned endpoint lacks one of four body roles");
      items.find(item=>item.textContent.includes(p.translator("role.friend"))).click();await c.until(()=>modal(),"Pinned body chooser did not open composer");
      c.check(modal().querySelector(".kplex-add-related-note-search input").value===p.index.titleFor(p.index.get(bodyPath)),"Body chooser lost pinned fixed endpoint");
      await cancelEnhancementComposer();
      c.check(await app.vault.read(bodyFile)===beforeBody&&await app.vault.read(app.vault.getFileByPath(bodyPath))===beforeTarget,"Cancelled pinned body composition changed a note");
      c.check(!bodyTarget.classList.contains("is-relationship-drop-target"),"Cancelled pinned body gesture retained highlight");
      record("body-to-pinned-four-role-chooser-cancel-preserves-source",{origin:bodyOriginPath,target:bodyPath});
      const beforeReject=await app.vault.read(app.vault.getFileByPath(c.hub));
      for(const [kind,path,side]of [["self",c.hub,"top"],["duplicate",pinPaths.parent,"top"]]){
        const button=pinButton(path);await dragGate(await exposedPinPoint(button),side);
        c.check(!modal()&&!button.classList.contains("is-relationship-drop-target"),"Rejected pinned "+kind+" opened a composer or retained hover");
        c.check(await app.vault.read(app.vault.getFileByPath(c.hub))===beforeReject,"Rejected pinned "+kind+" changed origin source");record("gate-to-pinned-reject-"+kind);
      }
      const folderPath="folder:"+c.folder;c.check(p.index.get(folderPath)?.isFolder,"Owned fixture folder endpoint missing");
      if(!p.isPinned(folderPath))await p.togglePinned(folderPath);await c.until(()=>pinButton(folderPath),"Structural pinned fixture did not render");
      const structural=pinButton(folderPath);await dragGate(await exposedPinPoint(structural),"left");
      c.check(!modal()&&!structural.classList.contains("is-relationship-drop-target"),"Structural pinned endpoint was admitted");
      c.check(await app.vault.read(app.vault.getFileByPath(c.hub))===beforeReject,"Structural rejection changed origin source");record("gate-to-pinned-reject-structural-folder");
    } finally {
      app.dragManager.draggable=originalDrag;p.showKplexMenuAtPosition=originalMenuPresenter;p.dismissKplexMenu();
      p.settings.pinnedNodes=originalPins;await p.saveSettings(false,false);p.index.notify();
    }
  }
`;
