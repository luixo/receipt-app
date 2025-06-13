import type React from "react";

import type { Persister } from "@tanstack/react-query-persist-client";

import {
	LinksContext,
	type LinksContextType,
} from "~app/contexts/links-context";
import { StoreContext } from "~app/contexts/store-context";
import type { StoreContextType } from "~app/contexts/store-context";

import { PersisterProvider } from "./persist-client";
import { QueryProviderWithPretend } from "./query-pretend";
import { ShimsProvider } from "./shims";
import { StoredDataProvider } from "./stored-data";

type Props = {
	storeContext: StoreContextType;
	persister: Persister;
	linksContext: LinksContextType;
};

export const Provider: React.FC<React.PropsWithChildren<Props>> = ({
	children,
	storeContext,
	persister,
	linksContext,
}) => (
	<LinksContext.Provider value={linksContext}>
		<StoreContext.Provider value={storeContext}>
			<StoredDataProvider>
				<QueryProviderWithPretend>
					<ShimsProvider>
						<PersisterProvider persister={persister}>
							{children}
						</PersisterProvider>
					</ShimsProvider>
				</QueryProviderWithPretend>
			</StoredDataProvider>
		</StoreContext.Provider>
	</LinksContext.Provider>
);
