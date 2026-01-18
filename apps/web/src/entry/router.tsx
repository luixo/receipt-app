import React from "react";

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

import { ErrorComponent } from "~app/components/suspense-wrapper";
import { LinksContext } from "~app/contexts/links-context";
import {
	SELF_QUERY_CLIENT_KEY,
	getQueryClient,
} from "~app/contexts/query-clients-context";
import { OuterProvider } from "~app/providers/outer";
import { createI18nContext } from "~app/utils/i18n";
import { PRETEND_USER_STORE_NAME } from "~app/utils/store/pretend-user";
import { Spinner } from "~components/spinner";
import { Text } from "~components/text";
import { View } from "~components/view";
import { getNow, serialize } from "~utils/date";
import { transformer } from "~utils/transformer";
import type { ExternalRouterContext } from "~web/pages/__root";
import { getBackendModule, getLanguageFromRequest } from "~web/utils/i18n";
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
	const initialLanguage = getLanguageFromRequest(request);
	const i18nContext = createI18nContext({
		getLanguage: () => initialLanguage,
		beforeInit: (instance) => instance.use(getBackendModule()),
		isInitializable: typeof window === "undefined",
	});
	void i18nContext.initialize({ language: initialLanguage });
	return createTanStackRouter({
		routeTree,
		context: {
			...externalContext,
			request,
			baseUrl: request ? getHostUrl(request.url) : "",
			i18nContext,
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
			i18n: i18nContext.serializeContext(),
		}),
		hydrate: async (dehydratedData) => {
			await i18nContext.initialize(dehydratedData.i18n);
			hydrate(queryClient, dehydratedData.dehydratedState, {
				defaultOptions: {
					deserializeData: transformer.deserialize,
				},
			});
		},
		Wrap: ({ children }) => {
			const pretendEmail =
				externalContext.initialValues[PRETEND_USER_STORE_NAME].email;
			return (
				<OuterProvider
					getQueryClientsRecord={React.useCallback(() => {
						const localQueryClient = getLocalQueryClient(queryClient);
						return pretendEmail
							? {
									[pretendEmail]: localQueryClient,
									[SELF_QUERY_CLIENT_KEY]: getQueryClient(),
								}
							: {
									[SELF_QUERY_CLIENT_KEY]: localQueryClient,
								};
					}, [pretendEmail])}
					initialQueryClientKey={pretendEmail || SELF_QUERY_CLIENT_KEY}
					i18nContext={i18nContext}
				>
					{children}
				</OuterProvider>
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
