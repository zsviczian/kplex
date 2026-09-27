# Mixed agent development

K-Plex development alternates between an offline agent doing most implementation/analysis and an Obsidian-equipped main agent doing live investigation, independent validation and repository management. This workflow applies to features, fixes, documentation and explicitly resumed refactor checkpoints. Refactoring remains paused at accepted C14; preparing a feature assignment does not resume it.

Read [AGENTS.md](../AGENTS.md) for mandatory architectural/product rules and [CONTRIBUTING.md](../CONTRIBUTING.md) for setup and checks. [Refactor plan.md](../Refactor%20plan.md) is the definitive architecture/checkpoint tracker. The current assignment and return live in the single root [HANDOFF.md](../HANDOFF.md).

## Roles and available environments

| Participant | Responsibilities | Evidence limits |
| --- | --- | --- |
| Offline development agent | Inspect source and contracts, implement scoped changes, add appropriate regressions, analyze supplied traces, run available portable/browser/build checks, record the return. | Has no running Obsidian or CLI. Node version, installed packages, browser, network and Git metadata must be checked separately; some may be unavailable. Never claim native/device acceptance. |
| Main validation agent | Prepare scoped assignments, gather host facts/traces or unblock tooling, review the entire return, fix defects, run required checks and exact-build native scenarios, maintain acceptance records and manage authorized Git/PR actions. | CLI access enables host automation, not proof of physical touch/keyboard or every device lifecycle. Record any unavailable/limited evidence honestly. |
| Maintainer | Set scope and product decisions, supply required physical-device checks, accept explicitly stated limitations and authorize repository/release actions. | A limitation accepted for one assignment is not a blanket waiver for later work. |

The offline agent may implement adapter/native-shell code against real installed Obsidian declarations; absence of a running host does not require stubbed production APIs. If dependencies cannot be installed, return useful source work and precise pending reviewer checks. A syntax/global/stub check is partial evidence, not a successful real build.

## The transfer document

Preserve HANDOFF's standing header. **Overwrite its assignment, evidence and result body for each transfer; do not archive it, append historical sessions or create dated handoffs.** It is bidirectional: the next recipient can be the offline agent or the main agent. Keep one bounded task and a clear next action, including intermediate probe/analysis rounds when needed.

Every active transfer records:

- State and direction: prepared, implementing, awaiting host probe, returned for review, awaiting device confirmation, or accepted/inactive; sender, recipient and assignment kind.
- Identity: current branch/base commit and initial dirty files; supplied changes or patch identity and relevant source/artifact hashes. If an archive has no Git metadata, say so. The main agent records the real base when preparing the archive; the offline agent must not invent a HEAD.
- Objective: concrete user-visible outcome or investigation question, existing behavior, architectural owner, allowed changes and excluded scope. Record product decisions independently from structural extraction.
- Inputs: relevant contracts/callers, reproduction, fixtures/settings, prior observations, known failures and any minimized diagnostic evidence.
- Acceptance: portable tests/build, applicable host assertions and physical/manual checks; exact expected observations, compatibility/performance/lifecycle risks and cleanup requirements.
- Return: changed files/actions, findings and code decisions, actual commands/versions/results, failures or unavailable checks, temporary artifacts and next recipient's precise action.

Use real source references and commands verified in the checkout. Do not copy stale counters, baseline digests or previously accepted device outcomes into a new assignment as current evidence. The handoff must identify which prior report/build a baseline belongs to and whether inputs are equal.

## Development and review cycle

