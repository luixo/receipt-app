import { isNonNullish, unique } from "remeda";

import type { TRPCError } from "~app/trpc";

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

export const mergeErrors = (errors: TRPCError[]) =>
	unique(errors.map((error) => error.message)).join("\n");
