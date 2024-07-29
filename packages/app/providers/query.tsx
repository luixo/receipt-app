import React from "react";

import {
	QueryClient,
	QueryClientProvider as RawQueryClientProvider,
} from "@tanstack/react-query";
import type { TRPCLink } from "@trpc/react-query";

import type { AppRouter } from "~app/trpc";
import { getQueryClientConfig, trpcReact } from "~app/utils/trpc";

type Props = {
	links: TRPCLink<AppRouter>[];
};

export const QueryProvider: React.FC<React.PropsWithChildren<Props>> = ({
	children,
	links,
}) => {
	const [queryClient] = React.useState(
		() => new QueryClient(getQueryClientConfig()),
	);
	const trpcClient = React.useMemo(
		() => trpcReact.createClient({ links }),
		[links],
	);
	return (
		<RawQueryClientProvider client={queryClient}>
			<trpcReact.Provider client={trpcClient} queryClient={queryClient}>
				{children}
			</trpcReact.Provider>
		</RawQueryClientProvider>
	);
};
