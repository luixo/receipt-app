import React from "react";
import { View } from "react-native";

import type { QueryClient } from "@tanstack/react-query";
import { dehydrate, hydrate } from "@tanstack/react-query";
import type {
	ErrorRouteComponent,
	NotFoundRouteComponent,
} from "@tanstack/react-router";
import {
	createRouter as createTanStackRouter,
	useRouter,
} from "@tanstack/react-router";
import { serverOnly } from "@tanstack/react-start";
import { getWebRequest } from "@tanstack/react-start/server";
import i18n from "i18next";
import { I18nextProvider } from "react-i18next";
import { clone } from "remeda";

import { ErrorComponent } from "~app/components/suspense-wrapper";
import { LinksContext } from "~app/contexts/links-context";
import type { QueryClientsRecord } from "~app/contexts/query-clients-context";
import {
	QueryClientsContext,
	SELF_QUERY_CLIENT_KEY,
	getQueryClient,
} from "~app/contexts/query-clients-context";
import { QueryProvider } from "~app/providers/query";
import {
	ensureI18nInitialized,
	getBackendModule,
	getLanguageFromRequest,
	i18nInitOptions,
} from "~app/utils/i18n";
import type { Language } from "~app/utils/i18n-data";
import { PRETEND_USER_STORE_NAME } from "~app/utils/store/pretend-user";
import { Spinner } from "~components/spinner";
import { Text } from "~components/text";
import { getNow, serialize } from "~utils/date";
import { transformer } from "~utils/transformer";
import type { ExternalRouterContext } from "~web/pages/__root";
import { HydrationBoundary } from "~web/utils/ssr";
import { getHostUrl } from "~web/utils/url";

import { routeTree } from "./routeTree.gen";

const NotFoundComponent: NotFoundRouteComponent = () => (
	<View>
		<Text>Not found!</Text>
	</View>
);

const RootErrorComponent: ErrorRouteComponent = ({ error, reset }) => {
	const router = useRouter();
	const { captureError } = React.use(LinksContext);
	React.useEffect(() => {
		captureError(error);
	}, [captureError, error]);
	const resetInvalidate = React.useCallback(() => {
		reset();
		void router.invalidate();
	}, [reset, router]);
	return <ErrorComponent error={error} reset={resetInvalidate} />;
};

const getLocalQueryClient = (queryClient: QueryClient) => {
	if (typeof window === "undefined") {
		return queryClient;
	}
	const dehydratedState = dehydrate(queryClient, {
		serializeData: transformer.serialize,
	});
	const hydratedClient = getQueryClient();
	hydrate(hydratedClient, dehydratedState, {
		defaultOptions: {
			deserializeData: transformer.deserialize,
		},
	});
	return hydratedClient;
};

export const createRouter = (externalContext: ExternalRouterContext) => {
	const request = import.meta.env.SSR ? serverOnly(getWebRequest)() : null;
	const queryClient = getQueryClient();
	const i18nInstance = i18n
		// Options are cloned because i18next mutates properties inline
		// causing different request to get same e.g. namespaces
		.createInstance(clone(i18nInitOptions))
		.use(getBackendModule());
	const initialLanguage = getLanguageFromRequest(request);
	return createTanStackRouter({
		routeTree,
		context: {
			...externalContext,
			request,
			baseUrl: request ? getHostUrl(request.url) : "",
			initialLanguage,
			i18n: i18nInstance,
			queryClient,
			nowTimestamp: serialize<"zonedDateTime">(getNow.zonedDateTime()),
		},
		defaultNotFoundComponent: NotFoundComponent,
		defaultErrorComponent: RootErrorComponent,
		defaultPendingComponent: Spinner,
		// Don't rerun loaders on the client
		defaultStaleTime: Infinity,
		defaultPreloadStaleTime: 0,
		dehydrate: () => ({
			dehydratedState: dehydrate(queryClient, {
				serializeData: transformer.serialize,
			}),
			i18n: {
				language: i18nInstance.language as Language,
				data: i18nInstance.store.data,
			},
		}),
		hydrate: (dehydratedData) => {
			void ensureI18nInitialized({
				i18n: i18nInstance,
				initialLanguage: dehydratedData.i18n.language,
				resources: dehydratedData.i18n.data,
			});
			hydrate(queryClient, dehydratedData.dehydratedState, {
				defaultOptions: {
					deserializeData: transformer.deserialize,
				},
			});
		},
		Wrap: ({ children }) => {
			const pretendEmail =
				externalContext.initialValues[PRETEND_USER_STORE_NAME].email;
			// We're doing useState instead of useMemo
			// Because we don't want to rerender Wrap on every queryClient change
			// eslint-disable-next-line react/hook-use-state
			const queryClientsState = React.useState<QueryClientsRecord>(() => {
				const localQueryClient = getLocalQueryClient(queryClient);
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
				<I18nextProvider i18n={i18nInstance}>
					<QueryClientsContext value={queryClientsState}>
						<QueryProvider
							queryClientKey={pretendEmail || SELF_QUERY_CLIENT_KEY}
						>
							{children}
						</QueryProvider>
					</QueryClientsContext>
				</I18nextProvider>
			);
		},
		InnerWrap: ({ children }) => (
			<HydrationBoundary>{children}</HydrationBoundary>
		),
	});
};

export type TreeRouter = ReturnType<typeof createRouter>;

declare module "@tanstack/react-router" {
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface Register {
		router: TreeRouter;
	}
}
