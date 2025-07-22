import { isNonNullish } from "remeda";

import type { UpdaterRevertResult } from "./types";

export const mergeUpdaterResults = (
	...results: (UpdaterRevertResult | undefined)[]
): UpdaterRevertResult => {
	const filteredResults = results.filter(isNonNullish);
	return {
		revertFn: () => {
			filteredResults
				.map(({ revertFn }) => revertFn)
				.filter(isNonNullish)
				.forEach((fn) => fn());
		},
		finalizeFn: () => {
			filteredResults
				.map(({ finalizeFn }) => finalizeFn)
				.filter(isNonNullish)
				.forEach((fn) => fn());
		},
	};
};
