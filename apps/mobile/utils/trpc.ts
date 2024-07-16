import React from "react";

import { TRPC_ENDPOINT } from "~app/utils/queries";
import type { SearchParams } from "~app/utils/trpc";
import { getLinks } from "~app/utils/trpc";
import { useBaseUrl } from "~mobile/hooks/use-base-url";

export const useLinks = (searchParams: SearchParams) => {
	const baseUrl = useBaseUrl();
	const [links] = React.useState(() =>
		getLinks(`${baseUrl}${TRPC_ENDPOINT}`, {
			useBatch: true,
			searchParams,
			source: "native",
			captureError: () => "native-not-implemented",
		}),
	);
	return links;
};
