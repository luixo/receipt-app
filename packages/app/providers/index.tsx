import type React from "react";

import type { Persister } from "@tanstack/react-query-persist-client";
import type { NextParsedUrlQuery } from "next/dist/server/request-meta";
import { NuqsAdapter } from "nuqs/adapters/next/pages";

import type { LinksContextType } from "~app/contexts/links-context";
import type { QueryClientsRecord } from "~app/contexts/query-clients-context";
import { SearchParamsContext } from "~app/contexts/search-params-context";
import { StoreContext } from "~app/contexts/store-context";
import type { StoreContextType } from "~app/contexts/store-context";

import { PersisterProvider } from "./persist-client";
import { QueryProvider } from "./query";
import { ShimsProvider } from "./shims";
import { StoredDataProvider } from "./stored-data";

type Props = {
	searchParams: NextParsedUrlQuery;
	storeContext: StoreContextType;
	persister: Persister;
	linksContext: LinksContextType;
	useQueryClientKey: () => keyof QueryClientsRecord | undefined;
};

export const Provider: React.FC<React.PropsWithChildren<Props>> = ({
	children,
	storeContext,
	searchParams,
	persister,
	linksContext,
	useQueryClientKey,
}) => (
	<NuqsAdapter>
		<SearchParamsContext.Provider value={searchParams}>
			<StoreContext.Provider value={storeContext}>
				<StoredDataProvider>
					<QueryProvider
						linksContext={linksContext}
						useQueryClientKey={useQueryClientKey}
					>
						<ShimsProvider>
							<PersisterProvider persister={persister}>
								{children}
							</PersisterProvider>
						</ShimsProvider>
					</QueryProvider>
				</StoredDataProvider>
			</StoreContext.Provider>
		</SearchParamsContext.Provider>
	</NuqsAdapter>
);
