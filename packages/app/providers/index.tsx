import type React from "react";

import type { Persister } from "@tanstack/react-query-persist-client";

import type { LinksContextType } from "~app/contexts/links-context";
import type { QueryClientsRecord } from "~app/contexts/query-clients-context";
import { StoreContext } from "~app/contexts/store-context";
import type { StoreContextType } from "~app/contexts/store-context";

import { PersisterProvider } from "./persist-client";
import { QueryProviderWithPretend } from "./query-pretend";
import { ShimsProvider } from "./shims";
import { StoredDataProvider } from "./stored-data";

type Props = {
	initialQueryClients: QueryClientsRecord;
	storeContext: StoreContextType;
	persister: Persister;
	linksContext: LinksContextType;
};

export const Provider: React.FC<React.PropsWithChildren<Props>> = ({
	children,
	initialQueryClients,
	storeContext,
	persister,
	linksContext,
}) => (
	<StoreContext.Provider value={storeContext}>
		<StoredDataProvider>
			<QueryProviderWithPretend
				initialQueryClients={initialQueryClients}
				linksContext={linksContext}
			>
				<ShimsProvider>
					<PersisterProvider persister={persister}>
						{children}
					</PersisterProvider>
				</ShimsProvider>
			</QueryProviderWithPretend>
		</StoredDataProvider>
	</StoreContext.Provider>
);
