# Mobile app (`apps/mobile`)

Run `bun run native:doctor` to verify native health. Run `bun run verify-routers` to confirm web and native page sets match.

## Routing

- File-based routing via Expo Router under `apps/mobile/app/`. Route groups `(protected)/` and `(public)/` are layout-only — the actual auth guard lives in `~app/components/protected-page` and `~app/components/public-page`.
- Route files are thin wrappers: each exports a default `Wrapper` component that renders `<PageWrapper>` + the shared `*Screen` from `~app/features/`. No logic belongs in route files.
- Web uses `$param` path segments; native uses `[param]`. `navigationContext` in `~mobile/utils/navigation.ts` translates between the two at runtime so shared code only sees the web convention.
- Web and native must have identical page sets. When adding a screen, add it to both `apps/web/src/pages/` and `apps/mobile/app/`. There is a verification in CI (`verify-routers`) to check if that holds true.

## Context adapters

`InnerProvider` accepts four platform-specific adapters: `storeContext`, `storage`, `linksContext`, `navigationContext`. These are the only extension points between shared and native code.

- `navigationContext` wraps Expo Router hooks to satisfy the `~app/contexts/navigation-context` API. When a new navigation primitive is needed in shared code, add it to `NavigationContext`, implement it in `~mobile/utils/navigation.ts`, and add the web equivalent.
- `storage` is `AsyncStorage` (for TanStack Query persistence).
- `storeContext` uses `react-native-mmkv` for fast synchronous key-value state (auth token, theme, etc.).
- `linksContext.source` is `"native"` — used by tRPC links to tag requests.
- `linksContext.fetch` is `expo/fetch`, not the browser global; required for Expo's network stack.
- `linksContext.useBatch` is `true` on native.

## Styling

- CSS variables for colors are generated from `@heroui/theme` semantic colors via `generate-colors.ts`. Run `bun run --cwd apps/mobile css:prepare` after changing theme colors.
- Safe area insets are fed into Uniwind via `SafeAreaListener` + `Uniwind.updateInsets`.

## Splash screen

`SplashScreen.preventAutoHideAsync()` is called at module level. `SplashScreenManager` hides the splash once all pending queries resolve or a 2 s timeout fires — whichever comes first.

## i18n

Translation JSON files live under `apps/web/public/locales/` and are imported by `~mobile/utils/i18n.ts`. No separate translation files exist for mobile. Language is detected once at startup from `expo-localization`; changing it requires an app restart.

## Environment variables

All public env vars use the `EXPO_PUBLIC_` prefix (`EXPO_PUBLIC_API_BASE_URL`, `EXPO_PUBLIC_SENTRY_DSN`). Copy `.env.example` to `.env` in `apps/mobile/`. `EXPO_PUBLIC_API_BASE_URL` must point to the deployed backend; missing it causes all queries to fail at runtime.

## Error tracking

Sentry is initialized in `_layout.tsx` when `EXPO_PUBLIC_SENTRY_DSN` is set; the entire app is wrapped with `Sentry.wrap()`. `captureSentryError` in `~mobile/utils/sentry.ts` is the `captureError` adapter used by shared code.

## Dev tooling

`DevToolsProvider` is a dev-only component that syncs the React Query cache to an external inspector on port 42831. It is passed as a prop to `InnerProvider` so production builds can swap it for a no-op without touching shared code.
