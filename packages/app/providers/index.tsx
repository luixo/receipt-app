import React from "react";

import type { Persister } from "@tanstack/react-query-persist-client";
import type { TRPCLink } from "@trpc/client";
import type { NextParsedUrlQuery } from "next/dist/server/request-meta";

import type { SSRContextData } from "~app/contexts/ssr-context";
import type { AppRouter } from "~app/trpc";

import { PersisterProvider } from "./persist-client";
import { QueryClientProvider } from "./query-client";
import { SearchParamsProvider } from "./search-params";
import { ShimsProvider } from "./shims";
import type { CookieContext } from "./ssr-data";
import { SSRDataProvider } from "./ssr-data";
import { TRPCProvider } from "./trpc";

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
	<QueryClientProvider>
		<ShimsProvider>
			<PersisterProvider persister={persister}>
				<SSRDataProvider data={cookiesData} context={cookiesContext}>
					<SearchParamsProvider searchParams={searchParams}>
						<TRPCProvider links={links}>{children}</TRPCProvider>
					</SearchParamsProvider>
				</SSRDataProvider>
			</PersisterProvider>
		</ShimsProvider>
	</QueryClientProvider>
);
