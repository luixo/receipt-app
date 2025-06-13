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

export const getResHeaders = (ctx: NetContext) => {
	const headersEntries: [string, string][] = [];
	entries(ctx.res.getHeaders()).forEach(([key, valueOrValues]) => {
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

export const getResHeader = (ctx: NetContext, key: string) =>
	getFirstValue(ctx.res.getHeader(key));

export const getReqHeader = (ctx: NetContext, key: string) =>
	getFirstValue(ctx.req.headers[key]);
