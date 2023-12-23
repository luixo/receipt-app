import React from "react";

import type { NextParsedUrlQuery } from "next/dist/server/request-meta";

import { inputs } from "app/queries";
import type { ParsedQuery } from "app/utils/store";

type Props = {
	searchParams: NextParsedUrlQuery;
};

export const SearchParamsProvider: React.FC<React.PropsWithChildren<Props>> = ({
	searchParams,
	children,
}) => {
	const parsedSearchParams = Object.entries(searchParams).reduce<ParsedQuery>(
		(acc, [name, valueOrValues]) => {
			acc[name] = Array.isArray(valueOrValues)
				? valueOrValues.at(-1)
				: valueOrValues;
			return acc;
		},
		{},
	);
	return (
		<>
			{inputs.reduce(
				(acc, { Provider }) => (
					<Provider parsedQuery={parsedSearchParams}>{acc}</Provider>
				),
				children,
			)}
		</>
	);
};
