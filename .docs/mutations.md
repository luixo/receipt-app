# Mutations (`packages/mutations`)

Mutations wire tRPC calls to cache updates and toast feedback. Each mutation is one file under `packages/mutations/src/<domain>/<action>.ts`.

## Descriptor structure

Each file exports an `options` const typed as `UseContextedMutationOptions<"domain.action", OuterContext?, LifecycleContext?>`.

Required fields: `mutationKey` (the tRPC path string), `errorToastOptions`.  
Optional fields: `mutateToastOptions`, `successToastOptions`, `onMutate`, `onSuccess`, `onError`, `onSettled`.

## Three context types

- **`controllerContext`** — `{ queryClient, trpc }` — always the first argument of every lifecycle hook; injected automatically, never passed from the component.
- **`outerContext`** — component-supplied data needed across hooks; typed as the second generic; passed via `{ context: … }` to `useTrpcMutationOptions`. Use `skipToken` to disable the mutation until context is ready.
- **`lifecycleContext`** — arbitrary data returned from `onMutate` and forwarded to `onSuccess`/`onError` (e.g. a temp ID to replace after success).

## Cache controller files

Each query procedure that a mutation touches gets its own file under `packages/mutations/src/cache/<domain>/<query>.ts`, exporting:

- `getController` — imperative updates with no rollback. Used in `onSuccess`.
- `getRevertController` — same ops wrapped with `applyWithRevert` / `applyUpdateFnWithRevert`, returning `{ revertFn?, finalizeFn? }`. Used in `onMutate`.

Each domain `index.ts` composes them via `getUpdaters()`, which returns `update` and `updateRevert`.

## Optimistic update lifecycle

1. `onMutate` calls `updateRevertXxx(controllerContext, { … })` to apply optimistic changes and capture snapshots. The returned `{ revertFn, finalizeFn }` is plumbed through `InternalContext` automatically.
2. On error: `revertFn` is called to roll back.
3. On success: `finalizeFn` is called (e.g. swap a temp ID for the server-returned one).

`mergeUpdaterResults(...results)` merges multiple controller revert results into one when a mutation touches several queries.

## Cache update primitives

- `UpdateFn<T>` = `(value: T) => T` — pure function to transform cached data.
- `SnapshotFn<T>` = `(snapshot: T) => UpdateFn<T>` — factory that closes over the pre-mutation value to produce a revert updater.
- `withRef` — captures the pre-mutation snapshot inside a `setQueryData` updater callback where the old value is only accessible inside the updater function.

## Toast batching

Concurrent mutations with the same `mutationKey` fired within a tick window are batched into a single toast via Dataloader. Toast callbacks receive arrays of all batched inputs.

- `mutateToastOptions` — shown in-flight with `Infinity` timeout; auto-dismissed on settlement.
- `errorToastOptions` — required; replaces or dismisses the in-flight toast on error.
- `successToastOptions` — optional; if omitted, the in-flight toast is silently dismissed on success.

## Import naming

When importing from a mutation file, rename `options` to `<router><Procedure>Options`. When importing `update`/`updateRevert`/`invalidate*` from a cache file, rename with a `<Router>` prefix:

```ts
import { options as receiptsAddOptions } from "~mutations/receipts/add";
import {
	update as updateReceipts,
	updateRevert as updateRevertReceipts,
} from "~mutations/cache/receipts";
```

## Usage in components

```ts
import { options as receiptsAddOptions } from "~mutations/receipts/add";

const mutation = useMutation(
	trpc.receipts.add.mutationOptions(
		useTrpcMutationOptions(receiptsAddOptions, { context: { selfAccountId } }),
	),
);
```

## Cross-domain cache updates

A single mutation can update multiple cache domains. Import each domain's `update` / `updateRevert` from `cache/<domain>/index.ts` and pass `undefined` for sub-controller options that don't apply to that domain.
