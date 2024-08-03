import React from "react";

import { useRouter } from "solito/navigation";

import { QueryErrorMessage } from "~app/components/error-message";
import type { LinksContextType } from "~app/contexts/links-context";
import { LinksContext } from "~app/contexts/links-context";
import { SELF_QUERY_CLIENT_KEY } from "~app/contexts/query-clients-context";
import { SearchParamsContext } from "~app/contexts/search-params-context";
import { QueryProvider } from "~app/providers/query";
import { trpc } from "~app/trpc";

const NoAdminEffect: React.FC = () => {
	const router = useRouter();
	const accountQuery = trpc.account.get.useQuery();
	const role =
		accountQuery.status === "success" ? accountQuery.data.account.role : null;
	React.useEffect(() => {
		if (role === null || role === "admin") {
			return;
		}
		router.push(`/`);
	}, [role, router]);
	if (accountQuery.status === "error") {
		return <QueryErrorMessage query={accountQuery} />;
	}
	return null;
};

export const AdminWrapper: React.FC<React.PropsWithChildren> = ({
	children,
}) => {
	const searchParams = React.useContext(SearchParamsContext);
	const baseLinksContext = React.useContext(LinksContext);
	const linksContext = React.useMemo<LinksContextType>(
		() => ({
			...baseLinksContext,
			searchParams,
			headers: { ...baseLinksContext.headers, "x-keep-real-auth": "true" },
		}),
		[baseLinksContext, searchParams],
	);
	return (
		<QueryProvider
			linksContext={linksContext}
			useQueryClientKey={() => SELF_QUERY_CLIENT_KEY}
		>
			{children}
		</QueryProvider>
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
