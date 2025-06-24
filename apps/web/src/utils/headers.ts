import { entries } from "remeda";

import type { NetContext } from "~web/handlers/context";

const getFirstValue = (valueOrValues: string | number | string[] | undefined) =>
	/* c8 ignore start */
	typeof valueOrValues === "undefined"
		? undefined
		: Array.isArray(valueOrValues)
		? valueOrValues[0]
		: String(valueOrValues);
/* c8 ignore stop */

export const getResHeaders = ({ event }: NetContext) => {
	const headersEntries: [string, string][] = [];
	entries(event.node.res.getHeaders()).forEach(([key, valueOrValues]) => {
		const value = getFirstValue(valueOrValues);
		/* c8 ignore start */
		if (!value) {
			return;
		}
		/* c8 ignore stop */
		headersEntries.push([key, value]);
	});
	return headersEntries;
};

export const getReqHeader = ({ event }: NetContext, key: string) =>
	getFirstValue(event.node.req.headers[key]);
