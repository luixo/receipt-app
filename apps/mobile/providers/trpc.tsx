import React from "react";

import { useQueryClient } from "@tanstack/react-query";
import { createTRPCReact } from "@trpc/react-query";

import { TRPC_ENDPOINT } from "~app/utils/queries";
import type { SearchParams } from "~app/utils/trpc";
import { getLinks, transformer } from "~app/utils/trpc";
import type { AppRouter } from "~web/pages/api/trpc/[trpc]";

type Props = {
	searchParams: SearchParams;
	baseUrl: string;
};

export const TRPCProvider: React.FC<React.PropsWithChildren<Props>> = ({
	children,
	searchParams,
	baseUrl,
}) => {
	const [trpc] = React.useState(() => createTRPCReact<AppRouter>());
	const queryClient = useQueryClient();
	const [trpcClient] = React.useState(() =>
		trpc.createClient({
			links: getLinks(`${baseUrl}${TRPC_ENDPOINT}`, {
				useBatch: true,
				searchParams,
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
