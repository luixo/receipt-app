import React from "react";

import { getCookies } from "cookies-next";
import type { AppType } from "next/dist/shared/lib/utils";
import { Inter } from "next/font/google";
import Head from "next/head";
import { useQueryState } from "nuqs";
import { NuqsAdapter } from "nuqs/adapters/next/pages";
import "raf/polyfill";

import { ProtectedPage } from "~app/components/protected-page";
import { PublicPage } from "~app/components/public-page";
import { Toaster } from "~app/components/toaster";
import type { LinksContextType } from "~app/contexts/links-context";
import { LinksContext } from "~app/contexts/links-context";
import { usePretendUserClientKey } from "~app/hooks/use-pretend-user-client-key";
import { Provider } from "~app/providers/index";
import { applyRemaps } from "~app/utils/nativewind";
import { persister } from "~app/utils/persister";
import { getStoreContext } from "~app/utils/store";
import type { StoreValues } from "~app/utils/store-data";
import { getStoreValuesFromInitialValues } from "~app/utils/store-data";
import type { AppPage } from "~utils/next";
import { useHtmlFont } from "~web/hooks/use-html-font";
import { useHydratedMark } from "~web/hooks/use-hydrated-mark";
import { useStoreLocalSettings } from "~web/hooks/use-local-settings";
import { useQueryClientHelper } from "~web/hooks/use-query-client-helper";
import { useRemovePreloadedCss } from "~web/hooks/use-remove-preloaded-css";
import { NavigationProvider } from "~web/providers/client/navigation";
import { QueryDevToolsProvider } from "~web/providers/client/query-devtools";
import { ThemeProvider } from "~web/providers/client/theme";
import { captureSentryError, loadLinksParams } from "~web/utils/trpc";
import "~app/global.css";

applyRemaps();

const useRemoveTestQueryParams = () => {
	const [, setProxyPort] = useQueryState("proxyPort");
	const [, setControllerId] = useQueryState("controllerId");
	React.useEffect(() => {
		void setProxyPort(null);
		void setControllerId(null);
	}, [setControllerId, setProxyPort]);
};

const GlobalHooksComponent: React.FC = () => {
	useStoreLocalSettings();
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
	"storeContext" | "persister" | "linksContext" | "useQueryClientKey"
> & {
	linksParams: Awaited<ReturnType<typeof loadLinksParams>>;
	nowTimestamp: number;
	initialValues: StoreValues;
};

const MyApp: AppType = ({ Component, pageProps }) => {
	// we don't use other Next.js types
	const PageComponent = Component as AppPage;
	const LayoutComponent = PageComponent.public ? PublicPage : ProtectedPage;
	// A bug in next.js
	const props = pageProps as PageProps;
	const baseLinksContext = React.useContext(LinksContext);
	const linksContext = React.useMemo<LinksContextType>(
		() => ({
			searchParams: props.linksParams,
			url: baseLinksContext.url,
			// Don't batch requests when in tests - to evaluate pending / error states separately
			useBatch: !props.linksParams.proxyPort,
			source: "csr-next",
			captureError: captureSentryError,
		}),
		[baseLinksContext.url, props.linksParams],
	);
	useHtmlFont(font.variable);
	const storeContext = React.useMemo(
		() => getStoreContext(props.nowTimestamp, props.initialValues),
		[props.initialValues, props.nowTimestamp],
	);
	return (
		<>
			<Head>
				<title>Receipt App</title>
				<meta name="description" content="Receipt App" />
				<meta
					name="viewport"
					content="width=device-width, initial-scale=1, maximum-scale=1"
				/>
				<link rel="icon" href="/favicon.svg" />
			</Head>
			<main className={`${font.variable} font-sans`}>
				<NuqsAdapter>
					<Provider
						linksContext={linksContext}
						storeContext={storeContext}
						persister={persister}
						useQueryClientKey={usePretendUserClientKey}
					>
						<ThemeProvider>
							<NavigationProvider>
								<QueryDevToolsProvider>
									<LayoutComponent>
										<PageComponent />
									</LayoutComponent>
									<GlobalHooksComponent />
									<Toaster />
								</QueryDevToolsProvider>
							</NavigationProvider>
						</ThemeProvider>
					</Provider>
				</NuqsAdapter>
			</main>
		</>
	);
};

MyApp.getInitialProps = async ({ ctx, router }) => {
	const cookies = getCookies(ctx);
	const pageProps: PageProps = {
		linksParams: loadLinksParams(router.query),
		initialValues: getStoreValuesFromInitialValues(cookies),
		nowTimestamp: Date.now(),
	};
	return { pageProps };
};

export default MyApp;
