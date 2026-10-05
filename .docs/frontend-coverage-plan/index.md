# Frontend coverage: remaining work

Each linked file is a handoff for **unfinished** tests or coverage decisions only. Order by impact:

1. [Receipt detail screen](receipt-screen.md): owner/guest metadata, delete/navigation, route error and masked page visuals.
2. [Add-receipt gaps](add-receipt.md): restore snapshot baselines, assert complete creation payload and test draft cleanup/edge cases.
3. [Receipts list and other pages](other-pages.md): preview sync, ownership reset, debt intentions, connection intentions and account name.
4. [Item-control edge cases](item-controls.md) and [participant edge cases](participants.md): narrowly targeted behavior and visuals not exercised by the component suites.
5. [Coverage scope and shared logic](scope.md): decide frontend-only exclusions, test receipt cache/arithmetic and run fresh coverage.

The only numeric baseline available for this plan is the **old** [run 37077211080](https://github.com/luixo/receipt-app/actions/runs/37077211080) report (`sha256:4da2d465fde1d433f9643c92dee2486a695aa39873c7f82547b0f1ecad837b2c`, commit `5cbbde8`). Do not infer current percentages from it. Before prioritizing smaller branches, build and run targeted Playwright tests, regenerate missing snapshots with the runner, then collect a new coverage report.

Use `.docs/fe-test.md`: co-locate functional and light/dark visual specs; use fixture-based mocks and named locators; mock destination queries before navigation; assert mutation inputs, pending/error and cache effects; consume toasts. Screenshot a separately implemented child in its own suite and mask it in parent-page shots. Never pause an SSR-prefetched query merely to get a skeleton screenshot.
