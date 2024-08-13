import type React from "react";

import type { Persister } from "@tanstack/react-query-persist-client";
import type { NextParsedUrlQuery } from "next/dist/server/request-meta";

import type { CookieContextType } from "~app/contexts/cookie-context";
import { CookieContext } from "~app/contexts/cookie-context";
import type { LinksContextType } from "~app/contexts/links-context";
import type { QueryClientsRecord } from "~app/contexts/query-clients-context";
import type { SSRContextData } from "~app/contexts/ssr-context";

import { PersisterProvider } from "./persist-client";
import { QueryProvider } from "./query";
import { SearchParamsProvider } from "./search-params";
import { ShimsProvider } from "./shims";
import { SSRDataProvider } from "./ssr-data";

type Props = {
	searchParams: NextParsedUrlQuery;
	cookiesContext: CookieContextType;
	cookiesData: SSRContextData;
	persister: Persister;
	linksContext: LinksContextType;
	useQueryClientKey: () => keyof QueryClientsRecord | undefined;
};

export const Provider: React.FC<React.PropsWithChildren<Props>> = ({
	children,
	cookiesContext,
	cookiesData,
	searchParams,
	persister,
	linksContext,
	useQueryClientKey,
}) => (
	<SearchParamsProvider searchParams={searchParams}>
		<CookieContext.Provider value={cookiesContext}>
			<SSRDataProvider data={cookiesData}>
				<QueryProvider
					linksContext={linksContext}
					useQueryClientKey={useQueryClientKey}
				>
					<ShimsProvider>
						<PersisterProvider persister={persister}>
							{children}
						</PersisterProvider>
					</ShimsProvider>
				</QueryProvider>
			</SSRDataProvider>
		</CookieContext.Provider>
	</SearchParamsProvider>
);
