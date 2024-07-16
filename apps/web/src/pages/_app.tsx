import React from "react";

import { getCookies } from "cookies-next";
import type { AppType } from "next/dist/shared/lib/utils";
import Head from "next/head";
import "raf/polyfill";

import { ProtectedPage } from "~app/components/protected-page";
import { PublicPage } from "~app/components/public-page";
import { Toaster } from "~app/components/toaster";
import { useRemoveTestQueryParams } from "~app/hooks/use-remove-test-query-params";
import { Provider } from "~app/providers/index";
import { getSSRContextCookieData } from "~app/utils/cookie-data";
import { applyRemaps } from "~app/utils/nativewind";
import type { AppPage } from "~utils";
import { useHydratedMark } from "~web/hooks/use-hydrated-mark";
import { useLocalCookies } from "~web/hooks/use-local-cookies";
import { useQueryClientHelper } from "~web/hooks/use-query-client-helper";
import { useRemovePreloadedCss } from "~web/hooks/use-remove-preloaded-css";
import { QueryDevToolsProvider } from "~web/providers/client/query-devtools";
import { ThemeProvider } from "~web/providers/client/theme";
import { nextCookieContext } from "~web/utils/client-cookies";
import { webPersister } from "~web/utils/persister";
import { useLinks } from "~web/utils/trpc";
import "~app/global.css";

applyRemaps();

const GlobalHooksComponent: React.FC = () => {
	useLocalCookies();
	useQueryClientHelper();
	useHydratedMark();
	useRemoveTestQueryParams();
	useRemovePreloadedCss();
	return null;
};

type PageProps = Omit<
	React.ComponentProps<typeof Provider>,
	"cookiesContext" | "persister" | "links"
>;

declare module "next/app" {
	interface AppInitialProps {
		pageProps: PageProps;
	}
}

const MyApp: AppType = ({ Component, pageProps }) => {
	const LayoutComponent = (Component as AppPage).public
		? PublicPage
		: ProtectedPage;
	// A bug in next.js
	const props = pageProps as PageProps;
	const links = useLinks(props.searchParams);
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
			<Provider
				{...props}
				links={links}
				cookiesContext={nextCookieContext}
				persister={webPersister}
			>
				<ThemeProvider>
					<QueryDevToolsProvider>
						<LayoutComponent>
							<Component />
						</LayoutComponent>
						<GlobalHooksComponent />
						<Toaster />
					</QueryDevToolsProvider>
				</ThemeProvider>
			</Provider>
		</>
	);
};

MyApp.getInitialProps = async ({ ctx, router }) => {
	const cookies = getCookies(ctx);
	const pageProps: PageProps = {
		searchParams: router.query,
		cookiesData: {
			values: getSSRContextCookieData(cookies),
			nowTimestamp: Date.now(),
		},
	};
	return { pageProps };
};

export default MyApp;
