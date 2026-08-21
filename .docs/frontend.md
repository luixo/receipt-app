# Frontend: components, screens, routes, mutations

See `@.docs/web.md` for web details, `@.docs/native.md` for native details.

## Platform-split components

Each split component in `packages/components/src` is four files:

- `x.base.ts` — shared types and variants.
- `x.web.tsx` — HeroUI React implementation.
- `x.native.tsx` — `heroui-native`/RN implementation.
- `x.tsx` — stub whose exports are `getDummy("Name")`, which throws when the module is evaluated.

## Screens and routes

- Each feature dir has one `<domain>-screen.tsx` entry, shared by the web route and the expo route.
- Web route files export `Route = createFileRoute(...)` and hold loader/head only.
- Search params are centralized per route id in `packages/app/utils/navigation.tsx`, not declared per route file.

## Data

- For mutation usage see `@.docs/mutations.md`, for queries usage see `@.docs/querying.md`
- Translations live in `apps/web/public/locales/{en,ru}/`; `packages/app/utils/i18n-data.ts` fails compilation if any translation diverges structurally from EN.

## Forms

- All forms use `useAppForm` from `~app/utils/forms.tsx` (wraps `@tanstack/react-form`). The form schema lives in a sibling `state.ts` and is typed as `z.infer<typeof formSchema>`. Validation is passed at `onMount`, `onChange`, and `onSubmit` simultaneously.
- **Inline edit pattern**: single-field forms (e.g. `receipt-name-input.tsx`) use a single-field `useAppForm` with a `SaveButton` as `endContent`, mutation called in `onSubmit`.
- **Add-screen pattern**: large forms separate the form shell from context-needing sub-trees. Sub-trees receive `form.store` as a prop; values are read inside via `useTypedValues(formStore, defaultValues)`.
- `useAutosave` from `~app/hooks/use-autosave.tsx` for fields that save on change (not submit). Returns `onSubmit`, `onSubmitImmediate`, and an `updateElement` (spinner/checkmark indicator) to render beside the field.

## Navigation

Components never import from `@tanstack/react-router` directly. All navigation (navigate, params, pathname, search params) goes through `NavigationContext` from `~app/contexts/navigation-context`. Use `getPathHooks(routeId)` to get `useParams`, `useQueryState`, and `useDefaultedQueryState` for a specific route - on a screen level (to keep screen call and page names tightly coupled).

## Page layout

- Authenticated screens are children of `ProtectedPage`; unauthenticated screens use `PublicPage`. Both live in `~app/components/`.
- Adding a new nav item means adding it to `ProtectedPage`'s `elements` array in `~app/components/page.tsx`.
- `PageHeader` accepts `startContent`, `endContent`, and `aside`; the `aside` slot is for destructive or secondary actions.

## Suspension fallbacks

The second argument to `suspendedFallback` must be a structural skeleton — not a spinner — that mirrors the DOM shape of the real component. Skeleton primitives (`SkeletonInput`, `SkeletonDateInput`, `SkeletonAvatar`, `SkeletonNumberInput`, `SkeletonSwitch`) exist in `~components/` and wrap the actual control with a `<Skeleton>` as `startContent`. The async component and its skeleton must share the same layout wrappers and spacing. See `@.docs/querying.md` for when and why to use `suspendedFallback`.

## Styling

- Styling is done via Tailwind (through Uniwind to apply to both web and native).
- Breakpoints are non-standard: `xs=320`, `sm=480`, `md=768`, `lg=1024`, `xl=1240` (defined in `global.css`). Prefer using responsive prefixes in `className`; reach for `useMediaSize` only when programmatic logic is needed.

## i18n

`useTranslation("namespace")` where the namespace matches the locale file name. A component that calls `useSuspenseQuery` and also needs translations should call `useTranslation` in both the async component and the fallback (the fallback runs before the suspense resolves).

## `testID` prop

Shared and reusable components that represent a logical UI unit should expose a `testID` prop (maps to `data-testid` on web). Feature-level components typically do not add `testID` themselves — those IDs live on the design-system primitives.
