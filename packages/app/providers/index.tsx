import React from "react";

import type { Persister } from "@tanstack/react-query-persist-client";
import type { TRPCLink } from "@trpc/client";
import type { NextParsedUrlQuery } from "next/dist/server/request-meta";

import type { SSRContextData } from "~app/contexts/ssr-context";
import { usePretendUserClientKey } from "~app/hooks/use-pretend-user-client-key";
import type { AppRouter } from "~app/trpc";

import { PersisterProvider } from "./persist-client";
import { QueryProvider } from "./query";
import { SearchParamsProvider } from "./search-params";
import { ShimsProvider } from "./shims";
import type { CookieContext } from "./ssr-data";
import { SSRDataProvider } from "./ssr-data";

type Props = {
	searchParams: NextParsedUrlQuery;
	cookiesContext: CookieContext;
	cookiesData: SSRContextData;
	persister: Persister;
	links: TRPCLink<AppRouter>[];
};

export const Provider: React.FC<React.PropsWithChildren<Props>> = ({
	children,
	cookiesContext,
	cookiesData,
	searchParams,
	persister,
	links,
}) => (
	<SSRDataProvider data={cookiesData} context={cookiesContext}>
		<QueryProvider links={links} useQueryClientKey={usePretendUserClientKey}>
			<ShimsProvider>
				<PersisterProvider persister={persister}>
					<SearchParamsProvider searchParams={searchParams}>
						{children}
					</SearchParamsProvider>
				</PersisterProvider>
			</ShimsProvider>
		</QueryProvider>
	</SSRDataProvider>
);
