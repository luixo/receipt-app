import React from "react";

import type { Persister } from "@tanstack/react-query-persist-client";
import type { NextParsedUrlQuery } from "next/dist/server/request-meta";

import type { SSRContextData } from "~app/contexts/ssr-context";

import { PersisterProvider } from "./persist-client";
import { SearchParamsProvider } from "./search-params";
import { ShimsProvider } from "./shims";
import type { CookieContext } from "./ssr-data";
import { SSRDataProvider } from "./ssr-data";

type Props = {
	searchParams: NextParsedUrlQuery;
	cookiesContext: CookieContext;
	cookiesData: SSRContextData;
	persister: Persister;
};

export const Provider: React.FC<React.PropsWithChildren<Props>> = ({
	children,
	cookiesContext,
	cookiesData,
	searchParams,
	persister,
}) => (
	<ShimsProvider>
		<PersisterProvider persister={persister}>
			<SSRDataProvider data={cookiesData} context={cookiesContext}>
				<SearchParamsProvider searchParams={searchParams}>
					{children}
				</SearchParamsProvider>
			</SSRDataProvider>
		</PersisterProvider>
	</ShimsProvider>
);
