import React from "react";

import type { Persister } from "@tanstack/react-query-persist-client";

import {
	LinksContext,
	type LinksContextType,
} from "~app/contexts/links-context";
import { SELF_QUERY_CLIENT_KEY } from "~app/contexts/query-clients-context";
import { StoreContext } from "~app/contexts/store-context";
import type { StoreContextType } from "~app/contexts/store-context";
import { StoreDataContext } from "~app/contexts/store-data-context";
import { QueryProvider } from "~app/providers/query";
import { PRETEND_USER_STORE_NAME } from "~app/utils/store/pretend-user";

import { PersisterProvider } from "./persist-client";
import { ShimsProvider } from "./shims";
import { StoredDataProvider } from "./stored-data";

const QueryProviderWithPretend: React.FC<React.PropsWithChildren> = ({
	children,
}) => {
	const {
		[PRETEND_USER_STORE_NAME]: [pretendUser],
	} = React.useContext(StoreDataContext);
	return (
		<QueryProvider queryClientKey={pretendUser.email || SELF_QUERY_CLIENT_KEY}>
			{children}
		</QueryProvider>
	);
};

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
