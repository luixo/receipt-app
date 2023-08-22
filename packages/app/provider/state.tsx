import React from "react";

import type { NextParsedUrlQuery } from "next/dist/server/request-meta";

import { inputs } from "app/queries";
import type { ParsedQuery } from "app/utils/store";

type Props = {
	query: NextParsedUrlQuery;
};

export const StateProvider: React.FC<React.PropsWithChildren<Props>> = ({
	query,
	children,
}) => {
	const parsedQuery = Object.entries(query).reduce<ParsedQuery>(
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
					<Provider parsedQuery={parsedQuery}>{acc}</Provider>
				),
				children,
			)}
		</>
	);
};
