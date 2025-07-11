import React from "react";
import { AppRegistry } from "react-native";

import { wrapCreateRootRouteWithSentry } from "@sentry/tanstackstart-react";
import type { QueryClient } from "@tanstack/react-query";
import {
	HeadContent,
	Outlet,
	Scripts,
	createRootRouteWithContext,
	stripSearchParams,
} from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { serialize } from "cookie";
import type { i18n as i18nType } from "i18next";
import { fromEntries, keys, omit } from "remeda";
import { z } from "zod";

import type { LinksContextType } from "~app/contexts/links-context";
import { LinksContext } from "~app/contexts/links-context";
import globalCss from "~app/global.css?url";
import { useNavigate } from "~app/hooks/use-navigation";
import { Provider } from "~app/providers/index";
import { getServerSideT, loadNamespaces } from "~app/utils/i18n";
import type { Language } from "~app/utils/i18n-data";
import { applyRemaps } from "~app/utils/nativewind";
import { persister } from "~app/utils/persister";
import { getStoreContext } from "~app/utils/store";
import type { ColorMode } from "~app/utils/store/color-modes";
import {
	LAST_COLOR_MODE_STORE_NAME,
	SELECTED_COLOR_MODE_STORE_NAME,
} from "~app/utils/store/color-modes";
import type { StoreValues } from "~app/utils/store-data";
import { ToastProvider, defaultToastProps } from "~components/toast";
import type { TemporalInputMapping } from "~utils/date";
import { parsers } from "~utils/date";
import { useHydratedMark } from "~web/hooks/use-hydrated-mark";
import { useI18nHelper } from "~web/hooks/use-i18-helper";
import { useStoreLocalSettings } from "~web/hooks/use-local-settings";
import { useQueryClientHelper } from "~web/hooks/use-query-client-helper";
import { useToastHelper } from "~web/hooks/use-toast-helper";
import { DevToolsProvider } from "~web/providers/client/devtools";
import { NavigationProvider } from "~web/providers/client/navigation";
import { ThemeProvider } from "~web/providers/client/theme";
import { searchParamsWithDefaults } from "~web/utils/navigation";
import { captureSentryError } from "~web/utils/sentry";

applyRemaps();

const useTestSearchParams = () => {
	const searchParams = Route.useSearch();
	const navigate = useNavigate();
	// We remove these params so they don't pop up in the URL
	const removeTestSearchParams = React.useCallback(() => {
		void navigate({
			replace: true,
			search: (prev) => ({
				...prev,
				proxyPort: undefined,
				controllerId: undefined,
			}),
		});
	}, [navigate]);
	// eslint-disable-next-line react/hook-use-state
	const [initialSearchParams] = React.useState(() => searchParams);
	return [initialSearchParams, removeTestSearchParams] as const;
};

const GlobalHooksComponent: React.FC = () => {
	useStoreLocalSettings();
	useToastHelper();
	useQueryClientHelper();
	useI18nHelper();
	useHydratedMark();
	return null;
};

type NativeWebAppRegistry = typeof AppRegistry & {
	getApplication: (name: string) => {
		getStyleElement: (
			props: React.ComponentProps<"style">,
		) => React.ReactElement;
	};
};

const getNativeCss = () => {
	AppRegistry.registerComponent("App", () => Provider);
	// see https://github.com/necolas/react-native-web/issues/832#issuecomment-1229676492
	const { getStyleElement } = (
		AppRegistry as NativeWebAppRegistry
	).getApplication("App");
	// SSR and CSR style elements are different because of different environments
	// (e.g. no `window` to detect browser version and add polyfills)
	return getStyleElement({ suppressHydrationWarning: true });
};

const RootDocument: React.FC<
	React.PropsWithChildren<{
		colorMode: ColorMode;
	}>
> = ({ children, colorMode }) => (
	<html lang="en" className={colorMode}>
		<head>
			{getNativeCss()}
			<HeadContent />
		</head>
		<body>
			<main className="font-sans">{children}</main>
			<Scripts />
		</body>
	</html>
);

