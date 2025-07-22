import React from "react";

import type { LinksContextType } from "~app/contexts/links-context";
import { LinksContext } from "~app/contexts/links-context";
import { SELF_QUERY_CLIENT_KEY } from "~app/contexts/query-clients-context";
import { QueryProvider } from "~app/providers/query";
import { TRPCProvider } from "~app/providers/trpc";

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
