# Live index recovery observation

Read-only investigation of Zsolt's Brain on Windows and the maintainer's Mac
diagnostic generated at 2026-11-04 15:11:32 Europe/Budapest. No production notes,
settings, index demand or navigation were changed by diagnostic probes. Thermal
and CPU samples are not included; sustained work is evidence, temperature is the
maintainer's observation.

## Mac: recovery churn and missing foreground completion

Obsidian 1.15.1, K-Plex 0.4.1, Eager/Responsive. The graph reports 110,852 nodes,
11,988 Markdown files and an authoritative publication, while status is updating.
These are different facts: a usable compiled graph exists, but current source
maintenance has not settled.

- Cache hydration was superseded during page publication: expected publication 1,
  actual 13, cause file-patch; 9,404 pages had been processed. The strict fence
  correctly refuses to overwrite newer edits, but recovery fell back to a full
  rebuild at 14:54:09. A completed snapshot save followed at 14:55:57.
- The current session reports five source inventory passes, four cancelled passes,
  one full build, 1,803 checked owners, 1,795 repairs, 74 body reads/72 parses,
  7,146 cache chunks and 17,924,748 cache bytes written. This is chiefly derived
  cache/source work, not repeatedly reading all 11,988 Markdown files.
- At capture, 2,152 known changes were queued, with one background source job and
  one repository writer. Current-node, visible-neighborhood and gate/scope tasks
  were all zero. One center was demanded; five semantic preparation attempts had
  ended pending, with zero prepared/published local scopes. Those pending counters
  are cumulative outcomes, not five live jobs.
- An active global inventory had run about 7 minutes 44 seconds, selected because
  local authority was unavailable. Earlier inventories were cancelled after about
  4:18, 1:21, less than a second and 5:29. Elapsed times include waiting and do not
  establish CPU utilization.
- A later complete snapshot save failed at 15:09:10 after about 20 seconds. The
  report does not contain the underlying exception, so quota, transaction and
  connection failures cannot be distinguished. The 533 repository read-failure
  observations are not proof of 533 corrupt files; the latest recorded reason is
  cancelled and family failures are counted separately.

The priority defect is a dependency-admission gap, not proof that the scheduler
ran background work ahead of an active foreground lease. The cached neighborhood
reader returns dependency-pending when local contributor discovery is unavailable;
the foreground promise retires. A background inventory may then be the only work
able to restore authority. A priority number alone cannot fix a retired request.
The remaining fix needs resumable/coalesced recovery, a live demanded-center repair
path and classified persistence failures, preserving source/identity/publication
fences. It must not simply mark partial counts complete or accept a stale snapshot.

## Windows live observations

Obsidian 1.14.5. At 15:10:02, all 11,829 Markdown files were ready and no jobs were
active. At 15:11:20, a background source job was active, source dependency authority
was unavailable, and the current center had cached but incomplete coverage with
no foreground scope/gate task. Its displayed gates had no ellipsis at that sample;
the specific friend-gate ellipsis reported earlier was not captured live.

The latest retained file patch at 15:06:06 affected one note. An earlier startup
recovery at 13:52:45 detected a stale snapshot and one added/three removed folders;
it eventually processed a catch-up batch of 11,828 notes. The retained completed
environment-validation pass took about 2:19 and checked 45 owners, without body
reads/parses. This demonstrates repeated source maintenance, but does not identify
Sync as the producer of any particular event.

## Scope and limits

The Mac and Windows traces both show source recovery outliving a graph publication
and lacking a completed active-center preparation. Sync activity is a plausible
source of superseding file events, not established by these diagnostics. The
report does not prove the UI styling follow-up caused the indexing behavior.
No indexing implementation change was made during this investigation. CTA/Pins
fixes and their deployment are recorded separately in the
[UI follow-up](cta-pins-follow-up-278-2026-11-04.md).
