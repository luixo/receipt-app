import React from "react";

import { useQuery } from "@tanstack/react-query";

import { QueryErrorMessage } from "~app/components/error-message";
import type { LinksContextType } from "~app/contexts/links-context";
import { LinksContext } from "~app/contexts/links-context";
import { SELF_QUERY_CLIENT_KEY } from "~app/contexts/query-clients-context";
import { useNavigate } from "~app/hooks/use-navigation";
import { QueryProvider } from "~app/providers/query";
import { useTRPC } from "~app/utils/trpc";

const NoAdminEffect: React.FC = () => {
	const trpc = useTRPC();
	const navigate = useNavigate();
	const accountQuery = useQuery(trpc.account.get.queryOptions());
	const role =
		accountQuery.status === "success" ? accountQuery.data.account.role : null;
	React.useEffect(() => {
		if (role === null || role === "admin") {
			return;
		}
		navigate({ to: "/" });
	}, [role, navigate]);
	if (accountQuery.status === "error") {
		return <QueryErrorMessage query={accountQuery} />;
	}
	return null;
};

export const AdminWrapper: React.FC<React.PropsWithChildren> = ({
	children,
}) => {
	const baseLinksContext = React.useContext(LinksContext);
	const linksContext = React.useMemo<LinksContextType>(
		() => ({
			...baseLinksContext,
			headers: { ...baseLinksContext.headers, "x-keep-real-auth": "true" },
		}),
		[baseLinksContext],
	);
	return (
		<LinksContext.Provider value={linksContext}>
			<QueryProvider queryClientKey={SELF_QUERY_CLIENT_KEY}>
				{children}
			</QueryProvider>
		</LinksContext.Provider>
	);
};

export const AdminWrapperWithEffect: React.FC<React.PropsWithChildren> = ({
	children,
}) => (
	<AdminWrapper>
		{children}
		<NoAdminEffect />
	</AdminWrapper>
);
