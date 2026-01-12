import React from "react";

import { Stack } from "expo-router";

import type { LinksContextType } from "~app/contexts/links-context";
import { LinksContext } from "~app/contexts/links-context";
import {
	SELF_QUERY_CLIENT_KEY,
	getQueryClient,
} from "~app/contexts/query-clients-context";
import { InnerProvider } from "~app/providers/inner";
import { OuterProvider } from "~app/providers/outer";
import { createI18nContext } from "~app/utils/i18n";
import { useBaseUrl } from "~mobile/hooks/use-base-url";
import { QueryDevToolsProvider } from "~mobile/providers/query-devtools";
import { navigationContext } from "~mobile/utils/navigation";
import { persister } from "~mobile/utils/persister";
import { storeContext } from "~mobile/utils/store";

import "../app.css";

const getMobileQueryClientsRecord = () => ({
	[SELF_QUERY_CLIENT_KEY]: getQueryClient(),
});

const ClientProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
	const baseUrl = useBaseUrl();
	const baseLinksContext = React.use(LinksContext);
	const linksContext = React.useMemo<LinksContextType>(
		() => ({
			searchParams: {},
			url: `${baseUrl}${baseLinksContext.url}`,
			useBatch: true,
			source: "native",
			captureError: () => "native-not-implemented",
		}),
		[baseLinksContext.url, baseUrl],
	);
	const i18nContext = createI18nContext({
		getLanguage: () => "en",
	});
	return (
		<OuterProvider
			getQueryClientsRecord={getMobileQueryClientsRecord}
			initialQueryClientKey={SELF_QUERY_CLIENT_KEY}
			i18nContext={i18nContext}
		>
			<InnerProvider
				storeContext={storeContext}
				persister={persister}
				linksContext={linksContext}
				navigationContext={navigationContext}
				DevToolsProvider={QueryDevToolsProvider}
			>
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

export default App;
