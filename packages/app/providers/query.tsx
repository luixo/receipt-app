import React from "react";

import { QueryClientProvider as RawQueryClientProvider } from "@tanstack/react-query";
import { createTRPCClient } from "@trpc/client";

import type { LinksContextType } from "~app/contexts/links-context";
import type { QueryClientsRecord } from "~app/contexts/query-clients-context";
import {
	SELF_QUERY_CLIENT_KEY,
	useQueryClientsStore,
} from "~app/contexts/query-clients-context";
import { TRPCProvider, getLinks } from "~app/utils/trpc";

type Props = {
	linksContext: LinksContextType;
	useQueryClientKey: () => keyof QueryClientsRecord | undefined;
};

export const QueryProvider: React.FC<React.PropsWithChildren<Props>> = ({
	useQueryClientKey,
	children,
	linksContext,
}) => {
	const queryClientKey = useQueryClientKey();
	const queryClient = useQueryClientsStore(
		(state) =>
			(queryClientKey && state.queryClients[queryClientKey]) ||
			state.queryClients[SELF_QUERY_CLIENT_KEY],
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
