import React from "react";

import { getSSRContextCookieData } from "app/contexts/ssr-context";
import { CookieProvider } from "app/providers/cookie";
import { NavigationProvider } from "app/providers/navigation";
import { PersisterProvider } from "app/providers/persist-client";
import { PersistStorageProvider } from "app/providers/persist-storage";
import { QueryClientProvider } from "app/providers/query-client";
import { QueryDevToolsProvider } from "app/providers/query-devtools";
import { SearchParamsProvider } from "app/providers/search-params";
import { SSRDataProvider } from "app/providers/ssr-data";
import { ThemeProvider } from "app/providers/theme";
import { TrpcProvider } from "app/providers/trpc";

const App: React.FC = () => (
	<QueryClientProvider>
		<TrpcProvider>
			<PersistStorageProvider>
				<PersisterProvider>
					<CookieProvider>
						<SSRDataProvider
							data={{ ...getSSRContextCookieData(), nowTimestamp: Date.now() }}
						>
							{/* TODO: add react native query params */}
							<SearchParamsProvider searchParams={{}}>
								<ThemeProvider>
									<QueryDevToolsProvider>
										<NavigationProvider />
									</QueryDevToolsProvider>
								</ThemeProvider>
							</SearchParamsProvider>
						</SSRDataProvider>
					</CookieProvider>
				</PersisterProvider>
			</PersistStorageProvider>
		</TrpcProvider>
	</QueryClientProvider>
);

export default App;
