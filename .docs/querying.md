# Querying (tRPC + TanStack Query)

## `useSuspenseQuery` vs `useQuery`

- `useSuspenseQuery` is the default for any component that requires data before it can render. It always goes inside a `suspendedFallback()` wrapper.
- `useQuery` (non-suspense) is used only when the component manages its own loading or empty state imperatively — for example, reacting to `isSuccess` in a `useEffect`, or an optional query that may be skipped.

## `suspendedFallback()` HOC

Any component that calls `useSuspenseQuery` must be the inner component of `suspendedFallback(Component, Fallback, errorComponent?)`. This HOC pairs `<Suspense>` with `QueryErrorResetBoundary` + `CatchBoundary` so error reset is automatic. Never wrap a component in a manual `<Suspense>` — use `suspendedFallback`.

The fallback can be a static `ReactNode` or a `React.FC<Props>` if the skeleton needs the same props as the component. See `@.docs/frontend.md` for skeleton structure conventions.

## Conditional queries with `skipToken`

When a query input depends on optional data, pass `skipToken` as the input:

```ts
trpc.receipts.get.useQuery(receiptId ? { id: receiptId } : skipToken)
```

Both `useQuery` and `useSuspenseQuery` accept `skipToken`. With `useSuspenseQuery`, the component suspends until the token becomes non-skip and data is available.

## Type-safe cache reads

- `trpc.some.procedure.queryFilter(input?)` — scopes cache operations (`invalidateQueries`, `findAll`). Partial inputs match all queries that share the provided fields.

## Reactive cache reads

`useSubscribeToQueryUpdate({ key, filters }, getSnapshot)` bridges the query cache into `useSyncExternalStore`. Use it for derived data that must update in response to cache changes but isn't a direct query. The snapshot callback reads from the cache synchronously; it is debounced internally (100 ms quiet / 1 s max burst) to avoid tearing.

## Prefetching sibling data

When nearby items will be needed but aren't cached yet, prefetch them:

```ts
useEffect(() => {
  queryClient.prefetchQuery(trpc.some.procedure.queryOptions(input));
}, [ids]);
```

Server-side batching makes this cheap.

## Search and filter UIs

Pass `{ placeholderData: keepPreviousData }` to `useQuery` when the input changes rapidly (e.g. debounced search) to avoid blank states between fetches.

## Cursor-based pagination

Use `useCursorPaging(procedure, input, offsetState)`. It wraps `useSuspenseQuery` with `React.useDeferredValue(offset)` so the UI stays responsive during page transitions. `isPending` is exposed for a loading overlay.

## Load-more and autocomplete

Use `trpc.some.procedure.infiniteQueryOptions({ …, cursor: 0, direction: "forward" }, { getNextPageParam, enabled })` for incrementally loaded lists.

## Dynamic parallel queries

When rendering N items that each need their own query, use `useQueries` rather than mapping hook calls inside a render:

```ts
useQueries({ queries: ids.map((id) => trpc.users.get.queryOptions({ id })) })
```

## Skeleton components

Every `suspendedFallback`-wrapped component should have a matching `*Skeleton` export from the same file that mirrors the layout. Skeleton primitives (`SkeletonInput`, `SkeletonDateInput`, `SkeletonAvatar`, etc.) are available in `~components/`.
