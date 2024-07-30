import React from "react";

import { useRouter } from "solito/navigation";

import { QueryErrorMessage } from "~app/components/error-message";
import { SELF_QUERY_CLIENT_KEY } from "~app/contexts/query-clients-context";
import { SearchParamsContext } from "~app/contexts/search-params-context";
import { QueryProvider } from "~app/providers/query";
import { trpc } from "~app/trpc";
import { useLinks } from "~web/utils/trpc";

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
	const links = useLinks(searchParams, {
		headers: { "x-keep-real-auth": "true" },
	});
	return (
		<QueryProvider
			links={links}
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
