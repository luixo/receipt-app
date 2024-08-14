import React from "react";

import { getCookies } from "cookies-next";
import type { AppType } from "next/dist/shared/lib/utils";
import { Inter } from "next/font/google";
import Head from "next/head";
import "raf/polyfill";

import { ProtectedPage } from "~app/components/protected-page";
import { PublicPage } from "~app/components/public-page";
import { Toaster } from "~app/components/toaster";
import type { LinksContextType } from "~app/contexts/links-context";
import { LinksContext } from "~app/contexts/links-context";
import { usePretendUserClientKey } from "~app/hooks/use-pretend-user-client-key";
import { useRemoveTestQueryParams } from "~app/hooks/use-remove-test-query-params";
import { Provider } from "~app/providers/index";
import { getSSRContextCookieData } from "~app/utils/cookie-data";
import { applyRemaps } from "~app/utils/nativewind";
import type { AppPage } from "~utils/next";
import { useHtmlFont } from "~web/hooks/use-html-font";
import { useHydratedMark } from "~web/hooks/use-hydrated-mark";
import { useLocalCookies } from "~web/hooks/use-local-cookies";
import { useQueryClientHelper } from "~web/hooks/use-query-client-helper";
import { useRemovePreloadedCss } from "~web/hooks/use-remove-preloaded-css";
import { QueryDevToolsProvider } from "~web/providers/client/query-devtools";
import { ThemeProvider } from "~web/providers/client/theme";
import { nextCookieContext } from "~web/utils/next-cookies";
import { webPersister } from "~web/utils/persister";
import { captureSentryError } from "~web/utils/trpc";
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

const font = Inter({
	variable: "--font-sans",
	adjustFontFallback: true,
	display: "swap",
	fallback: [
		"ui-sans-serif",
		"system-ui",
		"sans-serif",
		'"Apple Color Emoji"',
		'"Segoe UI Emoji"',
		'"Segoe UI Symbol"',
		'"Noto Color Emoji"',
	],
	preload: true,
	style: "normal",
	subsets: ["cyrillic", "greek", "latin"],
	weight: ["400", "500", "700"],
});

type PageProps = Omit<
	React.ComponentProps<typeof Provider>,
	"cookiesContext" | "persister" | "linksContext" | "useQueryClientKey"
>;

const MyApp: AppType = ({ Component, pageProps }) => {
	// we don't use other Next.js types
	const PageComponent = Component as AppPage;
	const LayoutComponent = PageComponent.public ? PublicPage : ProtectedPage;
	// A bug in next.js
	const props = pageProps as PageProps;
	const baseLinksContext = React.useContext(LinksContext);
	const linksContext = React.useMemo<LinksContextType>(
		() => ({
			url: baseLinksContext.url,
			// Don't batch requests when in tests - to evaluate pending / error states separately
			useBatch: !props.searchParams.proxyPort,
			source: "csr-next",
			captureError: captureSentryError,
		}),
		[baseLinksContext.url, props.searchParams.proxyPort],
	);
	useHtmlFont(font.variable);
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
			<main className={`${font.variable} font-sans`}>
				<Provider
					cookiesData={props.cookiesData}
					linksContext={linksContext}
					searchParams={props.searchParams}
					cookiesContext={nextCookieContext}
					persister={webPersister}
					useQueryClientKey={usePretendUserClientKey}
				>
					<ThemeProvider>
						<QueryDevToolsProvider>
							<LayoutComponent>
								<PageComponent />
							</LayoutComponent>
							<GlobalHooksComponent />
							<Toaster />
						</QueryDevToolsProvider>
					</ThemeProvider>
				</Provider>
			</main>
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
