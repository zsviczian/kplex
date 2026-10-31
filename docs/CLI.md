# Use K-Plex through Obsidian CLI

Obsidian CLI `eval` calls the [public K-Plex API](PUBLIC_API.md) inside the running application. Enable and register Obsidian's CLI using [Obsidian's official setup](https://help.obsidian.md/cli), keep the intended vault open, and address that vault explicitly. K-Plex does not register parameterized `obsidian kplex:*` commands or ship a separate executable wrapper.

Draft PR #240 passes complete repository verification and exact-build Windows CLI acceptance. The [validation record](validation/public-api-cli-240-2026-10-30.md) records the results and remaining macOS, minimum-host and physical-device limits. The PR remains draft and unmerged.

First verify the destination:

```sh
obsidian vault=kplex-test-small vault info=path
```

On Windows, use the console launcher `Obsidian.com` to capture output. Its usual location is `C:\Program Files\Obsidian\Obsidian.com`. Use an existing disposable vault for mutation probes; the contributor [Desktop CLI setup](../CONTRIBUTING.md#desktop-cli-setup-windows-and-macos) documents K-Plex's prepared test vaults and strict drivers.

## Direct read examples

These shell examples use POSIX quoting. The argument-array example below avoids PowerShell's embedded-quote handling.

```sh
obsidian vault=kplex-test-small eval \
  'code=JSON.stringify(app.plugins.plugins["k-plex"].api.v1.capabilities())'

obsidian vault=kplex-test-small eval \
  'code=JSON.stringify(app.plugins.plugins["k-plex"].api.v1.ontology())'

obsidian vault=kplex-test-small eval \
  'code=JSON.stringify(app.plugins.plugins["k-plex"].api.v1.status())'

obsidian vault=kplex-test-small eval \
  'code=JSON.stringify(app.plugins.plugins["k-plex"].api.v1.canvases())'
```

Use a returned canvas ID for subsequent calls:

```sh
obsidian vault=kplex-test-small eval \
  'code=JSON.stringify(app.plugins.plugins["k-plex"].api.v1.canvas({canvasId:"RETURNED_ID"}))'
```

For a current committed Mind Map, return its Markdown through the same shared exporter as the
native dialog. This operation returns bytes and warnings without copying or saving a file:

```sh
obsidian vault=kplex-test-small eval \
  'code=JSON.stringify(app.plugins.plugins["k-plex"].api.v1.exportMarkdown({canvasId:"RETURNED_ID"}))'

obsidian vault=kplex-test-small eval \
  'code=JSON.stringify(app.plugins.plugins["k-plex"].api.v1.exportMarkdown({canvasId:"RETURNED_ID",subtreeOccurrenceId:"RETURNED_OCCURRENCE_ID"}))'
```

Inspect `value.markdown`, `value.warnings`, `value.canvasId` and `value.canvasRevision`. An occurrence
ID identifies one visual branch, including when the same note appears more than once. Offscreen
constructed rows remain eligible; current filters and folds constrain scope. An API output limit
can reject a large export. `capabilities()` advertises Mind Map Markdown through merged PR #237;
image export through the API remains unavailable. Merged PR #238 supplies native PNG controls;
this version does not expose those controls through the API.

For strict export, pass `requireComplete:true` in the same options object. Incomplete indexed
coverage or omitted/partial formatter content fails explicitly; intentional collapsed branches
remain scoped out and are reported separately. The response's `revision.canvas` matches the
captured canvas revision. A stale frame fails rather than exporting from a different canvas or
silently rebuilding it.

GraphQL variables are ordinary JSON data:

```sh
obsidian vault=kplex-test-small eval \
  'code=JSON.stringify(app.plugins.plugins["k-plex"].api.v1.query({query:"query Find($q: String!) { search(query: $q, limit: 10) { items { id name kind } truncated coverage { scope complete } } }",variables:{q:"project"},operationName:"Find"}))'
```

Inspect `ok`, `coverage` and `truncated`. For GraphQL also inspect `value.errors`: a successful transport envelope can contain field errors. `requireComplete: true` applies to each requested read's scope and fails explicitly when that required coverage is unavailable; configured ontology remains readable before graph completion. It does not wait for or initiate indexing. Partial empty results do not establish that the vault contains no match.

## Reliable argument arrays and machine output

For automation, pass arguments as an array, bound the process duration/output, and parse the returned JSON envelope. For example, save the following as a local `.mjs` script and run it with Node:

```js
import {spawnSync} from "node:child_process";

const executable = process.env.KPLEX_OBSIDIAN_CLI ??
  (process.platform === "win32"
    ? "C:\\Program Files\\Obsidian\\Obsidian.com"
    : "obsidian");
const code = `JSON.stringify((()=>{
  const api=app.plugins.plugins["k-plex"]?.api?.v1;
  return api?api.ontology():{
    ok:false,error:{code:"API_UNAVAILABLE",message:"K-Plex API v1 is unavailable"}
  };
})())`.replace(/\s*\n\s*/g, " ");
const processResult = spawnSync(executable,
  ["vault=kplex-test-small", "eval", `code=${code}`],
  {encoding:"utf8", timeout:30_000, killSignal:"SIGKILL", maxBuffer:4*1024*1024});
if (processResult.error || processResult.status !== 0 || /^Error:/m.test(processResult.stdout)) {
  throw processResult.error ?? new Error(processResult.stderr || processResult.stdout);
}
const result = JSON.parse(processResult.stdout.trim().replace(/^=>\s*/, ""));
process.stdout.write(JSON.stringify(result) + "\n");
if (!result.ok) process.exitCode = 1;
```

The CLI can print `Error:` with process exit code zero; check the payload as well as the status. Keep simple eval strings short and on one line. K-Plex repository drivers use [`spawnNativeSync()`](../scripts/testing/obsidian/processTools.mjs) for bounded long/multiline Windows eval transport through an owned temporary local script. A timeout does not prove a requested action failed before saving; reacquire the API and read back the relevant canvas/configuration before retrying.

## Explicit actions and configuration readback

Navigation and selection are asynchronous. Await them before serializing the result:

```js
// Code passed to Obsidian CLI eval:
(async () => {
  const api = app.plugins.plugins["k-plex"].api.v1;
  const action = await api.navigate({canvasId: "RETURNED_ID", path: "Existing note.md"});
  return JSON.stringify({action, canvas: api.canvas({canvasId: "RETURNED_ID"})});
})()
```

Supply explicit canvas IDs with simultaneous canvases. An `accepted` action may still have a pending native transition or scene. Check the desired attention/root/view/preset in a fresh snapshot and poll bounded synchronous reads when final scene admission matters. A `completed` receipt observes the requested metadata, not actual paint. Compare snapshot semantic/source/configuration stamps with the envelope and respect `scenePending` and `motionPending`. Do not leave CLI eval awaiting an indexing promise.

Portable configuration follows the same deliberate preview/apply workflow as the native UI:

```js
const api = app.plugins.plugins["k-plex"].api.v1;
const validation = api.configuration.validate(packageJson);
const preview = api.configuration.preview(packageJson, {
  targetId: "reviewed-copy", replace: false, lensIds: [], replacePalette: [],
});
// Return preview as JSON, inspect its exact package/choices/privacy, then issue a second eval:
await api.configuration.apply({previewId: "RETURNED_PREVIEW_ID", confirm: true});
```

Preview tokens last five minutes, are limited to 16 per API instance, and are consumed by apply. The second eval must use the same loaded plugin instance; reload invalidates the token. Replacement/dependencies/palette decisions are explicit and imported lenses stay disabled. An apply receipt contains exact target readback, `verified` and `refreshPending`. A saved receipt with pending refresh is already durable; read back before deciding whether another operation is needed. On failure, make a fresh preview rather than replaying a consumed token. See [Portable configuration](PUBLIC_API.md#portable-configuration) for the complete contract.

CLI eval inherits the caller's Obsidian privileges. These examples add no server, remote connection, telemetry or new indexing pass. They use the same public API available to local scripts and plugins.
