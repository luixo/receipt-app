import { withTRPC } from "@trpc/next";
import { Provider } from "app/provider";
import { ReactQueryDevtools } from "react-query/devtools";
import getConfig from "next/config";
import Head from "next/head";
import { getCookies } from "cookies-next";
import React from "react";
import { useDripsyTheme } from "dripsy";
import "raf/polyfill";
import type { AppRouter } from "./api/trpc/[trpc]";
import { NextConfig } from "next";
import {
	getQueryClientConfig,
	getSsrHost,
	TRPC_ENDPOINT,
} from "app/utils/queries";
import { AppType } from "next/dist/shared/lib/utils";
import {
	ColorModeConfig,
	LAST_COLOR_MODE_COOKIE_NAME,
	SELECTED_COLOR_MODE_COOKIE_NAME,
} from "app/contexts/color-mode-context";
import { useColorModeCookies } from "../hooks/use-color-mode-cookies";

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

const MyApp: AppType = ({ Component, pageProps, ...rest }) => {
	return (
		<>
			<Head>
				<title>Receipt App</title>
				<meta name="description" content="Receipt App built on Solito" />
				<link rel="icon" href="/favicon.svg" />
			</Head>
			<Provider initialColorModeConfig={pageProps.colorModeConfig}>
				<ReactQueryDevtools />
				<Component />
				<GlobalHooksComponent />
			</Provider>
		</>
	);
};

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
	config: () => {
		const queryClientConfig = getQueryClientConfig();
		if (typeof window !== "undefined") {
			return {
				url: TRPC_ENDPOINT,
				queryClientConfig,
			};
		}
		const nextConfig: NextConfig = getConfig();
		return {
			url: getSsrHost(nextConfig.serverRuntimeConfig?.port ?? 0),
			queryClientConfig,
		};
	},
	ssr: true,
})(MyApp);
