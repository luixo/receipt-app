# Frontend tests (Playwright)

Before working on tests, you need to pre-build the server (`bun run web:build --mode test`). If you're only editing test files, the existing build stays valid — re-run tests directly.

## File conventions

- Functional tests: `*.spec.ts` (all files except `*.visual.spec.ts`).
- Visual tests: `*.visual.spec.ts`.
- Per-feature fixtures: `*.utils.ts` co-located in `__tests__/` alongside the spec file.
- Always import `test` and `expect` from `~tests/frontend/fixtures`, not from `@playwright/test`. Per-feature fixture sets are composed with `mergeTests()`.

## Visual tests routine

- **Visual tests must ONLY be run and their snapshots updated via Docker, never directly on a local machine.** Local browser binaries (even ones `playwright install` fetches) render slightly differently per OS/arch than the pinned CI image, so running or `--update-snapshots`-ing outside Docker produces false diffs and can silently corrupt committed snapshots with host-specific pixels.
- **The build itself stays on the host**, Docker is only used to run/update the tests against that build.

Full command to run tests in Docker:

```sh
# Optionally add a single test file / grep for test case
# Drop `--update-snapshots` to just verify snapshots match instead of regenerating them
docker run --rm -v ${PWD}:/work/ -w /work/ -it --network host --entrypoint /bin/bash "mcr.microsoft.com/playwright:v$(grep -m1 '"playwright":' package.json | sed -E 's/.*"([0-9.]+)".*/\1/')" -c "npm install -g "bun@$(node -p "require('./package.json').packageManager.replace(/^bun@/,'').split('+')[0]")" && PW_SERVER=true bun run frontend:test --update-snapshots"
```

## API mocking

Every test uses the `api` fixture (auto-injected). All tRPC calls are intercepted — no real backend is called in functional tests.

- `api.mockFirst(key, handler)` — pushes a handler to the top of the stack (highest priority). Handlers can be a plain value, an async function, or throw `TRPCError` to simulate errors.
- `api.mockLast(key, handler)` — pushes a handler to the bottom (baseline/default).
- `api.createPause()` — returns `PromiseWithResolvers<void>`; `await pause.promise` inside a handler suspends the call; `pause.resolve()` / `pause.reject()` resumes it. Use to test loading states.

## Auth helpers

- `api.mockUtils.noAuthPage()` — mocks `account.get` to throw UNAUTHORIZED and mocks the currency list. Returns `{ unmockAccount, unmockCurrency }` for cleanup.
- `api.mockUtils.authPage({ page })` — sets the auth cookie and mocks `account.get`, `accountSettings.get`, `debtIntentions.getAll`, etc. with sensible defaults. Returns `{ user, account }` with faker-generated data.
- `api.mockUtils.mockUsers(...users)` — registers user fixtures resolvable via `users.get`.

## Cache and query assertions

- `snapshotQueries(async () => { … }, opts)` — wraps an action, diffs the React Query dehydrated cache before/after, and writes two snapshots next to the spec file: `.cache.json` (cache diff) and `.queries.json` (actions taken).
  - `opts.name` — snapshot file suffix for multiple calls in one test.
  - `opts.blacklistKeys` / `opts.whitelistKeys` — filter which tRPC keys appear, use to ignore keys that we don't necessarily track in a given test case.
  - `opts.skipCache` / `opts.skipQueries` — skip one of the two snapshot types.
  - Default blacklist: `account.get`, `currency.getList`, `debtIntentions.getAll`, `accountConnectionIntentions.getAll`.
- `awaitCacheKey(key, options)` — waits for a tRPC query or mutation to reach a target count in the cache.
  - Plain number → at least N successes.
  - `{ errored: N }` → N errors.
  - `{ succeed: M, errored: N }` → both.
  - `{ total: true }` → count from the start of the test, not since the last call.

## Shared locators

Fixture-provided locators available in every spec:

| Name                  | Selects                                           |
| --------------------- | ------------------------------------------------- |
| `loader`              | `[aria-label="Loading"]`                          |
| `skeleton`            | active skeleton element                           |
| `modal(title?)`       | `section[role="dialog"]`                          |
| `errorMessage(text?)` | `[data-testid="error-message"]`                   |
| `emptyCard(text?)`    | `[data-testid="empty-card"]`                      |
| `withLoader(locator)` | elements inside `locator` that contain the loader |

## Toast assertions

- `verifyToastTexts(text | texts[], timeout?)` — asserts exactly the given toasts are visible (sorted comparison), then programmatically dismisses them. Always call this to consume toasts; leftover toasts at screenshot time throw.
- `clearToasts(n)` — dismiss N toasts without asserting text.

## Visual test quirks

- `expectScreenshotWithSchemes(name, opts)` — takes a screenshot in both light and dark mode, joins them side-by-side, and compares to a named snapshot. No visible toasts are allowed before calling. Masks the sticky menu by default. Pass `locator` to clip to a specific element.
- When using a locator, always use a named locator fixture defined in `utils.ts` (e.g. `avatarForm`) rather than inline expressions like `page.locator("form").first()`. This keeps visual tests readable and lets fixture names serve as stable contracts.
- Visual snapshots live in `*-snapshots/` directories next to the spec.

## Faker and time

- The `faker` fixture is seeded deterministically from the test title — tests produce the same random data on every run. `faker.temporal.between` / `faker.temporal.recent` generate Temporal types directly.
- Time is frozen server-side to `2020-01-01`. Browser `Date` is also overridden to the time of `page.goto()`.

## Timezone and locale

Server runs at UTC / `ru-RU`; browser client is set to `America/Los_Angeles` / `en-US`. This is intentional to catch SSR hydration mismatches. Reference `localSettings` from `~tests/frontend/consts` when formatting dates in assertions.

## Navigation

Always call `await page.goto(url)` after all mocks are set up. The custom `goto` waits for the `<hydrated>` marker, so the page is fully hydrated before any assertions run.

## NumberInput (react-aria)

Always query `NumberInput` by ARIA role and label (otherwise your query will result in two inputs):

```ts
const amountInput = page.getByRole("textbox", { name: "Amount" });
```

Values are only committed to the form on blur, not on each keystroke. After `fill()`, press `Tab` to trigger the blur and update the form state:

```ts
await amountInput.fill("10");
await amountInput.press("Tab");
```

## Null narrowing

Use `import assert from "node:assert"` with `assert(value)` to narrow potentially-`undefined` array elements to their concrete type. This throws at runtime if the assertion fails, surfacing test setup bugs immediately instead of producing confusing downstream errors.

```ts
const [first, second] = generateFoo({ amount: 2 });
assert(first);
assert(second);
// first and second are now non-nullable
```

Prefer this over TypeScript's `!` non-null assertion (`foo!`) in test files.

## Other utilities

- `cookieManager.addCookie(storeName, value)` — pre-set store cookies (e.g. `SETTINGS_STORE_NAME`) before navigation.
- Shared data generators live in `testing/playwright/generators/`. Use `generateAmount`, `generateCurrencyCode`, etc. rather than building raw objects inline.
