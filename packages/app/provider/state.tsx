import React from "react";

import { NextParsedUrlQuery } from "next/dist/server/request-meta";

import { cache } from "app/cache";
import { createStore, ParsedQuery } from "app/utils/store";

type Props = {
	query: NextParsedUrlQuery;
};

const inputs: ReturnType<typeof createStore>[] = [
	cache.users.getPaged.inputStore,
	cache.receipts.getPaged.inputStore,
];

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
		{}
	);
	return inputs.reduce(
		(acc, input) => (
			<input.Provider createStore={input.useCreateStore(parsedQuery)}>
				{acc}
			</input.Provider>
		),
		children
	);
};
