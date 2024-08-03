import React from "react";

import { Stack, useGlobalSearchParams } from "expo-router";

import "~app/global.css";

import type { LinksContextType } from "~app/contexts/links-context";
import { LinksContext } from "~app/contexts/links-context";
import { SELF_QUERY_CLIENT_KEY } from "~app/contexts/query-clients-context";
import { Provider } from "~app/providers/index";
import { useBaseUrl } from "~mobile/hooks/use-base-url";
import { useCookieData } from "~mobile/hooks/use-cookie-data";
import { QueryDevToolsProvider } from "~mobile/providers/query-devtools";
import { ThemeProvider } from "~mobile/providers/theme";
import { mobileCookieContext } from "~mobile/utils/cookie-storage";
import { mobilePersister } from "~mobile/utils/persister";

const ClientProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
	const cookieData = useCookieData();
	const searchParams = useGlobalSearchParams();
	const baseUrl = useBaseUrl();
	const baseLinksContext = React.useContext(LinksContext);
	const linksContext = React.useMemo<LinksContextType>(
		() => ({
			url: `${baseUrl}${baseLinksContext.url}`,
			useBatch: true,
			source: "native",
			captureError: () => "native-not-implemented",
		}),
		[baseLinksContext.url, baseUrl],
	);
	const useSelfQueryClientKey = React.useCallback(
		() => SELF_QUERY_CLIENT_KEY,
		[],
	);
	return (
		<Provider
			searchParams={searchParams}
			cookiesContext={mobileCookieContext}
			cookiesData={cookieData}
			persister={mobilePersister}
			linksContext={linksContext}
			useQueryClientKey={useSelfQueryClientKey}
		>
			<ThemeProvider>
				<QueryDevToolsProvider>{children}</QueryDevToolsProvider>
			</ThemeProvider>
		</Provider>
	);
};

const App: React.FC = () => (
	<ClientProvider>
		<Stack />
	</ClientProvider>
);

export default App;
