import * as React from "react";

import type { NextParsedUrlQuery } from "next/dist/server/request-meta";

export type SearchParamsContextType = NextParsedUrlQuery;

export const SearchParamsContext = React.createContext<SearchParamsContextType>(
	{},
);