1. **Main agent prepares the assignment.** Read branch/status and existing changes, the architecture owners and the maintainer's intent. Preserve unrelated work. Identify the smallest independently reviewable feature/fix and its affected consumers. Name the behavior, host effects, compatibility decision, invalidation/lifetime effects, acceptance checks and base identity in HANDOFF. Consult checkpoint agent fit only for explicitly resumed refactoring; a host-dependent acceptance lane does not prohibit offline implementation of a bounded slice.
2. **Offline agent implements.** Read the standing rules, assignment and existing contracts before editing. Reuse the canonical parser/compiler/resolver/predicate and shared controls. Add focused behavior coverage appropriate to the change, preserve strict guards and run available `npm run verify`/browser checks with real dependencies. Record version or dependency limitations. Keep changes uncommitted by default, fill the return and identify host questions precisely. Do not mark final acceptance or change scope to compensate for unavailable tooling.
3. **Main agent reviews the returned repository.** Establish the actual diff against the supplied base; inspect every changed/new file, remaining callers and schema/default/command differences. Reproduce meaningful checks on required Node 22.22.2 and actual dependencies. Review portable ownership, provenance/identity, async fences/publication, localization/environment, device/workspace ownership and cleanup. Fix bounded defects locally, or send substantial remaining work back as a new scoped transfer. Changes made during review invalidate affected earlier test evidence.
4. **Main agent validates the exact implementation.** For runtime changes run required portable verification and applicable `npm run verify:obsidian` scenarios with explicit `kplex-test` variables; include the migration host lane when import/style migration is affected. Inspect the actual loaded plugin and test affected behavior beyond the basic render smoke. Keep install/reload, mutation and oracle captures sequential. Establish authoritative readiness and fence captured graph state before semantic comparisons. Record source/artifact identities, pass/fail outcomes, cleanup and limits. Documentation-only changes need relevant content/link/whitespace checks instead of a host deployment.
5. **Report acceptance and remaining checks.** Summarize what changed and automated evidence. Recommend only the 1–3 highest-value manual/device checks with target, steps, expected outcome, priority and the reason automation cannot cover them; say **no manual test needed** when appropriate. Run any automatable host checks in the main environment rather than delegating them to the maintainer just because the offline agent lacked access. Required unrun/failed checks remain pending. A maintainer's explicit acceptance of a limitation is recorded as such, never relabeled a demonstrated pass.
6. **Persist, then manage the repository.** Accepted refactor outcomes, facade ownership, next step and limitations belong in the plan ledger/action log; failed/rejected refactor returns are recorded before overwriting too. Feature-specific evidence belongs in the issue/PR or a reviewed `docs/validation/` report where useful; relevant architecture decisions/remaining seams are linked from the plan. The main agent commits/pushes/opens PRs only within current authorization, after required validation or explicitly recorded maintainer acceptance. Merge/release/deployment to a personal vault needs its own applicable authorization. Mark the handoff inactive after acceptance and wait for the next requested assignment; no automatic refactor resume.

No reset/clean, cache deletion, blanket fixture regeneration or unrelated formatting is a substitute for review. Preserve incoming work and explain deliberate behavior differences. Do not broaden the completed task merely to use every available host test.

## Investigation and trace-analysis cycle

An offline agent can analyze a substantial trace or reason about a runtime failure after the main agent captures evidence. Use the same transfer document rather than an additional debugging log.

1. **Frame a bounded question.** The requesting agent records the actual failure, minimal reproduction, relevant code/awaits, expected versus observed state, candidate explanations and a concrete probe request. Specify what results distinguish the hypotheses; do not require the offline agent to invent inaccessible host facts.
2. **Main agent captures the evidence.** Follow [Obsidian runtime testing](OBSIDIAN_RUNTIME_TESTING.md). Prefer existing plugin/index diagnostics such as `getSnapshotHydrationDiagnostics()` through `app.plugins.plugins['k-plex']`. Verify the selected vault and installed build; reacquire plugin/index references after reload. Where necessary, the main agent can implement bounded temporary controllers/accessors and perform native fault injection or a small development change needed to expose the condition.
3. **Prepare an analysis transfer when justified.** For a small conclusive observation, fix/review locally. When interpretation or source tracing is substantial, overwrite HANDOFF's body for the offline recipient with the question, relevant source locations, minimized trace/excerpts and requested output (for example a causal explanation, competing hypotheses and a focused patch/regression test). An analysis-only assignment changes no production code unless implementation is explicitly in scope.
4. **Offline agent analyzes and returns.** Distinguish observations from inference, explain ordering and awaited boundaries, identify missing evidence and propose the narrowest owner-level fix/tests. Do not claim a runtime diagnosis from a screenshot alone or treat a harness timeout/preview capture as semantic failure. If a further host probe is essential, return an exact request; continue independent analysis meanwhile.
5. **Main agent tests the hypothesis/fix.** Reproduce with the real host and accepted-code/equal-input comparison where needed, inspect the returned code and run affected verification. Send another bounded transfer if needed. Persist the accepted conclusion and evidence limits in the durable record, then replace the transient body for future work.

