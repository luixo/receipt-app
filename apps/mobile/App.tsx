import React from "react";

import { CookieProvider } from "~app/providers/cookie";
import { PersisterProvider } from "~app/providers/persist-client";
import { PersistStorageProvider } from "~app/providers/persist-storage";
import { QueryClientProvider } from "~app/providers/query-client";
import { QueryDevToolsProvider } from "~app/providers/query-devtools";
import { SearchParamsProvider } from "~app/providers/search-params";
import { ShimsProvider } from "~app/providers/shims";
import { SSRDataProvider } from "~app/providers/ssr-data";
import { ThemeProvider } from "~app/providers/theme";
import { TrpcProvider } from "~app/providers/trpc";
import { getSSRContextCookieData } from "~app/utils/cookie-data";

import { NativeNavigation } from "./navigation";

const Provider: React.FC<React.PropsWithChildren> = ({ children }) => (
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
										<QueryDevToolsProvider>{children}</QueryDevToolsProvider>
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

const App: React.FC = () => (
	<Provider>
		<NativeNavigation />
	</Provider>
);

export default App;
