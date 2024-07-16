import React from "react";

import { Stack, useGlobalSearchParams } from "expo-router";

import "~app/global.css";

import { Provider } from "~app/providers/index";
import { useCookieData } from "~mobile/hooks/use-cookie-data";
import { QueryDevToolsProvider } from "~mobile/providers/query-devtools";
import { ThemeProvider } from "~mobile/providers/theme";
import { mobileCookieContext } from "~mobile/utils/cookie-storage";
import { mobilePersister } from "~mobile/utils/persister";
import { useLinks } from "~mobile/utils/trpc";

const ClientProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
	const cookieData = useCookieData();
	const searchParams = useGlobalSearchParams();
	const links = useLinks(searchParams);
	return (
		<Provider
			searchParams={searchParams}
			cookiesContext={mobileCookieContext}
			cookiesData={cookieData}
			persister={mobilePersister}
			links={links}
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
