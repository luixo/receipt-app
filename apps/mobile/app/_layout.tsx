import React from "react";

import * as Sentry from "@sentry/react-native";
import { fetch } from "expo/fetch";
import { getLocales } from "expo-localization";
import type { ErrorBoundaryProps } from "expo-router";
import { HeroUINativeProvider } from "heroui-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaListener } from "react-native-safe-area-context";
import { isNonNullish } from "remeda";
import { Uniwind } from "uniwind";

import { ErrorMessage } from "~app/components/error-message";
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
import { ToastProvider } from "~components/toast";
import { View } from "~components/view";
import { SplashScreenManager } from "~mobile/components/splash-screen-manager";
import { Stack } from "~mobile/components/stack";
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
}) => (
	<HeroUINativeProvider config={{ devInfo: { stylingPrinciples: false } }}>
		<View className="flex size-full items-center justify-center">
			<ErrorMessage
				title="Global error"
				message={error.message}
				button={{
					text: "Reset",
					onPress: () => {
						void retry();
					},
				}}
			/>
		</View>
	</HeroUINativeProvider>
);

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
				ToastProvider={ToastProvider}
				applyColorMode={(colorMode) => Uniwind.setTheme(colorMode)}
			>
				<SplashScreenManager timeout={2000} />
				{children}
			</InnerProvider>
		</OuterProvider>
	);
};

const App: React.FC = () => (
	<GestureHandlerRootView>
		<HeroUINativeProvider config={{ devInfo: { stylingPrinciples: false } }}>
			<ClientProvider>
				<SafeAreaListener
					onChange={({ insets }) => Uniwind.updateInsets(insets)}
				>
					<View className="bg-background text-foreground flex-1 p-safe">
						<Stack />
					</View>
				</SafeAreaListener>
			</ClientProvider>
		</HeroUINativeProvider>
	</GestureHandlerRootView>
);

export default Sentry.wrap(App);
