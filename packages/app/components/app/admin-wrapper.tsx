import React from "react";

import type { LinksContextType } from "#app/contexts/links-context.ts";
import { LinksContext } from "#app/contexts/links-context.ts";
import { SELF_QUERY_CLIENT_KEY } from "#app/contexts/query-clients-context.ts";
import { QueryProvider } from "#app/providers/query.tsx";
import { TRPCProvider } from "#app/providers/trpc.tsx";

export const AdminWrapper: React.FC<React.PropsWithChildren> = ({
	children,
}) => {
	const baseLinksContext = React.use(LinksContext);
	const linksContext = React.useMemo<LinksContextType>(
		() => ({
			...baseLinksContext,
			headers: { ...baseLinksContext.headers, "x-keep-real-auth": "true" },
		}),
		[baseLinksContext],
	);
	return (
		<LinksContext value={linksContext}>
			<QueryProvider queryClientKey={SELF_QUERY_CLIENT_KEY}>
				<TRPCProvider>{children}</TRPCProvider>
			</QueryProvider>
		</LinksContext>
	);
};
