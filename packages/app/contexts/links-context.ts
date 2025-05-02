import * as React from "react";

import type { getLinks } from "~app/utils/trpc";

export type LinksContextType = Parameters<typeof getLinks>[0];

export const DEFAULT_TRPC_ENDPOINT = "/api/trpc";

export const LinksContext = React.createContext<LinksContextType>({
	searchParams: {
		debug: null,
		proxyPort: null,
		controllerId: null,
	},
	url: DEFAULT_TRPC_ENDPOINT,
	source: "unset",
	captureError: () => "not-implemented",
});
