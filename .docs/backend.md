# Backend: `apps/web/src/handlers/**`, `packages/db/**`

Backend uses tRPC to route the data. We're targeting

## Adding a procedure

- One procedure per file; the file exports exactly `procedure`. The router `index.ts` re-aliases it to a camelCase key.
- Sub-router `index.ts` files export a plain object, not `t.router(...)`.
- Input schemas use `z.strictObject`.
- Name input schemas `<verb><Entity>Schema`; scalar schemas live in `handlers/validation.ts`.
- If the response of a procedure can be requested multiple times simultaneously (e.g. an item description, a list with an offset) you should use `queueCallFactory(batchFn)` for dataloader batching, in other cases a direct `.query/mutation(…)` will do. If you use dataloader technique - read `apps/web/src/handlers/receipts/get.ts` for a single entity example and `apps/web/src/handlers/receipts/get-paged.ts` for a list example.
- Error messages are sentence-cased, quote ids in double quotes, and end with a period.
- Reuse `getAccessRole` from the router's `utils.ts` for access checks; it accepts `Database | QueryCreator<DB>` so it works inside transactions.
- Mark unreachable defensive branches (never happens, but types don't think so, e.g. we just checked it with a filter function, but types don't know that) with `/* c8 ignore start */ … stop */`.

## Tests

See `@.docs/be-test.md` for details.

## Database

- No repository layer: queries are written inline in procedure files against `ctx.database`.
- Use transaction if some operations are needed to be atomic: `ctx.database.transaction().execute(async (tx) => …)`.
- Migrations are `NNNN-kebab-name.ts` exporting `up`/`down`; table and index names come from `packages/db/migration/consts.ts`, and index/trigger names are colon-delimited.

## IDs and types

- All primary keys are generated in the application layer via `ctx.getUuid()` — the DB never generates UUIDs. Cast to the appropriate flavored type: `const id: ReceiptId = ctx.getUuid()`.
- IDs are nominal via `string & { __flavor?: "<table>" }` in `packages/db/src/ids.ts`. Zod schemas brand them via `.flavored<XId>(z.uuid())`. New tables require a new entry in `ids.ts` and a corresponding schema in `validation.ts`.
- Use `ctx.getSalt()` for any password or crypto operation — not raw `crypto` — so tests can inject a deterministic salt.

## Temporal types

All timestamp columns deserialize to `Temporal` types (`ZonedDateTime`, `PlainDate`, etc.) via a Kysely plugin. Never pass a JS `Date` to a query; use `~utils/date` helpers (`getNow`, `subtract`, etc.). Input schemas for dates use `temporalSchemas.*`.
Use `CURRENT_TIMESTAMP` from `~db/migration/consts` in migrations (not `` sql`CURRENT_TIMESTAMP` ``) — in tests it is replaced with a fixed timestamp (`2020-01-01`) to keep snapshot diffs deterministic.

## Batched procedures

Procedures that use `queueCallFactory` must also export the raw `batchFn` (typed as `BatchLoadContextFn<C, I, O>`) so orchestrating handlers can call it directly inside a transaction without going through the tRPC layer. The exported `procedure` wires the same `batchFn` via `.mutation(queueCallFactory(batchFn))`.

When work inside a `database.transaction()` delegates to a `batchFn` or helper, pass `{ ...ctx, database: tx }` so downstream queries participate in the same transaction.

## Sub-router utilities

Every sub-router with shared logic should have a `utils.ts` alongside the procedure files for shared queries, access helpers, and derived types (e.g. `Role`, `AssignableRole` from zod schemas).

## New table checklist

Adding a table requires: (a) new migration file; (b) new consts block in `consts.ts` (index/trigger/constraint names); (c) `bun run db:generate-types` to regenerate `types.gen.ts`; (d) new flavored ID in `ids.ts` + zod schema in `validation.ts`; (e) `getAccessRole`-style helper in the router's `utils.ts` if access control is needed.
