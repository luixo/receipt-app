import * as React from "react";

import { TRPC_ENDPOINT } from "~app/utils/queries";
import { getLinks } from "~app/utils/trpc";

export type LinksContextType = Parameters<typeof getLinks>[1];

export const LinksContext = React.createContext<LinksContextType>({
	url: TRPC_ENDPOINT,
	source: "unset",
	captureError: () => "not-implemented",
});
