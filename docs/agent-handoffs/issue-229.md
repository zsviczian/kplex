# Temporary implementation plan — issue #229

Status: investigation and implementation in progress; not yet a fix. Remove this temporary file before finalizing the PR.

Baseline: main `eb9c316a1d65549ce9b9db85e04bb33826ced81c`.
Issue: https://github.com/zsviczian/kplex/issues/229

- Trace scroll-area connector admission and retain necessary ancestry connections without painting a fan to hidden leaf rows.
- Diagnose the separate dense-canvas failure where cards have valid DOM geometry/hit tests but are absent from native pixels. Use synthetic content for reproduction; keep live inspection read-only and private.
- Preserve canonical graph/indexing, per-canvas state, camera, filters, source demand and editor ownership.
- Add focused geometry/browser regressions and validate the exact build in the disposable Obsidian vault, with native pixel evidence where needed. Assess indexing risk before any expensive suite.

Do not merge without authorization. Native rendering cause and acceptance remain unverified.
