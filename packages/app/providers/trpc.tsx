import React from "react";

import { useQueryClient } from "@tanstack/react-query";
import { createTRPCClient } from "@trpc/client";

import { LinksContext } from "~app/contexts/links-context";
import { TRPCProvider as RawTRPCProvider, getLinks } from "~app/utils/trpc";

export const TRPCProvider: React.FC<React.PropsWithChildren> = ({
	children,
}) => {
	const linksContext = React.useContext(LinksContext);
	const queryClient = useQueryClient();
	const trpcClient = React.useMemo(
		() => createTRPCClient({ links: getLinks(linksContext) }),
		[linksContext],
	);
	return (
		<RawTRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
			{children}
		</RawTRPCProvider>
	);
};
