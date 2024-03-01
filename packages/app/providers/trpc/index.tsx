import React from "react";

import { useQueryClient } from "@tanstack/react-query";
import { createTRPCReact } from "@trpc/react-query";

import { TRPC_ENDPOINT, getNativeBaseUrl } from "~app/utils/queries";
import { getLinks, transformer } from "~app/utils/trpc";
import type { AppRouter } from "~web/pages/api/trpc/[trpc]";

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
				// TODO: add searchParams on react-native environment
				searchParams: {},
				// TODO: add cookies on react-native environment
				cookies: undefined,
				source: "native",
				captureError: () => "native-not-implemented",
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
