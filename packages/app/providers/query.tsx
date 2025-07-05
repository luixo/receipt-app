import React from "react";

import { QueryClientProvider } from "@tanstack/react-query";

import type { QueryClientsRecord } from "~app/contexts/query-clients-context";
import {
	QueryClientsContext,
	SELF_QUERY_CLIENT_KEY,
	getQueryClient,
} from "~app/contexts/query-clients-context";

type Props = {
	queryClientKey: keyof QueryClientsRecord;
};

export const QueryProvider: React.FC<React.PropsWithChildren<Props>> = ({
	queryClientKey,
	children,
}) => {
	const [queryClients, setQueryClients] = React.useContext(QueryClientsContext);
	React.useEffect(() => {
		setQueryClients((prevQueryClients) => {
			if (prevQueryClients[queryClientKey]) {
				return prevQueryClients;
			}
			return {
				...prevQueryClients,
				[queryClientKey]: getQueryClient(),
			};
		});
	}, [queryClientKey, setQueryClients]);
	const queryClient = React.useMemo(
		() =>
			(queryClientKey && queryClients[queryClientKey]) ||
			queryClients[SELF_QUERY_CLIENT_KEY],
		[queryClientKey, queryClients],
	);
	return (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
};
