import React from "react";

import { SELF_QUERY_CLIENT_KEY } from "~app/contexts/query-clients-context";
import { StoreDataContext } from "~app/contexts/store-data-context";
import { QueryProvider } from "~app/providers/query";
import { TRPCProvider } from "~app/providers/trpc";
import { PRETEND_ACCOUNT_STORE_NAME } from "~app/utils/store/pretend-account";

export const QueryProviderWithPretend: React.FC<React.PropsWithChildren> = ({
	children,
}) => {
	const {
		[PRETEND_ACCOUNT_STORE_NAME]: [pretendAccount],
	} = React.use(StoreDataContext);
	return (
		<QueryProvider
			queryClientKey={pretendAccount.email || SELF_QUERY_CLIENT_KEY}
		>
			<TRPCProvider>{children}</TRPCProvider>
		</QueryProvider>
	);
};
