import { defaultStringifySearch, interpolatePath } from "@tanstack/router-core";

import type { NavigationOptions, RouteTo } from "~app/utils/navigation";

export const buildUrl = <K extends RouteTo>({
	to,
	params = {},
	search,
}: NavigationOptions<K>) => {
	const { interpolatedPath, isMissingParams } = interpolatePath({
		path: to,
		params: params === true ? {} : params,
	});

	if (isMissingParams) {
		throw new Error(`Missing path params for ${to}`);
	}

	return `${interpolatedPath}${defaultStringifySearch(search ?? {})}`;
};
