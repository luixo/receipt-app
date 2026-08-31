import { isNonNullish } from "remeda";

import type { UpdaterRevertResult } from "./types";

export const mergeUpdaterResults = (
	...results: (UpdaterRevertResult | undefined)[]
): UpdaterRevertResult => {
	const filteredResults = results.filter(isNonNullish);
	return {
		revertFn: () => {
			for (const fn of filteredResults
				.map(({ revertFn }) => revertFn)
				.filter(isNonNullish)) {
				fn();
			}
		},
		finalizeFn: () => {
			for (const fn of filteredResults
				.map(({ finalizeFn }) => finalizeFn)
				.filter(isNonNullish)) {
				fn();
			}
		},
	};
};
