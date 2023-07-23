import React from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import superjson from "superjson";

import {
	getNativeBaseUrl,
	getQueryClientConfig,
	TRPC_ENDPOINT,
} from "app/utils/queries";
import { AppRouter } from "next-app/pages/api/trpc/[trpc]";

const trpc = createTRPCReact<AppRouter>();

export const QueriesProvider: React.FC<React.PropsWithChildren<object>> = ({
	children,
}) => {
	const [queryClient] = React.useState(
		() => new QueryClient(getQueryClientConfig()),
	);
	const [trpcClient] = React.useState(() =>
		trpc.createClient({
			links: [
				httpBatchLink({
					url: `${getNativeBaseUrl()}${TRPC_ENDPOINT}`,
					// TODO: add headers with cookie on react-native environment
				}),
			],
			transformer: superjson,
		}),
	);
	return (
		<trpc.Provider client={trpcClient} queryClient={queryClient}>
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		</trpc.Provider>
	);
};
