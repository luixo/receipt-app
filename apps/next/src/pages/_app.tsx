import React from "react";

import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import type { AppType } from "next/dist/shared/lib/utils";
import Head from "next/head";
import "raf/polyfill";

import { ProtectedPage } from "app/components/protected-page";
import { PublicPage } from "app/components/public-page";
import { Toaster } from "app/components/toaster";
import { getSSRContextCookieData } from "app/contexts/ssr-context";
import { useBooleanState } from "app/hooks/use-boolean-state";
import { useMountEffect } from "app/hooks/use-mount-effect";
import type { Props as ProviderProps } from "app/provider";
import { Provider } from "app/provider";
import { applyRemaps } from "app/utils/nativewind";
import { useHydratedMark } from "next-app/hooks/use-hydrated-mark";
import { useLocalCookies } from "next-app/hooks/use-local-cookies";
import { useQueryClientHelper } from "next-app/hooks/use-query-client-helper";
import { useRemovePreloadedCss } from "next-app/hooks/use-remove-preloaded-css";
import { useRemoveTestQueryParams } from "next-app/hooks/use-remove-test-query-params";
import type { AppPage } from "next-app/types/page";
import { getCookies } from "next-app/utils/client-cookies";
import { trpcNext } from "next-app/utils/trpc";
import "next-app/global.css";

applyRemaps();

const GlobalHooksComponent: React.FC = () => {
	useLocalCookies();
	useQueryClientHelper();
	useHydratedMark();
	useRemoveTestQueryParams();
	useRemovePreloadedCss();
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
	const [isMounted, { setTrue: setMounted }] = useBooleanState();
	useMountEffect(setMounted);
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
				{/* When running with NODE_ENV=test hydration mismatch error appears */}
				{isMounted ? <ReactQueryDevtools /> : null}
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
		query: router.query,
		ssrContext: {
			...getSSRContextCookieData(cookies),
			nowTimestamp: Date.now(),
		},
	};
	return { pageProps };
};

export default trpcNext.withTRPC(MyApp);
