import React from "react";
import { AppRegistry } from "react-native";

import { wrapCreateRootRouteWithSentry } from "@sentry/tanstackstart-react";
import type { QueryClient } from "@tanstack/react-query";
import {
	HeadContent,
	Outlet,
	Scripts,
	createRootRouteWithContext,
} from "@tanstack/react-router";
import { serverOnly } from "@tanstack/react-start";
import { getHeaders } from "@tanstack/react-start/server";
import { keys, omit } from "remeda";

import type { LinksContextType } from "~app/contexts/links-context";
import { LinksContext } from "~app/contexts/links-context";
import { useColorModes } from "~app/hooks/use-color-modes";
import { InnerProvider } from "~app/providers/inner";
import type { I18nContext } from "~app/utils/i18n";
import type { StoreValues } from "~app/utils/store-data";
import { ToastProvider } from "~components/toast";
import type { TemporalInputMapping } from "~utils/date";
import { parsers } from "~utils/date";
import appCss from "~web/app.css?url";
import { useHydratedMark } from "~web/hooks/use-hydrated-mark";
import { useI18nHelper } from "~web/hooks/use-i18-helper";
import { useStoreLocalSettings } from "~web/hooks/use-local-settings";
import { useQueryClientHelper } from "~web/hooks/use-query-client-helper";
import { useToastHelper } from "~web/hooks/use-toast-helper";
import { DevToolsProvider } from "~web/providers/client/devtools";
import { NavigationProvider } from "~web/providers/client/navigation";
import { getTitle } from "~web/utils/i18n";
import {
	navigationContext,
	searchParamsWithDefaults,
} from "~web/utils/navigation";
import { captureSentryError } from "~web/utils/sentry";
import { storage } from "~web/utils/storage";
import { getStoreContext } from "~web/utils/store";

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
	AppRegistry.registerComponent("App", () => InnerProvider);
	// see https://github.com/necolas/react-native-web/issues/832#issuecomment-1229676492
	const { getStyleElement } = (
		AppRegistry as NativeWebAppRegistry
	).getApplication("App");
	// SSR and CSR style elements are different because of different environments
	// (e.g. no `window` to detect browser version and add polyfills)
	return getStyleElement({ suppressHydrationWarning: true });
};

const RootDocument: React.FC<React.PropsWithChildren> = ({ children }) => {
	const {
		selected: [selectedColorMode],
		last: [lastColorMode],
	} = useColorModes();
	const colorMode = selectedColorMode || lastColorMode;
	return (
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
};

const RootComponent = () => {
	const data = Route.useLoaderData();
	const baseLinksContext = React.use(LinksContext);
	const searchParams = Route.useSearch();

	const linksContext = React.useMemo<LinksContextType>(() => {
		// We want headers to only exist on server-side so we don't pass them in the context
		const headers = (
			typeof window === "undefined" ? serverOnly(getHeaders) : undefined
		)?.();
		return {
			debug: searchParams.debug,
			url:
				data.baseUrl && typeof window === "undefined"
					? new URL(baseLinksContext.url, data.baseUrl).toString()
					: baseLinksContext.url,
			// Don't batch requests when in tests - to evaluate pending / error states separately
			useBatch: !data.isTest,
			source: typeof window === "undefined" ? "ssr" : "csr",
			captureError: captureSentryError,
			headers,
		};
	}, [baseLinksContext.url, searchParams.debug, data]);
	const storeContext = React.useMemo(
		() =>
			getStoreContext(
				parsers.zonedDateTime(data.nowTimestamp),
				data.initialValues,
			),
		[data.initialValues, data.nowTimestamp],
	);
	return (
		<InnerProvider
			linksContext={linksContext}
			storeContext={storeContext}
			storage={storage}
			navigationContext={navigationContext}
			DevToolsProvider={DevToolsProvider}
			ToastProvider={ToastProvider}
			applyColorMode={(colorMode) => {
				const html = document.querySelector("html");
				if (!html) {
					return;
				}
				html.dataset.theme = colorMode;
				html.classList.add(colorMode);
				html.classList.remove(colorMode === "dark" ? "light" : "dark");
			}}
		>
			<RootDocument>
				<NavigationProvider>
					<Outlet />
					<GlobalHooksComponent />
				</NavigationProvider>
			</RootDocument>
		</InnerProvider>
	);
};

type EphemeralContext = {
	request: Request | null;
	queryClient: QueryClient;
	i18nContext: I18nContext;
};
const EPHEMERAL_CONTEXT_KEYS: Record<keyof EphemeralContext, true> = {
	request: true,
	queryClient: true,
	i18nContext: true,
};

export type RouterContext = {
	baseUrl: string;
	nowTimestamp: TemporalInputMapping["zonedDateTime"];
	initialValues: StoreValues;
	isTest: boolean;
} & EphemeralContext;

export type ExternalRouterContext = Pick<
	RouterContext,
	"initialValues" | "isTest"
>;

const wrappedCreateRootRouteWithContext = wrapCreateRootRouteWithSentry(
	createRootRouteWithContext,
);

export const Route = wrappedCreateRootRouteWithContext<RouterContext>()({
	component: RootComponent,
	staleTime: Infinity,
	loader: async (ctx) => {
		await ctx.context.i18nContext.loadNamespaces("default");
		return omit(ctx.context, keys(EPHEMERAL_CONTEXT_KEYS));
	},
	...searchParamsWithDefaults("__root__"),
	head: ({ match }) => {
		const title = getTitle(match.context.i18nContext, "index");
		return {
			meta: [
				// eslint-disable-next-line unicorn/text-encoding-identifier-case
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
					href: appCss,
				},
				{
					rel: "stylesheet",
					href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap",
				},
			],
		};
	},
});
