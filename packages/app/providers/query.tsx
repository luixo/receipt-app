import React from "react";

import { QueryClientProvider as RawQueryClientProvider } from "@tanstack/react-query";

import { LinksContextType } from "~app/contexts/links-context";
import type { QueryClientsRecord } from "~app/contexts/query-clients-context";
import {
	SELF_QUERY_CLIENT_KEY,
	useQueryClientsStore,
} from "~app/contexts/query-clients-context";
import { SearchParamsContext } from "~app/contexts/search-params-context";
import { getLinks, trpcReact } from "~app/utils/trpc";

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
	const searchParams = React.useContext(SearchParamsContext);
	const trpcClient = React.useMemo(
		() =>
			trpcReact.createClient({
				links: getLinks(searchParams, linksContext),
			}),
		[linksContext, searchParams],
	);
	return (
		<RawQueryClientProvider client={queryClient}>
			<trpcReact.Provider client={trpcClient} queryClient={queryClient}>
				{children}
			</trpcReact.Provider>
		</RawQueryClientProvider>
	);
};
