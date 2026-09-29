import React from "react";

import { SELF_QUERY_CLIENT_KEY } from "#app/contexts/query-clients-context.ts";
import { StoreDataContext } from "#app/contexts/store-data-context.ts";
import { QueryProvider } from "#app/providers/query.tsx";
import { TRPCProvider } from "#app/providers/trpc.tsx";
import { PRETEND_USER_STORE_NAME } from "#app/utils/store/pretend-user.ts";

export const QueryProviderWithPretend: React.FC<React.PropsWithChildren> = ({
	children,
}) => {
	const {
		[PRETEND_USER_STORE_NAME]: [pretendUser],
	} = React.use(StoreDataContext);
	return (
		<QueryProvider queryClientKey={pretendUser.email || SELF_QUERY_CLIENT_KEY}>
			<TRPCProvider>{children}</TRPCProvider>
		</QueryProvider>
	);
};
