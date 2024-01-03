import React from "react";

import { CookieProvider } from "app/providers/cookie";
import { NavigationProvider } from "app/providers/navigation";
import { PersisterProvider } from "app/providers/persist-client";
import { PersistStorageProvider } from "app/providers/persist-storage";
import { QueryClientProvider } from "app/providers/query-client";
import { QueryDevToolsProvider } from "app/providers/query-devtools";
import { SearchParamsProvider } from "app/providers/search-params";
import { ShimsProvider } from "app/providers/shims";
import { SSRDataProvider } from "app/providers/ssr-data";
import { ThemeProvider } from "app/providers/theme";
import { TrpcProvider } from "app/providers/trpc";
import { getSSRContextCookieData } from "app/utils/cookie-data";

const App: React.FC = () => (
	<ShimsProvider>
		<QueryClientProvider>
			<TrpcProvider>
				<PersistStorageProvider>
					<PersisterProvider>
						<CookieProvider>
							<SSRDataProvider
								data={{
									...getSSRContextCookieData(),
									nowTimestamp: Date.now(),
								}}
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
	</ShimsProvider>
);

export default App;