const RootComponent = () => {
	const data = Route.useLoaderData();
	const baseLinksContext = React.use(LinksContext);
	const [initialSearchParams, removeTestSearchParams] = useTestSearchParams();
	React.useEffect(() => removeTestSearchParams(), [removeTestSearchParams]);

	const linksContext = React.useMemo<LinksContextType>(
		() => ({
			debug: initialSearchParams.debug,
			url:
				data.baseUrl && typeof window === "undefined"
					? new URL(baseLinksContext.url, data.baseUrl).toString()
					: baseLinksContext.url,
			// Don't batch requests when in tests - to evaluate pending / error states separately
			useBatch: !initialSearchParams.controllerId,
			source: typeof window === "undefined" ? "ssr" : "csr",
			captureError: captureSentryError,
			// We should check for just `data.request`, but serialization makes it complicated
			headers: data.request?.headers
				? fromEntries([...data.request.headers.entries()])
				: undefined,
		}),
		[baseLinksContext.url, data.baseUrl, initialSearchParams, data.request],
	);
	const storeContext = React.useMemo(
		() =>
			getStoreContext(
				serialize,
				parsers.zonedDateTime(data.nowTimestamp),
				data.initialValues,
			),
		[data.initialValues, data.nowTimestamp],
	);
	const colorMode =
		data.initialValues[SELECTED_COLOR_MODE_STORE_NAME] ||
		data.initialValues[LAST_COLOR_MODE_STORE_NAME];
	return (
		<RootDocument colorMode={colorMode}>
			<Provider
				linksContext={linksContext}
				storeContext={storeContext}
				persister={persister}
			>
				<ThemeProvider>
					<NavigationProvider>
						<DevToolsProvider>
							<Outlet />
							<GlobalHooksComponent />
							<ToastProvider toastProps={defaultToastProps} />
						</DevToolsProvider>
					</NavigationProvider>
				</ThemeProvider>
			</Provider>
		</RootDocument>
	);
};

type EphemeralContext = {
	queryClient: QueryClient;
	i18n: i18nType;
};
const EPHEMERAL_CONTEXT_KEYS: Record<keyof EphemeralContext, true> = {
	queryClient: true,
	i18n: true,
};

export type RouterContext = {
	baseUrl: string;
	nowTimestamp: TemporalInputMapping["zonedDateTime"];
	initialValues: StoreValues;
	initialLanguage: Language;
	request: Request | null;
} & EphemeralContext;

export type ExternalRouterContext = Pick<RouterContext, "initialValues">;

export const [rootSearchParamsSchema, rootSearchParamsDefaults] =
	searchParamsWithDefaults(
		z.object({
			proxyPort: z.coerce.number(),
			controllerId: z.uuid(),
			debug: z.coerce.boolean(),
			redirect: z.string(),
		}),
		{
			proxyPort: 0,
			controllerId: "",
			debug: false,
			redirect: "",
		},
	);

const wrappedCreateRootRouteWithContext = wrapCreateRootRouteWithSentry(
	createRootRouteWithContext,
);

export const Route = wrappedCreateRootRouteWithContext<RouterContext>()({
	component: RootComponent,
	staleTime: Infinity,
	loader: async (ctx) => {
		await loadNamespaces(ctx.context, "default");
		return omit(ctx.context, keys(EPHEMERAL_CONTEXT_KEYS));
	},
	search: { middlewares: [stripSearchParams(rootSearchParamsDefaults)] },
	validateSearch: zodValidator(rootSearchParamsSchema),
	head: ({ match }) => {
		const t = getServerSideT(match.context, "default");
		const title = t("titles.index");
		return {
			meta: [
				{ charSet: "utf-8" },
				{
					name: "viewport",
					content: "width=device-width, initial-scale=1, maximum-scale=1",
				},
				{ title },
				{ name: "description", description: title },
			],
			links: [
				{ rel: "icon", href: "/favicon.svg" },
				{
					rel: "stylesheet",
					href: globalCss,
				},
				{
					rel: "stylesheet",
					href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap",
				},
			],
		};
	},
});
