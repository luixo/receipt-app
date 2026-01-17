import React from "react";

import * as Sentry from "@sentry/react-native";
import { fetch } from "expo/fetch";
import { getLocales } from "expo-localization";
import { type ErrorBoundaryProps, Stack } from "expo-router";
import { isNonNullish } from "remeda";

import { ErrorComponent } from "~app/components/suspense-wrapper";
import type { LinksContextType } from "~app/contexts/links-context";
import { LinksContext } from "~app/contexts/links-context";
import {
	SELF_QUERY_CLIENT_KEY,
	getQueryClient,
} from "~app/contexts/query-clients-context";
import { InnerProvider } from "~app/providers/inner";
import { OuterProvider } from "~app/providers/outer";
import { createI18nContext } from "~app/utils/i18n";
import { baseLanguage, isLanguage } from "~app/utils/i18n-data";
import { SplashScreenManager } from "~mobile/components/splash-screen-manager";
import { useBaseUrl } from "~mobile/hooks/use-base-url";
import { DevToolsProvider } from "~mobile/providers/devtools";
import { resources } from "~mobile/utils/i18n";
import { navigationContext } from "~mobile/utils/navigation";
import { captureSentryError } from "~mobile/utils/sentry";
import { storage } from "~mobile/utils/storage";
import { storeContext } from "~mobile/utils/store";

import "../app.css";

export const ErrorBoundary: React.FC<ErrorBoundaryProps> = ({
	error,
	retry,
}) => <ErrorComponent error={error} reset={retry} />;

const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
if (sentryDsn) {
	Sentry.init({
		dsn: sentryDsn,
		// Adds more context data to events (IP address, cookies, user, etc.)
		// For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
		sendDefaultPii: true,
		// Set tracesSampleRate to 1.0 to capture 100% of transactions for tracing.
		// We recommend adjusting this value in production.
		// Learn more at
		// https://docs.sentry.io/platforms/react-native/configuration/options/#traces-sample-rate
		tracesSampleRate: 1,
		// Record session replays for 100% of errors and 10% of sessions
		replaysOnErrorSampleRate: 1,
		replaysSessionSampleRate: 0.1,
		integrations: [Sentry.mobileReplayIntegration()],
	});
}

const getMobileQueryClientsRecord = () => ({
	[SELF_QUERY_CLIENT_KEY]: getQueryClient(),
});

const language =
	getLocales()
		.map((locale) => locale.languageCode)
		.filter(isNonNullish)
		.find(isLanguage) ?? baseLanguage;
const i18nContext = createI18nContext({
	getLanguage: () => language,
});
// We don't use backend module so initialization is actually sync
void i18nContext.initialize({ language, data: resources });

const ClientProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
	const baseUrl = useBaseUrl();
	const baseLinksContext = React.use(LinksContext);
	const linksContext = React.useMemo<LinksContextType>(
		() => ({
			searchParams: {},
			url: `${baseUrl}${baseLinksContext.url}`,
			fetch,
			useBatch: true,
			source: "native",
			captureError: captureSentryError,
		}),
		[baseLinksContext.url, baseUrl],
	);
	return (
		<OuterProvider
			getQueryClientsRecord={getMobileQueryClientsRecord}
			initialQueryClientKey={SELF_QUERY_CLIENT_KEY}
			i18nContext={i18nContext}
		>
			<InnerProvider
				storeContext={storeContext}
				storage={storage}
				linksContext={linksContext}
				navigationContext={navigationContext}
				DevToolsProvider={DevToolsProvider}
			>
				<SplashScreenManager timeout={2000} />
				{children}
			</InnerProvider>
		</OuterProvider>
	);
};

const App: React.FC = () => (
	<ClientProvider>
		<Stack />
	</ClientProvider>
);

export default Sentry.wrap(App);
