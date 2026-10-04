# SI4 historical-lease correction and host-resolution probe

The returned SI4b1 S2b correction remains **uncommitted and unaccepted as an SI4 checkpoint**. It repairs a historical-reader lease fault but does not provide a scalable changed-host contributor proof or route settings changes through cached facts. C15–C26 refactoring remains paused.

## Independent validation

The actual checkout was `indexing-optimization-v2` at `140398f55cc24aea17166b361c09a83fa96fd7dc` plus the uncommitted S2b return and lease correction. Required Node 22.22.3, real installed dependencies, macOS Chromium and Obsidian were used.

| Check | Result |
| --- | --- |
| `npm run verify` | Architecture, restricted core (60/60) and official Obsidian lint passed. It stopped at the existing strict URL-heavy timer assertion, measured at 70.3 ms. A focused rerun also stopped there at 63.2 ms; no threshold or golden was changed. |
| `npm run test:sources` | 81/81 passed. |
| `npm run test:sources:browser` | 55/55 passed in real Chromium, including quota/abort, retained/retried leases, active foreign pins, escaped page capabilities, deletion-abort and database-version cases. |
| `npm run build` | Real TypeScript and production esbuild passed. `dist/main.js` SHA-256 `d9debf8f0ac229626172634c02118ac710610ccd1bd222b6dcea341ec994be74`. |
| Exact-build desktop smoke | That artifact and the matching manifest/CSS were staged in disposable `kplex-test`. The K-Plex command registered and executed, one `.kplex-app` rendered, and Obsidian reported no captured JavaScript errors. The strict `verify:obsidian` wrapper did not pass: aggregate `verify` is blocked by the timer assertion, and a separate scripted smoke run was interrupted when its CLI calls stalled. The final direct CLI assertions succeeded. |
| `git diff --check` | Passed. |

The source review found exact-envelope deletion acknowledged only after IndexedDB transaction completion, a bounded cleanup-only exact-version reopen after a closed normal handle, and retained local retry ownership after failed cleanup. The real browser tests establish the previously failing quota/abort path. A process lost while storage remains unavailable can still leave a conservative orphan pin; this correction does not claim cross-process reclamation. The rejected all-owner S2b atlas remains in the same dirty tree, so the return is not a commit-ready SI4 slice.

## Bounded Obsidian resolver observation

Obsidian CLI reported **1.14.3 (installer 1.14.0)**. Five owned Markdown notes in a temporary folder represented two `A.md` files under `One/` and `Two/`, corresponding `C.md` referrers, and `B.md`. Each C had a dormant raw `[[Alias]]` occurrence and `[[A]]`. The notes were created only in disposable `kplex-test`; the temporary folder and all files were removed in `finally`. A separate CLI check found the folder absent and the vault back at **20,015 Markdown files**. Captured JavaScript errors: none.

| Raw lookup from both C source paths | Before alias | After `One/A.md` adds `aliases: [Alias]` | After changing that alias to `Other` |
| --- | --- | --- | --- |
| `Alias` | `null`, `null` | `null`, `null` | `null`, `null` |
| `A` | `One/A.md`, `Two/A.md` | Same | Same |
| `../B` | `B.md`, `B.md` | Same | Same |

The paths above were under the owned temporary folder. `[[Alias]]` stayed in each C's unresolved map (count two in One/C, one in Two/C); `[[A]]` stayed resolved to its nearby A. Modifying `One/A.md` produced its `changed`, `resolve` and final `resolved` events, but no C event was observed in the captured sequence. This **falsifies the test double's assumption** that changing frontmatter aliases necessarily retargets a raw `[[Alias]]` in this installed host. It does not prove that all existing-file mutations leave every dormant referrer unchanged, or supply a documented inverse candidate rule across Obsidian versions. No changed-host S2b result is certified from this probe.
