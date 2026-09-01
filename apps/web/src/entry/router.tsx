import React from "react";

import type { QueryClient } from "@tanstack/react-query";
import { dehydrate, hydrate, isServer } from "@tanstack/react-query";
import type {
	ErrorRouteComponent,
	NotFoundRouteComponent,
} from "@tanstack/react-router";
import {
	createRouter as createTanStackRouter,
	useRouter,
} from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { createIsomorphicFn } from "@tanstack/react-start";
import { getCookies, getRequest } from "@tanstack/react-start/server";
import { useTranslation } from "react-i18next";
import { fromEntries } from "remeda";

import { ErrorComponent } from "~app/components/suspense-wrapper";
import { LinksContext } from "~app/contexts/links-context";
import {
	SELF_QUERY_CLIENT_KEY,
	getQueryClient,
} from "~app/contexts/query-clients-context";
import { OuterProvider } from "~app/providers/outer";
import { createI18nContext } from "~app/utils/i18n";
import { getStoreValuesFromInitialValues } from "~app/utils/store-data";
import { PRETEND_USER_STORE_NAME } from "~app/utils/store/pretend-user";
import { Spinner } from "~components/spinner";
import { Text } from "~components/text";
import { View } from "~components/view";
import { getNow, serialize } from "~utils/date";
import { apiCookieNames } from "~utils/mocks";
import { transformer } from "~utils/transformer";
import type { ExternalRouterContext } from "~web/pages/__root";
import { getBackendModule, getLanguageFromRequest } from "~web/utils/i18n";
import { HydrationBoundary } from "~web/utils/ssr";
import { getHostUrl } from "~web/utils/url";

import { routeTree } from "./routeTree.gen";

const NotFoundComponent: NotFoundRouteComponent = () => {
	const { t } = useTranslation("default");
	return (
		<View>
			<Text>{t("misc.notFound")}</Text>
		</View>
	);
};

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
	if (isServer) {
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

const getUniversalRequest = createIsomorphicFn()
	.server(() => getRequest())
	.client(() => null);

const getExternalContext = createIsomorphicFn()
	.server(() => {
		const cookies = getCookies();
		const initialValues = getStoreValuesFromInitialValues(cookies);
		return {
			initialValues,
			isTest: Boolean(cookies[apiCookieNames.controllerId]),
		} satisfies ExternalRouterContext;
	})
	.client(() => {
		const cookies = fromEntries(
			document.cookie
				.split(";")
				.map(
					(cookie) =>
						cookie.trim().split("=").map(decodeURIComponent).slice(0, 2) as [
							string,
							string,
						],
				),
		);
		return {
			initialValues: getStoreValuesFromInitialValues(cookies),
			isTest: Boolean(cookies[apiCookieNames.controllerId]),
		} satisfies ExternalRouterContext;
	});

export const getRouter = () => {
	const externalContext = getExternalContext();
	const request = getUniversalRequest();
	const queryClient = getQueryClient();
	const initialLanguage = getLanguageFromRequest(request);
	const i18nContext = createI18nContext({
		getLanguage: () => initialLanguage,
		beforeInit: (instance) => instance.use(getBackendModule()),
		isInitializable: isServer,
	});
	void i18nContext.initialize({ language: initialLanguage });
	const router = createTanStackRouter({
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
			i18n: i18nContext.serializeContext(),
		}),
		hydrate: async (dehydratedData) => {
			await i18nContext.initialize(dehydratedData.i18n);
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
	setupRouterSsrQueryIntegration({
		router,
		queryClient,
		dehydrateOptions: {
			serializeData: transformer.serialize,
		},
		hydrateOptions: {
			defaultOptions: {
				deserializeData: transformer.deserialize,
			},
		},
		wrapQueryClient: false,
	});
	return router;
};

export type TreeRouter = ReturnType<typeof getRouter>;

declare module "@tanstack/react-router" {
	// oxlint-disable-next-line typescript/consistent-type-definitions
	interface Register {
		router: TreeRouter;
	}
}
