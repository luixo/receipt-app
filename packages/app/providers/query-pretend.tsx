import React from "react";

import type { LinksContextType } from "~app/contexts/links-context";
import type { QueryClientsRecord } from "~app/contexts/query-clients-context";
import {
	QueryClientsContext,
	SELF_QUERY_CLIENT_KEY,
} from "~app/contexts/query-clients-context";
import { StoreDataContext } from "~app/contexts/store-data-context";
import { QueryProvider } from "~app/providers/query";
import { PRETEND_USER_STORE_NAME } from "~app/utils/store/pretend-user";

type Props = {
	initialQueryClients: QueryClientsRecord;
	linksContext: LinksContextType;
};

export const QueryProviderWithPretend: React.FC<
	React.PropsWithChildren<Props>
> = ({ initialQueryClients, linksContext, children }) => {
	const queryClientsState =
		// eslint-disable-next-line react/hook-use-state
		React.useState<QueryClientsRecord>(initialQueryClients);
	const {
		[PRETEND_USER_STORE_NAME]: [pretendUser],
	} = React.useContext(StoreDataContext);
	return (
		<QueryClientsContext.Provider value={queryClientsState}>
			<QueryProvider
				linksContext={linksContext}
				queryClientKey={pretendUser.email || SELF_QUERY_CLIENT_KEY}
			>
				{children}
			</QueryProvider>
		</QueryClientsContext.Provider>
	);
};
