import React from "react";

import { useQueryClient } from "@tanstack/react-query";
import type { TRPCLink } from "@trpc/react-query";
import { createTRPCReact } from "@trpc/react-query";

import type { AppRouter } from "~app/trpc";
import { transformer } from "~app/utils/trpc";

type Props = {
	links: TRPCLink<AppRouter>[];
};

export const TRPCProvider: React.FC<React.PropsWithChildren<Props>> = ({
	children,
	links,
}) => {
	const [trpc] = React.useState(() => createTRPCReact<AppRouter>());
	const queryClient = useQueryClient();
	const [trpcClient] = React.useState(() =>
		trpc.createClient({ links, transformer }),
	);
	return (
		<trpc.Provider client={trpcClient} queryClient={queryClient}>
			{children}
		</trpc.Provider>
	);
};
