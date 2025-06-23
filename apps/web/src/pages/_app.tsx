import React from "react";

import { parse, serialize } from "cookie";
import type { AppType } from "next/dist/shared/lib/utils";
import { Inter } from "next/font/google";
import Head from "next/head";
import { z } from "zod/v4";

import { ProtectedPage } from "~app/components/protected-page";
import { PublicPage } from "~app/components/public-page";
import { Toaster } from "~app/components/toaster";
import type { LinksContextType } from "~app/contexts/links-context";
import { LinksContext } from "~app/contexts/links-context";
import {
	QueryClientsContext,
	SELF_QUERY_CLIENT_KEY,
	getQueryClient,
} from "~app/contexts/query-clients-context";
import { useMountEffect } from "~app/hooks/use-mount-effect";
import { useSearchParams } from "~app/hooks/use-navigation";
import { Provider } from "~app/providers/index";
import { applyRemaps } from "~app/utils/nativewind";
import { persister } from "~app/utils/persister";
import { getStoreContext } from "~app/utils/store";
import { PRETEND_USER_STORE_NAME } from "~app/utils/store/pretend-user";
import type { StoreValues } from "~app/utils/store-data";
import { getStoreValuesFromInitialValues } from "~app/utils/store-data";
import type { AppPage } from "~utils/next";
import { useHydratedMark } from "~web/hooks/use-hydrated-mark";
import { useStoreLocalSettings } from "~web/hooks/use-local-settings";
import { useQueryClientHelper } from "~web/hooks/use-query-client-helper";
import { DevToolsProvider } from "~web/providers/client/devtools";
import { NavigationProvider } from "~web/providers/client/navigation";
import { ThemeProvider } from "~web/providers/client/theme";
import { captureSentryError } from "~web/utils/sentry";
import "~app/global.css";

export const NATIVE_STYLESHEET_PRELOAD_ID = "react-native-preload-stylesheet";

applyRemaps();

export const rootSearchParamsSchema = z
	.object({
		proxyPort: z.coerce.number().catch(0),
		controllerId: z.uuid().catch(""),
		debug: z.coerce.boolean().catch(false),
	})
	.partial();

const useRemoveTestQueryParams = () => {
	const [, setParams] = useSearchParams(rootSearchParamsSchema);
	React.useEffect(() => {
		setParams((prevValues) => ({
			...prevValues,
			controllerId: undefined,
			proxyPort: undefined,
		}));
	}, [setParams]);
};

const useHtmlFont = (fontVariable: string) => {
	React.useEffect(() => {
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		const html = document.querySelector("html")!;
		html.classList.add(fontVariable);
		html.classList.add("font-sans");
		return () => html.classList.remove(fontVariable);
	}, [fontVariable]);
};

const useRemovePreloadedCss = () => {
	useMountEffect(() => {
		const style = document.getElementById(NATIVE_STYLESHEET_PRELOAD_ID);
		style?.remove();
	});
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
	"storeContext" | "persister" | "linksContext" | "initialQueryClients"
> & {
	linksParams: z.infer<typeof rootSearchParamsSchema>;
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
			source: "csr",
			captureError: captureSentryError,
		}),
		[baseLinksContext.url, props.linksParams],
	);
	useHtmlFont(font.variable);
	const storeContext = React.useMemo(
		() => getStoreContext(serialize, props.nowTimestamp, props.initialValues),
		[props.initialValues, props.nowTimestamp],
	);
	// We're using this state as context value so we don't destructure it
	// eslint-disable-next-line react/hook-use-state
	const queryClientsState = React.useState(() => {
		const localQueryClient = getQueryClient();
		const pretendEmail = props.initialValues[PRETEND_USER_STORE_NAME].email;
		return pretendEmail
			? {
					[pretendEmail]: localQueryClient,
					[SELF_QUERY_CLIENT_KEY]: getQueryClient(),
			  }
			: {
					[SELF_QUERY_CLIENT_KEY]: localQueryClient,
			  };
	});
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
				<QueryClientsContext.Provider value={queryClientsState}>
					<Provider
						linksContext={linksContext}
						storeContext={storeContext}
						persister={persister}
					>
						<ThemeProvider>
							<NavigationProvider>
								<DevToolsProvider>
									<LayoutComponent>
										<PageComponent />
									</LayoutComponent>
									<GlobalHooksComponent />
									<Toaster />
								</DevToolsProvider>
							</NavigationProvider>
						</ThemeProvider>
					</Provider>
				</QueryClientsContext.Provider>
			</main>
		</>
	);
};

MyApp.getInitialProps = async ({ ctx, router }) => {
	const cookies = parse(
		ctx.req ? ctx.req.headers.cookie ?? "" : document.cookie,
	);
	const validatedParams = rootSearchParamsSchema.safeParse(router.query);
	const pageProps: PageProps = {
		linksParams: validatedParams.success ? validatedParams.data : {},
		initialValues: getStoreValuesFromInitialValues(cookies),
		nowTimestamp: Date.now(),
	};
	return { pageProps };
};

export default MyApp;
