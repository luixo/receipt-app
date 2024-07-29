import React from "react";

import { SELF_QUERY_CLIENT_KEY } from "~app/contexts/query-clients-context";
import { SearchParamsContext } from "~app/contexts/search-params-context";
import { QueryProvider } from "~app/providers/query";
import { useLinks } from "~web/utils/trpc";

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
