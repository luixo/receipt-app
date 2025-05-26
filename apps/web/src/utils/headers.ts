import type { NextApiResponse } from "next";
import { entries } from "remeda";

export const getHeadersEntries = (input: globalThis.Headers) => {
	const headersEntries: [string, string][] = [];
	input.forEach((value: string, key: string) => {
		headersEntries.push([key, value]);
	});
	return headersEntries;
};

type InputHeaders = Record<string, undefined | string | string[]>;

const setHeaders = (input: globalThis.Headers, values: InputHeaders) => {
	entries(values).forEach(([key, value]) => {
		/* c8 ignore start */
		if (Array.isArray(value)) {
			value.forEach((subvalue) => {
				input.set(key, subvalue);
			});
			/* c8 ignore stop */
		} else if (value) {
			input.set(key, value);
		}
	});
};

export type RequestHeaders = globalThis.Headers;
export const createRequestHeaders = (
	initialValues?: InputHeaders,
): RequestHeaders => {
	// Hope it will work until v21
	// eslint-disable-next-line n/no-unsupported-features/node-builtins
	const headers = new globalThis.Headers();
	if (initialValues) {
		setHeaders(headers, initialValues);
	}
	return headers;
};

export type ResponseHeaders = globalThis.Headers;
export const createResponseHeaders = (
	res?: NextApiResponse,
): ResponseHeaders => {
	// Hope it will work until v21
	// eslint-disable-next-line n/no-unsupported-features/node-builtins
	const headers = new globalThis.Headers();
	if (!res) {
		return headers;
		/* c8 ignore start */
	}
	return new Proxy(headers, {
		get(target, prop) {
			const targetProp = target[prop as keyof typeof target];
			if (prop === "append") {
				return (name: string, value: string) => {
					res.appendHeader(name, value);
					return (targetProp as ResponseHeaders["append"]).call(
						target,
						name,
						value,
					);
				};
			}
			if (prop === "delete") {
				return (name: string) => {
					res.removeHeader(name);
					return (targetProp as ResponseHeaders["delete"]).call(target, name);
				};
			}
			if (prop === "set") {
				return (name: string, value: string) => {
					res.setHeader(name, value);
					return (targetProp as ResponseHeaders["set"]).call(
						target,
						name,
						value,
					);
				};
			}
			return typeof targetProp === "function"
				? (...args: Parameters<typeof targetProp>) =>
						// @ts-expect-error Some wild typescript errors
						targetProp.call(target, ...args)
				: targetProp;
		},
	});
};
/* c8 ignore stop */
