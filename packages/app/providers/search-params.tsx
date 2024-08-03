import type React from "react";

import type { SearchParamsContextType } from "~app/contexts/search-params-context";
import { SearchParamsContext } from "~app/contexts/search-params-context";
import type { ParsedQuery } from "~queries";
import { receipts, users } from "~queries";

type Props = {
	searchParams: SearchParamsContextType;
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
		<SearchParamsContext.Provider value={searchParams}>
			{[receipts.getPaged.inputStore, users.getPaged.inputStore].reduce(
				(acc, { Provider }) => (
					<Provider parsedQuery={parsedSearchParams}>{acc}</Provider>
				),
				children,
			)}
		</SearchParamsContext.Provider>
	);
};
