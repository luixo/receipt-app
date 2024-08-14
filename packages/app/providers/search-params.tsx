import type React from "react";

import { mapValues } from "remeda";

import type { SearchParamsContextType } from "~app/contexts/search-params-context";
import { SearchParamsContext } from "~app/contexts/search-params-context";
import { inputStore as receiptsGetPagedInputStore } from "~queries/receipts/get-paged";
import { inputStore as usersGetPagedInputStore } from "~queries/users/get-paged";

type Props = {
	searchParams: SearchParamsContextType;
};

export const SearchParamsProvider: React.FC<React.PropsWithChildren<Props>> = ({
	searchParams,
	children,
}) => {
	const parsedSearchParams = mapValues(searchParams, (valueOrValues) =>
		Array.isArray(valueOrValues) ? valueOrValues.at(-1) : valueOrValues,
	);
	return (
		<SearchParamsContext.Provider value={searchParams}>
			{[receiptsGetPagedInputStore, usersGetPagedInputStore].reduce(
				(acc, { Provider }) => (
					<Provider parsedQuery={parsedSearchParams}>{acc}</Provider>
				),
				children,
			)}
		</SearchParamsContext.Provider>
	);
};
