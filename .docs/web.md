# Web app (`apps/web`)

Run via `yarn web:dev`.

## Routing

- File-based routing in `src/pages/`.
- `__root.tsx` is the app shell. `_protected.tsx` redirects to `/login` (with a redirect-back search param) on `UNAUTHORIZED` and clears the auth cookie. `_public.tsx` redirects to `/receipts` if already authenticated.
- Adding a protected page: create `src/pages/_protected/<name>.tsx` and refresh - Tanstack Router will fill it in a second. Same pattern for public pages under `_public`.
- Each route sets its `<title>` via `getTitle(match.context.i18nContext, key)` inside `head()`. Always load the i18n namespace in the `loader` before returning.
- Search params are registered via `searchParamsWithDefaults(key)` spread into the route definition, centralized in `~app/utils/navigation`'s `searchParamsMapping`. Params with a `.catch()` default are automatically stripped from the URL when at their default value.

## SSR and data loading

- Use `getLoaderTrpcClient(ctx.context)` (not the hook-based client) in `loader` and `beforeLoad` — it reads the server request on SSR and falls back to the window on CSR.
- Prefetch in route loaders via `prefetchQueries(ctx, trpc.xxx.queryOptions(), …)` and return the result as `{ prefetched }`. `HydrationBoundary` picks this up and seeds the client query cache before first paint.
- Use `prefetchQueriesWith` for dependent queries (fetch an ID, then prefetch by that ID) — the helper handles CSR skipping and error swallowing.
- Loader stale time is `Infinity`; loaders never re-run on the client after SSR. Refresh via `router.invalidate()` or mutation cache updates.

## Isomorphic utilities

- `createIsomorphicFn().server(…).client(…)` — for code with different server/client implementations (e.g. reading request headers on server vs. nothing on client).
- External router context (`initialValues`, `isTest`) is read from cookies on both sides.

## i18n

Language is resolved from cookie → `Accept-Language` header → base locale. Locale files are JSON under `public/locales/<lang>/<namespace>.json`. Loaded in route loaders: read from the filesystem on SSR, fetched via `fetch` on CSR.

## Providers

`src/providers/` holds singleton server-side provider instances (logger via pino, cache-db, s3, exchange-rate, email). Import the typed instance, not the raw library.

## Error handling

All caught errors go to `captureSentryError`. The root error boundary (`RootErrorComponent`) exposes a `reset` + `router.invalidate()` combo.
