import React from "react";

import { Provider } from "~app/providers/index";
import { useBaseUrl } from "~mobile/hooks/use-base-url";
import { useCookieData } from "~mobile/hooks/use-cookie-data";
import { useSearchParams } from "~mobile/hooks/use-search-params";
import { QueryClientProvider } from "~mobile/providers/query-client";
import { QueryDevToolsProvider } from "~mobile/providers/query-devtools";
import { ThemeProvider } from "~mobile/providers/theme";
import { TRPCProvider } from "~mobile/providers/trpc";
import { mobileCookieContext } from "~mobile/utils/cookie-storage";
import { mobilePersister } from "~mobile/utils/persister";

import { NativeNavigation } from "./navigation";

const ClientProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
	const baseUrl = useBaseUrl();
	const cookieData = useCookieData();
	const searchParams = useSearchParams();
	return (
		<QueryClientProvider>
			<Provider
				searchParams={searchParams}
				cookiesContext={mobileCookieContext}
				cookiesData={cookieData}
				persister={mobilePersister}
			>
				<TRPCProvider baseUrl={baseUrl} searchParams={searchParams}>
					<ThemeProvider>
						<QueryDevToolsProvider>{children}</QueryDevToolsProvider>
					</ThemeProvider>
				</TRPCProvider>
			</Provider>
		</QueryClientProvider>
	);
};

const App: React.FC = () => (
	<ClientProvider>
		<NativeNavigation />
	</ClientProvider>
);

export default App;
