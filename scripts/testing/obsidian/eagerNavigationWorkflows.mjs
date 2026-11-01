/** Exact-build eager/event acceptance inside actionWorkflows' backed-up Small-vault controller.
 * Only owned fixtures are mutated. Natural event queues, graph publication and source preparation
 * remain active; no counter is restamped and no production readiness method is replaced.
 */
export async function runEagerNavigationWorkflows(h) {
  const {c,p,check,until,scenario,center,focus,root}=h;
  check(!p.index.isOnDemandMode(), "Eager navigation acceptance requires the test vault's eager strategy");
  check(await p.documentSession(c.host).plexView.requestSelection("classic"), "Compass fixture selection refused");
  const field=p.defaultOntologyField("child"), calendar=[], captures=[];
  c.eagerNavigation={phase:"fixtures",captures};
  const create=async(name,body="")=>{
    const file=await app.vault.create(`${c.folder}/${name}.md`,body);c.owned.push(file.path);
    await until(()=>app.metadataCache.getFileCache(file),`Fixture metadata missing: ${name}`);
    return file;
  };
  const metadata=(targets)=>`---\n${JSON.stringify(field)}: ${JSON.stringify(targets.map(path=>`[[${path}]]`))}\nSentinel: keep\n---\n`;
  const passive=()=>{
    const source=p.index.sourceAcquisition.getActivityState();
    return !p.index.building&&!p.rebuildTask&&p.rebuildTimer===null&&!p.indexDirty
      &&!source.sourceActive&&!source.knownImpactTasks&&!source.pendingKnown&&!p.index.eagerGraphMaintenanceTask;
  };
  const globallyReady=()=>{
    c.eagerNavigation.status={source:p.index.sourceAcquisition.getActivityState(),sourceReady:p.index.sourceAcquisition.hasSemanticDependencies(),
      pendingGraphOwners:p.index.sourceAcquisition.pendingGraphSources()?.size??0,building:p.index.building,indexDirty:p.indexDirty,
      rebuildScheduled:p.rebuildTimer!==null,policy:[p.index.fullSemanticPolicyRevision,p.index.semanticPolicyRevision],
      maintenance:[p.index.fullSemanticMaintenanceRevision,p.index.sourceAcquisition.getMaintenanceRevision()],
      sourceEpoch:[p.index.fullSemanticSourceRevision,p.getIndexSourceRevision()],coverage:p.index.publicApiCoverage()};
    return passive()&&c.eagerNavigation.status.sourceReady&&c.eagerNavigation.status.coverage.scope==="global"&&p.getIndexDiagnosticsStatus().upToDate;
  };
  const settle=async()=>until(globallyReady,"Eager graph did not regain global authority after native events",90000);
  const sourceCounters=()=>p.index.sourceAcquisition.getCounters();
  const addCapture=(label,before,started)=>{
    const after=sourceCounters(),current=p.index.getSemanticPreparationDiagnostics();
    check(current.requested===before.requested,"Navigation reconstructed an already-indexed center");
    check(current.dependencyVisits===before.dependencyVisits,"Navigation replayed source families");
    check(after.vaultReads===before.source.vaultReads&&after.parses===before.source.parses,"Navigation read or parsed a note body");
    captures.push({label,elapsedMs:performance.now()-started,sourceReads:after.vaultReads-before.source.vaultReads,
      parses:after.parses-before.source.parses,familyVisits:current.dependencyVisits-before.dependencyVisits});
  };
  c.acceptedWrites=new Set();

  for(let i=0;i<7;i++)calendar.push(await create(`Calendar-${i}`,metadata(i<6?[`${c.folder}/Calendar-${i+1}.md`]:[])));
  const targets=[];
  for(let i=0;i<24;i++)targets.push(await create(`Hub-member-${i}`));
  await create("Hub",metadata([calendar[3].path,...targets.map(file=>file.path)]));
  const mutation=await create("Mutation-source"),canvasSource=await create("Canvas-source"),canvasTarget=await create("Canvas-target");
  // Establish a complete eager baseline once. Subsequent event assertions forbid another full build.
  await until(()=>passive(),"Fixture creation backlog did not settle",90000);
  check(await p.index.rebuild(),"Complete eager fixture build refused");await settle();
  const fullBuilds=p.index.getSemanticPreparationDiagnostics().fullBuilds;

  await scenario("eager-native-event-backlog-and-unvisited-calendar-navigation",async()=>{
    c.eagerNavigation.phase="native-events";
    const created=await create("Native-created");
    await app.fileManager.processFrontMatter(mutation,fm=>{fm[field]=[`[[${created.path}]]`];});
    await settle();
    check(p.index.neighbours(p.index.get(mutation.path),"child").some(row=>row.page.path===created.path),"Native property edit missing from canonical graph");
    await app.vault.delete(created);await settle();
    check(!app.vault.getFileByPath(created.path)&&!p.index.get(created.path)?.file,"Deleted target was rematerialized");
    check(p.index.neighbours(p.index.get(mutation.path),"child").some(row=>row.page.path===created.path),"Delete lost the surviving unresolved declaration");
    await center(calendar[6].path);focus(c.host);
    c.eagerNavigation.phase="calendar-navigation";
    for(let i=5;i>=0;i--){
      const node=[...root(c.host).querySelectorAll(".kplex-role-parent")].find(element=>element.dataset.kplexPath===calendar[i].path);
      check(node,"Expected indexed calendar parent missing");
      const before={...p.index.getSemanticPreparationDiagnostics(),source:sourceCounters()},started=performance.now();
      node.click();
      await until(()=>root(c.host).querySelector(".kplex-role-center")?.dataset.kplexPath===calendar[i].path
        &&p.index.viewScopeCoverage(calendar[i].path).complete,"Indexed calendar destination did not render");
      addCapture(`calendar-${i}`,before,started);
    }
    check(p.index.getSemanticPreparationDiagnostics().fullBuilds===fullBuilds,"Ordinary native events started a full rebuild");
    return {captures:[...captures],createModifyDelete:true,globalCoverage:p.index.publicApiCoverage(),fullBuilds};
  });

  await scenario("eager-canvas-mutation-reconciles-later-native-events",async()=>{
    c.eagerNavigation.phase="canvas-mutation";
    await center(canvasSource.path);focus(c.host);
    const writing=p.createRelationToPage(p.index.get(canvasSource.path),"child",p.index.get(canvasTarget.path),field);
    c.acceptedWrites.add(writing);let outcome;
    try {outcome=await writing;} finally {c.acceptedWrites.delete(writing);}
    check(outcome.state==="saved-published"||outcome.state==="saved-pending","Canvas relationship did not save");
    check(JSON.stringify(app.metadataCache.getFileCache(canvasSource)?.frontmatter?.[field]??[]).includes(canvasTarget.basename),"Canvas mutation is absent from native metadata");
    await settle();
    check(p.index.neighbours(p.index.get(canvasSource.path),"child").some(row=>row.page.path===canvasTarget.path),"Native event reconciliation lost the canvas relationship");
    const before={...p.index.getSemanticPreparationDiagnostics(),source:sourceCounters()},started=performance.now();
    await center(calendar[3].path);addCapture("after-canvas-mutation",before,started);
    check(p.index.getSemanticPreparationDiagnostics().fullBuilds===fullBuilds,"Canvas catch-up started a full rebuild");
    return {state:outcome.state,capture:captures.at(-1),globalCoverage:p.index.publicApiCoverage()};
  });
  c.eagerNavigation.phase="complete";
  return {scenarios:c.scenarios};
}
