import React from "react";

import { useQueryClient } from "@tanstack/react-query";
import { createTRPCReact } from "@trpc/react-query";

import { TRPC_ENDPOINT, getNativeBaseUrl } from "app/utils/queries";
import { getLinks, transformer } from "app/utils/trpc";
import type { AppRouter } from "next-app/pages/api/trpc/[trpc]";

export const TrpcProvider: React.FC<React.PropsWithChildren<object>> = ({
	children,
}) => {
	const [trpc] = React.useState(() => createTRPCReact<AppRouter>());
	const queryClient = useQueryClient();
	const url = `${getNativeBaseUrl()}${TRPC_ENDPOINT}`;
	const [trpcClient] = React.useState(() =>
		trpc.createClient({
			links: getLinks(url, {
				useBatch: true,
				// TODO: add headers on react-native environment
				headers: {
					debug: undefined,
					cookie: undefined,
					"x-proxy-port": undefined,
					"x-controller-id": undefined,
				},
			}),
			transformer,
		}),
	);
	return (
		<trpc.Provider client={trpcClient} queryClient={queryClient}>
			{children}
		</trpc.Provider>
	);
};
