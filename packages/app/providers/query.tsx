import React from "react";

import { QueryClientProvider as RawQueryClientProvider } from "@tanstack/react-query";
import { createTRPCClient } from "@trpc/client";

import type { LinksContextType } from "~app/contexts/links-context";
import type { QueryClientsRecord } from "~app/contexts/query-clients-context";
import {
	QueryClientsContext,
	SELF_QUERY_CLIENT_KEY,
	getQueryClient,
} from "~app/contexts/query-clients-context";
import { TRPCProvider, getLinks } from "~app/utils/trpc";

type Props = {
	linksContext: LinksContextType;
	queryClientKey: keyof QueryClientsRecord;
};

export const QueryProvider: React.FC<React.PropsWithChildren<Props>> = ({
	queryClientKey,
	children,
	linksContext,
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
	const trpcClient = React.useMemo(
		() =>
			createTRPCClient({
				links: getLinks(linksContext),
			}),
		[linksContext],
	);
	return (
		<RawQueryClientProvider client={queryClient}>
			<TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
				{children}
			</TRPCProvider>
		</RawQueryClientProvider>
	);
};