### Evidence packet requirements

Include enough information to reproduce and interpret the trace without shipping a personal vault:

- Source/base/diff identity, built and installed artifact hashes where relevant, Obsidian/OS/Node versions, test-vault/fixture identity and only the settings relevant to the reproduction.
- Trigger sequence and serializable outcomes; timestamp units, phase/counters, graph/hydration readiness, captured revision/generation and any controlled gates. Show the failed prerequisite and last reliable observation if capture did not finish.
- Assertions or comparison method, expected versus actual output and multiplicity-preserving semantic oracle rules when used. Plain indexing counts or a rendered image do not establish semantic parity.
- Harness effects: temporary scheduling/demand suppression, emulation/viewport, background throttling and any timing instrumentation. Separate foreground observations from diagnostic timings; neither a timer nor a screenshot proves actual paint or device performance.
- Next analysis question, acceptance probe and cleanup state. Raw long traces can be supplied as a task-local untracked file/attachment with its path/hash and relevant excerpts in HANDOFF. Missing local files in an exported repository must be supplied or recaptured, not assumed present.

Keep evidence minimized and exclude tokens, private vault content and unrelated paths. Use a unique searchable prefix and copyable strings for temporary instrumentation. Cleanup restores timers/wrappers/throttling/settings independently of assertions, removes test-owned notes/globals and strips temporary source hooks from the final bundle. Perform cleanup even when analysis is handed off; any deliberately retained bounded probe must have an explicit lifetime/cleanup owner. Debug access through the live plugin is maintenance-only, never a production dependency or permanent global API.

## Validation boundaries

| Check | Offline work | Main-agent acceptance |
| --- | --- | --- |
| Architecture/core/lint/tests/production build | Run with real dependencies when available; report exact limitations otherwise. | Run affected required lanes on the final reviewed code and pinned runtime. |
| Browser DOM/owner-document tests | Run if a discovered browser or `KPLEX_TEST_BROWSER` is available. | Resolve unavailable relevant checks; browser DOM success is not Obsidian interaction proof. |
| Obsidian install/reload/native behavior | Provide exact scenarios and expected results; mark pending. | Deploy the exact build to the explicit disposable vault, assert relevant behavior and clean up. A render smoke alone does not validate every feature. |
| Desktop/tablet/phone emulation | Contract/classifier tests and supplied trace analysis. | CLI `app.emulateMobile(true/false)` and viewport checks can prove layout/routing/CSS; restore the original state. |
| Physical touch/keyboard/device lifecycle | Supply a prioritized manual procedure when necessary. | Automate equivalent checks if possible; otherwise request maintainer results and keep any unavailable gate/accepted limitation explicit. |
| Performance | Parser/algorithm scaling guards and reproducible fixtures. | Measure relevant before/after runs with equal inputs; record cold/warm, responsiveness, memory and harness limits separately. No universal performance claim from diagnostic timing. |

Every runtime assignment remains subject to C14's shared semantic ownership, bounded source collection, per-file coherent publication, revision/cancellation fences and preserved settings/data compatibility. New UI copy and shortcut hints follow the catalog/environment seams. These rules apply equally to quick features, trace-driven fixes and external-agent code.
