import React from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createTRPCReact } from "@trpc/react-query";

import { TRPC_ENDPOINT, getNativeBaseUrl } from "app/utils/queries";
import { getLinks, getQueryClientConfig, transformer } from "app/utils/trpc";
import type { AppRouter } from "next-app/pages/api/trpc/[trpc]";

const trpc = createTRPCReact<AppRouter>();

export const QueriesProvider: React.FC<React.PropsWithChildren<object>> = ({
	children,
}) => {
	const [queryClient] = React.useState(
		() => new QueryClient(getQueryClientConfig()),
	);
	const url = `${getNativeBaseUrl()}${TRPC_ENDPOINT}`;
	const [trpcClient] = React.useState(() =>
		trpc.createClient({
			// TODO: add headers with cookie on react-native environment
			links: getLinks(url),
			transformer,
		}),
	);
	return (
		<trpc.Provider client={trpcClient} queryClient={queryClient}>
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		</trpc.Provider>
	);
};
