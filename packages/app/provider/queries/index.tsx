import React from "react";

import { QueryClient, QueryClientProvider } from "react-query";
import superjson from "superjson";

import { trpc } from "app/trpc";
import {
	getNativeBaseUrl,
	getQueryClientConfig,
	TRPC_ENDPOINT,
} from "app/utils/queries";

export const QueriesProvider: React.FC<React.PropsWithChildren<object>> = ({
	children,
}) => {
	const [queryClient] = React.useState(
		() => new QueryClient(getQueryClientConfig())
	);
	const [trpcClient] = React.useState(() =>
		trpc.createClient({
			url: `${getNativeBaseUrl()}${TRPC_ENDPOINT}`,
			transformer: superjson,
		})
	);
	return (
		<trpc.Provider client={trpcClient} queryClient={queryClient}>
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		</trpc.Provider>
	);
};
