import * as React from "react";

import type { getLinks } from "~app/utils/trpc";

export type LinksContextType = Parameters<typeof getLinks>[1];

export const DEFAULT_TRPC_ENDPOINT = "/api/trpc";

export const LinksContext = React.createContext<LinksContextType>({
	url: DEFAULT_TRPC_ENDPOINT,
	source: "unset",
	captureError: () => "not-implemented",
});
