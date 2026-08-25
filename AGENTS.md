# Receipt App

Bun monorepo: a TanStack Start web app and an Expo mobile app sharing one tRPC backend and one platform-agnostic app layer. Run all scripts from the repo root.

## Commands

### Verification

- Verify typescript via `bun run typecheck`.
- Verify linting rule via `bun run lint` (use `bun run lint:fix` to fix rules), apply formatting via `bun run format`. See `@.docs/lint.md` for details.
- Only if working with mobile, verify native health `bun run native:doctor`.
- Only if working with mobile, verify router pages match between web and native `bun run verify-routers`.

### Testing

- Backend is tested via Vitest: `bun run backend:test`. Tests should emit 100% coverage. `bun run backend:test <path>` runs one file, `--update` rewrites snapshots. See `@.docs/be-test.md` for details.
- Frontend is tested via Playwright. As this requires running a server, see details in `@.docs/fe-test.md` if you need to run FE tests.

### Development

- Run web via `bun run web:dev`, don't run mobile for now.
- When DB schema is changed, run `bun run db:generate-types` and commit the result.

## Files structure

All packages from `packages` are referred as `~package/*` (e.g. `packages/foo/bar.ts` is `~foo/bar`)

- `packages/utils/**` - low-level shared tools
- `packages/db/**` - database migrations, types and Kysely instance generator
- `packages/components/**` - design system
- `packages/mutations/**` - mutation descriptors and cache controllers (see `@.docs/mutations.md` for details)
- `packages/app/**` - the main portion of the app, containing shared layer between and mobile and all the features

- `utils/format` - format utils
- `utils/lint` - lint utils
- `utils/scripts` - misc utils

- `testing/vitest` - backend testing infrastructure (tests are co-located with files)
- `testing/playwright` - frontend testing infrastructure (tests are co-located with files)

- `apps/mobile` - root directory for mobile app (see `@.docs/native.md` for details)
- `apps/web` - root directory for web app (see `@.docs/web.md` for details)

## Basic conventions

- Style with Tailwind `className` through Uniwind on both platforms.
- Filenames are kebab-case everywhere except framework-reserved ones (`__root.tsx`, `_layout.tsx`).
- Declare components as `export const X: React.FC<Props>` with a local `type Props`; components taking no props skip `React.FC`.
- A component that required async data is wrapped via `suspendedFallback()` HOC and should use `useSuspenseQuery`, not `useQuery` (see `@.docs/querying.md` for details).
- Read `@.docs/backend.md` before touching API (`apps/web/src/handlers/**`) or database (`packages/db/**`).
- Read `@.docs/frontend.md` before adding or changing a component, screen, route or mutation.

## Never do

- Edit manually generated `*.gen.ts`, regenerate instead.
- Edit git-ignored files.
- Edit manually snapshots (`__snapshots__/` or `*-snapshots/`), regenerate instead.
- Add long comment sections with `// -------` lines
