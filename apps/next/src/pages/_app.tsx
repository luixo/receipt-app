import React from "react";

import { globalCss } from "@nextui-org/react";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { getCookies } from "cookies-next";
import { AppType } from "next/dist/shared/lib/utils";
import Head from "next/head";
import "raf/polyfill";

import { ProtectedPage } from "app/components/protected-page";
import {
	ColorModeConfig,
	LAST_COLOR_MODE_COOKIE_NAME,
	SELECTED_COLOR_MODE_COOKIE_NAME,
} from "app/contexts/color-mode-context";
import { Provider } from "app/provider";
import { useColorModeCookies } from "next-app/hooks/use-color-mode-cookies";
import { PageWithLayout } from "next-app/types/page";
import { trpcNext } from "next-app/utils/trpc";

const globalStyles = globalCss({
	html: {
		overflowX: "hidden",
	},
});

const GlobalHooksComponent: React.FC = () => {
	globalStyles();
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

const MyApp: AppType = ({ Component, pageProps }) => {
	const LayoutComponent =
		(Component as PageWithLayout).LayoutComponent || ProtectedPage;
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
			<Provider initialColorModeConfig={pageProps.colorModeConfig}>
				<ReactQueryDevtools />
				<LayoutComponent>
					<Component />
				</LayoutComponent>
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

export default trpcNext.withTRPC(MyApp);
