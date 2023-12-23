import React from "react";

import { getCookies } from "cookies-next";
import type { AppType } from "next/dist/shared/lib/utils";
import Head from "next/head";
import "raf/polyfill";

import { ProtectedPage } from "app/components/protected-page";
import { PublicPage } from "app/components/public-page";
import { Toaster } from "app/components/toaster";
import { getSSRContextCookieData } from "app/contexts/ssr-context";
import { useRemoveTestQueryParams } from "app/hooks/use-remove-test-query-params";
import { applyRemaps } from "app/utils/nativewind";
import { useHydratedMark } from "next-app/hooks/use-hydrated-mark";
import { useLocalCookies } from "next-app/hooks/use-local-cookies";
import { useQueryClientHelper } from "next-app/hooks/use-query-client-helper";
import { useRemovePreloadedCss } from "next-app/hooks/use-remove-preloaded-css";
import { ClientProvider } from "next-app/providers/client";
import type { AppPage } from "next-app/types/page";
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

type PageProps = React.ComponentProps<typeof ClientProvider>;

declare module "next/app" {
	interface AppInitialProps {
		pageProps: PageProps;
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
			<ClientProvider {...pageProps}>
				<LayoutComponent>
					<Component />
				</LayoutComponent>
				<GlobalHooksComponent />
				<Toaster />
			</ClientProvider>
		</>
	);
};

MyApp.getInitialProps = async ({ ctx, router }) => {
	const cookies = getCookies(ctx);
	const pageProps: PageProps = {
		searchParams: router.query,
		ssrData: {
			...getSSRContextCookieData(cookies),
			nowTimestamp: Date.now(),
		},
	};
	return { pageProps };
};

export default trpcNext.withTRPC(MyApp);
