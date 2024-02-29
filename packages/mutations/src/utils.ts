import { nonNullishGuard } from "~utils";

import type { UpdaterRevertResult } from "./types";

export const mergeUpdaterResults = (
	...results: (UpdaterRevertResult | undefined)[]
): UpdaterRevertResult => {
	const filteredResults = results.filter(nonNullishGuard);
	return {
		revertFn: () => {
			filteredResults
				.map(({ revertFn }) => revertFn)
				.filter(nonNullishGuard)
				.forEach((fn) => fn());
		},
		finalizeFn: () => {
			filteredResults
				.map(({ finalizeFn }) => finalizeFn)
				.filter(nonNullishGuard)
				.forEach((fn) => fn());
		},
	};
};
