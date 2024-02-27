import React from "react";

import type { NextParsedUrlQuery } from "next/dist/server/request-meta";

import type { SSRContextData } from "~app/contexts/ssr-context";
import { CookieProvider } from "~app/providers/cookie";
import { NavigationProvider } from "~app/providers/navigation";
import { PersisterProvider } from "~app/providers/persist-client";
import { PersistStorageProvider } from "~app/providers/persist-storage";
import { QueryClientProvider } from "~app/providers/query-client";
import { QueryDevToolsProvider } from "~app/providers/query-devtools";
import { SearchParamsProvider } from "~app/providers/search-params";
import { ShimsProvider } from "~app/providers/shims";
import { SSRDataProvider } from "~app/providers/ssr-data";
import { ThemeProvider } from "~app/providers/theme";
import { TrpcProvider } from "~app/providers/trpc";

type Props = {
	searchParams: NextParsedUrlQuery;
	ssrData: SSRContextData;
};

export const ClientProvider: React.FC<React.PropsWithChildren<Props>> = ({
	children,
	ssrData,
	searchParams,
}) => (
	<ShimsProvider>
		<QueryClientProvider>
			<TrpcProvider>
				<PersistStorageProvider>
					<PersisterProvider>
						<CookieProvider>
							<SSRDataProvider data={ssrData}>
								<SearchParamsProvider searchParams={searchParams}>
									<ThemeProvider>
										<NavigationProvider>
											<QueryDevToolsProvider>{children}</QueryDevToolsProvider>
										</NavigationProvider>
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
