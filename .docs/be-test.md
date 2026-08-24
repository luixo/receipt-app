# Backend tests (Vitest)

Tests are co-located with source files: `foo.ts` → `foo.test.ts`. Run with `bun run backend:test`; run one file with `bun run backend:test <path>`; `--update` rewrites snapshots.

## Test fixture

Always import `test` from `~tests/backend/utils/test`, not from `vitest`. This fixture provides `ctx` with a database connection, mock singletons, faker, and deterministic UUIDs/salts. Import `describe` and `expect` from `vitest` directly.

## Database lifecycle

Each test file gets one isolated Postgres database. The database is **truncated** (not dropped) between each test case. Time is frozen to `2020-01-01T00:00:00Z` for every test and reset afterward — use `getNow.*` from `~utils/date` to reference the frozen time in assertions.

## Seeding data

Seed all test data via `insert*` helpers from `~tests/backend/utils/data` (e.g. `insertAccount`, `insertAccountWithSession`, `insertReceipt`). Never write raw DB queries in tests.

- `insertAccountWithSession` is the standard starting point for any authenticated test — it returns `{ accountId, sessionId, userId, name, … }`.
- Helpers accept optional `data` overrides; unspecified fields default to `faker`-generated values.
- Always insert "unrelated data" alongside actual test data to verify queries don't bleed across accounts. Comment it `// Verify unrelated data doesn't affect the result`.

## Calling procedures

Call procedures directly via `createCallerFactory`, not over HTTP:

```ts
const caller = createCallerFactory(router({ procedure }))(ctx);
```

- Unauthenticated context: `createContext(ctx)` from `~tests/backend/utils/context`.
- Authenticated context: `createAuthContext(ctx, sessionId)` — injects the `authToken` cookie.

## Test structure

Every procedure test file has exactly two top-level `describe` blocks inside `describe("<router>.<procedure>")`:

1. `"input verification"` — always starts with `expectUnauthorizedError(...)` to cover the auth guard.
2. `"functionality"` — tests the happy path and edge cases.

Shared field-validation sub-suites are extracted into `verify*` functions in a co-located `utils.test.ts` (e.g. `verifyName`, `verifyCurrencyCode`) and called directly inside `describe("input verification")` — they produce their own `describe`/`test` blocks when invoked.

## Error assertions

- `expectTRPCError(fn, code, message)` — procedure-level errors.
- `expectUnauthorizedError(fn)` — creates a standard `test("should be authenticated", …)` automatically; import and call rather than writing it by hand.

## Database diff snapshots

Wrap every mutation that modifies DB state in `expectDatabaseDiffSnapshot(ctx, fn)`. It snapshots the diff of rows added, updated, or deleted. Use the named overload `expectDatabaseDiffSnapshot(ctx, fn, "name")` when a single test needs multiple diff assertions.

## Deterministic identifiers

- `faker` is seeded per-test from the test name — random data is reproducible across runs.

## Mocks

All mocks are reset automatically between tests. Inspect or configure them via `ctx`:

- `ctx.emailOptions` — `.mock.getMessages()`, `.broken = true`, `.active = false`
- `ctx.s3Options` — `.broken`, `.mock.getMessages()`, `.mock.endpoint`, `.mock.bucket`
- `ctx.cacheDbOptions` — `.mock` for cache-layer assertions
- `ctx.exchangeRateOptions` — mock exchange rate service
- `ctx.logger` — `.getMessages()` to inspect output, `.level = "trace"` to change verbosity

## Sequential calls

Use `runInBand` from `~web/handlers/utils.test` to run multiple async calls serially in case similar data is getting inserted in the database and snapshots are flaky.
