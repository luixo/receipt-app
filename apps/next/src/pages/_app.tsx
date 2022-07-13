import React from "react";

import { withTRPC } from "@trpc/next";
import { getCookies } from "cookies-next";
import { useDripsyTheme } from "dripsy";
import { NextConfig } from "next";
import getConfig from "next/config";
import { AppType } from "next/dist/shared/lib/utils";
import Head from "next/head";
import { ReactQueryDevtools } from "react-query/devtools";
import "raf/polyfill";
import superjson from "superjson";

import {
	ColorModeConfig,
	LAST_COLOR_MODE_COOKIE_NAME,
	SELECTED_COLOR_MODE_COOKIE_NAME,
} from "app/contexts/color-mode-context";
import { Provider } from "app/provider";
import {
	getQueryClientConfig,
	getSsrHost,
	TRPC_ENDPOINT,
} from "app/utils/queries";
import { useColorModeCookies } from "next-app/hooks/use-color-mode-cookies";
import type { AppRouter } from "next-app/pages/api/trpc/[trpc]";
import { AUTH_COOKIE } from "next-app/utils/auth-cookie";
import { getCookie, serialize } from "next-app/utils/cookie";

const GlobalStyles: React.FC = () => {
	const { theme } = useDripsyTheme();
	return (
		<style>{`
			body {
				background-color: ${theme.colors.$background};
			}
		`}</style>
	);
};

const GlobalHooksComponent: React.FC = () => {
	useColorModeCookies();
	return null;
};

declare module "next/app" {
	type ExtraAppInitialProps = {
		colorModeConfig: ColorModeConfig;
	};

	interface AppInitialProps {
		pageProps: ExtraAppInitialProps;
	}
}

const MyApp: AppType = ({ Component, pageProps }) => (
	<>
		<Head>
			<title>Receipt App</title>
			<meta name="description" content="Receipt App built on Solito" />
			<link rel="icon" href="/favicon.svg" />
		</Head>
		<Provider initialColorModeConfig={pageProps.colorModeConfig}>
			<GlobalStyles />
			<ReactQueryDevtools />
			<Component />
			<GlobalHooksComponent />
		</Provider>
	</>
);

MyApp.getInitialProps = async ({ ctx }) => {
	const cookies = getCookies(ctx);
	return {
		pageProps: {
			colorModeConfig: {
				last: cookies[LAST_COLOR_MODE_COOKIE_NAME],
				selected: cookies[SELECTED_COLOR_MODE_COOKIE_NAME],
			} as ColorModeConfig,
		},
	};
};

export default withTRPC<AppRouter>({
	config: ({ ctx }) => {
		const queryClientConfig = getQueryClientConfig();
		const debugHeader = ctx?.query.debug ? "true" : undefined;
		if (typeof window !== "undefined") {
			return {
				url: TRPC_ENDPOINT,
				queryClientConfig,
				headers: {
					debug: debugHeader,
				},
				transformer: superjson,
			};
		}
		const nextConfig: NextConfig = getConfig();
		const authToken = ctx?.req ? getCookie(ctx.req, AUTH_COOKIE) : undefined;
		return {
			url: getSsrHost(nextConfig.serverRuntimeConfig?.port ?? 0),
			queryClientConfig,
			headers: {
				debug: debugHeader,
				cookie: authToken ? serialize(AUTH_COOKIE, authToken) : undefined,
			},
			transformer: superjson,
		};
	},
	ssr: true,
})(MyApp);
