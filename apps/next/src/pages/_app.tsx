import React from "react";

import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { getCookies } from "cookies-next";
import type { AppType } from "next/dist/shared/lib/utils";
import Head from "next/head";
import "raf/polyfill";

import { ProtectedPage } from "app/components/protected-page";
import { PublicPage } from "app/components/public-page";
import { Toaster } from "app/components/toaster";
import type { ColorModeConfig } from "app/contexts/color-mode-context";
import {
	LAST_COLOR_MODE_COOKIE_NAME,
	SELECTED_COLOR_MODE_COOKIE_NAME,
} from "app/contexts/color-mode-context";
import {
	SETTINGS_COOKIE_NAME,
	validateSettings,
} from "app/contexts/settings-context";
import {
	SSR_CONTEXT_COOKIE_NAME,
	getSSRContextData,
} from "app/contexts/ssr-context";
import type { Props as ProviderProps } from "app/provider";
import { Provider } from "app/provider";
import { applyRemaps } from "app/utils/nativewind";
import { useColorModeCookies } from "next-app/hooks/use-color-mode-cookies";
import { useHydratedMark } from "next-app/hooks/use-hydrated-mark";
import { useQueryClientHelper } from "next-app/hooks/use-query-client-helper";
import { useRemoveTestQueryParams } from "next-app/hooks/use-remove-test-query-params";
import { useSettingsCookies } from "next-app/hooks/use-settings-cookies";
import { useSSRContextCookies } from "next-app/hooks/use-ssr-context-cookies";
import type { AppPage } from "next-app/types/page";
import { trpcNext } from "next-app/utils/trpc";
import "next-app/global.css";

applyRemaps();

const GlobalHooksComponent: React.FC = () => {
	useColorModeCookies();
	useSettingsCookies();
	useSSRContextCookies();
	useQueryClientHelper();
	useHydratedMark();
	useRemoveTestQueryParams();
	return null;
};

declare module "next/app" {
	interface AppInitialProps {
		pageProps: ProviderProps;
	}
}

const MyApp: AppType = ({ Component, pageProps }) => {
	const LayoutComponent = (Component as AppPage).public
		? PublicPage
		: ProtectedPage;
	return (
		<>
			<Head>
				<title>Receipt App</title>
				<meta name="description" content="Receipt App built on Solito" />
				<meta
					name="viewport"
					content="width=device-width, initial-scale=1, maximum-scale=1"
				/>
				<link rel="icon" href="/favicon.svg" />
			</Head>
			<Provider {...pageProps}>
				<ReactQueryDevtools />
				<LayoutComponent>
					<Component />
				</LayoutComponent>
				<GlobalHooksComponent />
				<Toaster />
			</Provider>
		</>
	);
};

MyApp.getInitialProps = async ({ ctx, router }) => {
	const cookies = getCookies(ctx);
	const pageProps: ProviderProps = {
		colorModeConfig: {
			last: cookies[LAST_COLOR_MODE_COOKIE_NAME],
			selected: cookies[SELECTED_COLOR_MODE_COOKIE_NAME],
		} as ColorModeConfig,
		settings: validateSettings(cookies[SETTINGS_COOKIE_NAME]),
		query: router.query,
		ssrContext: getSSRContextData(cookies[SSR_CONTEXT_COOKIE_NAME]),
	};
	return { pageProps };
};

export default trpcNext.withTRPC(MyApp);
