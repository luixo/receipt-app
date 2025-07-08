import React from "react";

import { Stack } from "expo-router";

import "~app/global.css";

import type { LinksContextType } from "~app/contexts/links-context";
import { LinksContext } from "~app/contexts/links-context";
import {
	QueryClientsContext,
	SELF_QUERY_CLIENT_KEY,
	getQueryClient,
} from "~app/contexts/query-clients-context";
import { Provider } from "~app/providers/index";
import { useBaseUrl } from "~mobile/hooks/use-base-url";
import { QueryDevToolsProvider } from "~mobile/providers/query-devtools";
import { ThemeProvider } from "~mobile/providers/theme";
import { persister } from "~mobile/utils/persister";
import { storeContext } from "~mobile/utils/store";

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
	// eslint-disable-next-line react/hook-use-state
	const queryClientsState = React.useState(() => ({
		[SELF_QUERY_CLIENT_KEY]: getQueryClient(),
	}));
	return (
		<QueryClientsContext.Provider value={queryClientsState}>
			<Provider
				storeContext={storeContext}
				persister={persister}
				linksContext={linksContext}
			>
				<ThemeProvider>
					<QueryDevToolsProvider>{children}</QueryDevToolsProvider>
				</ThemeProvider>
			</Provider>
		</QueryClientsContext.Provider>
	);
};

const App: React.FC = () => (
	<ClientProvider>
		<Stack />
	</ClientProvider>
);

export default App;
