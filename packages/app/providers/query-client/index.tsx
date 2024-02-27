import React from "react";

import {
	QueryClient,
	QueryClientProvider as RawQueryClientProvider,
} from "@tanstack/react-query";

import { getQueryClientConfig } from "~app/utils/trpc";

export const QueryClientProvider: React.FC<React.PropsWithChildren<object>> = ({
	children,
}) => {
	const [queryClient] = React.useState(
		() => new QueryClient(getQueryClientConfig()),
	);
	return (
		<RawQueryClientProvider client={queryClient}>
			{children}
		</RawQueryClientProvider>
	);
};
