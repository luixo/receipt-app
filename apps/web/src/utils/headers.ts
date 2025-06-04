import type { IncomingMessage, ServerResponse } from "node:http";
import { entries } from "remeda";

const getFirstValue = (valueOrValues: string | number | string[] | undefined) =>
	/* c8 ignore start */
	typeof valueOrValues === "undefined"
		? undefined
		: Array.isArray(valueOrValues)
		? valueOrValues[0]
		: String(valueOrValues);
/* c8 ignore stop */

export const getResHeaders = (response: ServerResponse) => {
	const headersEntries: [string, string][] = [];
	entries(response.getHeaders()).forEach(([key, valueOrValues]) => {
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

export const getResHeader = (response: ServerResponse, key: string) =>
	getFirstValue(response.getHeader(key));

export const getReqHeader = (request: IncomingMessage, key: string) =>
	getFirstValue(request.headers[key]);
