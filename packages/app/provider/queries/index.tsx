import React from "react";
import { QueryClient, QueryClientProvider } from "react-query";
import { trpc } from "../../trpc";
import {
	getNativeBaseUrl,
	getQueryClientConfig,
	TRPC_ENDPOINT,
} from "../../utils/queries";

export const QueriesProvider: React.FC<React.PropsWithChildren<{}>> = ({
	children,
}) => {
	const [queryClient] = React.useState(
		() => new QueryClient(getQueryClientConfig())
	);
	const [trpcClient] = React.useState(() =>
		trpc.createClient({
			url: `${getNativeBaseUrl()}${TRPC_ENDPOINT}`,
		})
	);
	return (
		<trpc.Provider client={trpcClient} queryClient={queryClient}>
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		</trpc.Provider>
	);
};
