# Coverage scope and shared-logic work

The old [run 37077211080](https://github.com/luixo/receipt-app/actions/runs/37077211080) `frontend-coverage-report` artifact (`sha256:4da2d465fde1d433f9643c92dee2486a695aa39873c7f82547b0f1ecad837b2c`) mixed frontend and non-frontend sources. Its numbers are **not** current. `packages/coverage/src/paths.ts:isReportedFile` filters both zero-seeded and merged source paths. Review these candidate exclusions for a frontend-only metric, then implement only the justified ones there:

- `**/*.test.ts` and `**/*.test.tsx`: backend/Vitest test sources, not Playwright application code.
- Backend-only email, API, database and server utility/provider paths: `apps/web/src/email/**`, `apps/web/src/pages/api/**`, server-only `apps/web/src/providers/**` and `apps/web/src/utils/**` **by individual path**, `apps/web/src/utils/server/**`, `packages/utils/src/server/**`, `packages/db/**`. Check actual runtime usage first; keep already excluded `apps/web/src/handlers/**` excluded.
- `**/*.native.{ts,tsx}` in a web-only run and generated `**/*.gen.{ts,tsx}`. Do not exclude an entire shared file merely because some branches are native-specific; generated router code may currently be covered, so excluding it does not necessarily raise the percentage.
- Development-only `packages/app/features/playground/**` and its route **only if** the route is explicitly scoped out of production. Exclude mobile-only `packages/app/features/home/home-screen.tsx` from the web report because `/` redirects before rendering it; keep the web redirect route itself.

Keep receipt UI, shared components and `packages/mutations/**` in the measured scope unless ownership of pure/shared tests is deliberately moved to another metric. In particular:

- Give `packages/mutations/src/cache/receipts/get.ts` focused seeded-query-client tests of item, consumer, payer and participant optimistic add/update/remove, server reconciliation, absent cache entries and failure restoring original values **and order**. Pair with Playwright cache snapshots for user-visible paths. Unit/Vitest coverage does not improve a Playwright-only artifact unless deliberately merged.
- Give `packages/app/utils/receipt-item.ts` deterministic financial tests: unequal shares, tied fractional-cent remainders, stable tie-breaking, multi-item sums, common versus item-specific payers and conservation. Prefer pure-function tests to screenshots for arithmetic.
- Generate a **fresh current-commit** frontend report after missing snapshots and targeted test suites are resolved; rank uncovered **branches** as well as statements, and separate truly unreachable defensive paths from untested UI. Do not present exclusions as added test coverage or carry over the old artifact's percentages.
