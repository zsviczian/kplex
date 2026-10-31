# Temporary implementation plan — editor and mobile navigation batch

This plan-only file is temporary and must be removed before final review.

Maintainer-approved scope: Mind Map root editor expansion, PDF editor nodes, and
issues [#242](https://github.com/zsviczian/kplex/issues/242),
[#235](https://github.com/zsviczian/kplex/issues/235),
[#233](https://github.com/zsviczian/kplex/issues/233),
[#232](https://github.com/zsviczian/kplex/issues/232),
[#231](https://github.com/zsviczian/kplex/issues/231), and
[#216](https://github.com/zsviczian/kplex/issues/216).

Initial baseline: main at 5ea0eda. Existing open draft #223 does not overlap this batch.

Implementation will extend the existing editor/embedded-leaf owners, native modal shell,
PlexViewSession presentation state, shared Markdown parser and connector rendering. Initial
source evidence: occurrence editors disable maximize; file admission excludes PDF; rename
already uses Obsidian Modal and needs mobile viewport handling rather than a replacement
custom dialog. Native tab spawning and toolbar reachability still require bounded tracing.

Remember camera/section folds across navigation with a bounded, session-owned presentation
cache if feasible; no whole-vault preferences inventory, note reads on camera input or new
IndexedDB schema. Preserve native editor save/close and owning-window fences. Add the requested
editor title and keep controls reachable after camera/viewport changes. Fix escaped Markdown
link-label parsing in the canonical sync/cooperative owner and dim unrelated connector labels.

Acceptance: focused parser, editor, modal, navigation, memory-bound and hover regressions;
real build and scanner; risk-based aggregate tests for parser/semantic effects; exact-build
Small-vault native checks in main/popout and mobile layout emulation. Physical touch remains
separate. PR remains draft until implementation/available validation are complete; evidence
and remaining limitations will replace this plan. No merge or personal-vault deployment.
