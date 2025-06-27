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

import type { QueryClientsRecord } from "~app/contexts/query-clients-context";
import {
	QueryClientsContext,
	SELF_QUERY_CLIENT_KEY,
	getQueryClient,
} from "~app/contexts/query-clients-context";
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
	const url = request ? request.url : window.location.href;
	const queryClient = getQueryClient();
	return createTanStackRouter({
		routeTree,
		context: {
			...externalContext,
			request,
			debug: Boolean(new URL(url).searchParams.get("debug")),
			baseUrl: request ? getHostUrl(request.url) : "",
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
				<QueryClientsContext.Provider value={queryClientsState}>
					{children}
				</QueryClientsContext.Provider>
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
