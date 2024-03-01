import { useSearchParams as useRawSearchParams } from "solito/navigation";

import type { SearchParams } from "~app/utils/trpc";

export const useSearchParams = (): SearchParams => {
	const searchParams = useRawSearchParams();
	if (!searchParams) {
		return {};
	}
	return [...searchParams.entries()].reduce<SearchParams>(
		(acc, [key, value]) => {
			const prevValue = acc[key];
			return {
				...acc,
				[key]: Array.isArray(prevValue)
					? [...prevValue, value]
					: prevValue
					? [prevValue, value]
					: value,
			};
		},
		{},
	);
};
