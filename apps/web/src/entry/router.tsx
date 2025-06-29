import React from "react";
import { View } from "react-native";

import * as Sentry from "@sentry/tanstackstart-react";
import type { QueryClient } from "@tanstack/react-query";
import { dehydrate, hydrate } from "@tanstack/react-query";
import type {
	ErrorRouteComponent,
	NotFoundRouteComponent,
} from "@tanstack/react-router";
import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { serverOnly } from "@tanstack/react-start";
import { getWebRequest } from "@tanstack/react-start/server";
import i18n from "i18next";
import { I18nextProvider } from "react-i18next";
import { clone } from "remeda";

import type { QueryClientsRecord } from "~app/contexts/query-clients-context";
import {
	QueryClientsContext,
	SELF_QUERY_CLIENT_KEY,
	getQueryClient,
} from "~app/contexts/query-clients-context";
import {
	getBackendModule,
	getLanguageFromRequest,
	i18nInitOptions,
} from "~app/utils/i18n";
import { PRETEND_USER_STORE_NAME } from "~app/utils/store/pretend-user";
import { Text } from "~components/text";
import type { ExternalRouterContext } from "~web/pages/__root";
import { getHostUrl } from "~web/utils/url";

import { routeTree } from "./routeTree.gen";

const NotFoundComponent: NotFoundRouteComponent = () => <View>Not found!</View>;

const ErrorComponent: ErrorRouteComponent = ({ error }) => {
	React.useEffect(() => {
		void Sentry.captureException(error);
	}, [error]);
	return (
		<View>
			<Text>Something went wrong!</Text>
		</View>
	);
};

const getLocalQueryClient = (queryClient: QueryClient) => {
	if (typeof window === "undefined") {
		return queryClient;
	}
	const dehydratedState = dehydrate(queryClient);
	const hydratedClient = getQueryClient();
	hydrate(hydratedClient, dehydratedState);
	return hydratedClient;
};

export const createRouter = (externalContext: ExternalRouterContext) => {
	const request = import.meta.env.SSR
		? serverOnly(() => getWebRequest() ?? null)()
		: null;
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
			nowTimestamp: Date.now(),
		},
		defaultNotFoundComponent: NotFoundComponent,
		defaultErrorComponent: ErrorComponent,
		defaultPreloadStaleTime: 0,
		dehydrate: () => dehydrate(queryClient),
		hydrate: (dehydratedState) => hydrate(queryClient, dehydratedState),
		Wrap: ({ children }) => {
			// We're doing useState instead of useMemo
			// Because we don't want to rerender Wrap on every queryClient change
			// eslint-disable-next-line react/hook-use-state
			const queryClientsState = React.useState<QueryClientsRecord>(() => {
				const localQueryClient = getLocalQueryClient(queryClient);
				const pretendEmail =
					externalContext.initialValues[PRETEND_USER_STORE_NAME].email;
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
					<QueryClientsContext.Provider value={queryClientsState}>
						{children}
					</QueryClientsContext.Provider>
				</I18nextProvider>
			);
		},
	});
};

export type TreeRouter = ReturnType<typeof createRouter>;

declare module "@tanstack/react-router" {
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface Register {
		router: TreeRouter;
	}
}
