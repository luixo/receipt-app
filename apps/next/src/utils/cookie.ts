import * as cookie from "cookie";
import type { IncomingMessage, ServerResponse } from "http";

export const getCookie = (
	req: IncomingMessage,
	cookieName: string,
): string | undefined => {
	const parsedCookies = cookie.parse(
		req.headers.cookie ? String(req.headers.cookie) : "",
	);
	return parsedCookies[cookieName];
};

export const setCookie = (
	res: ServerResponse,
	cookieName: string,
	cookieValue: string,
	opts?: cookie.CookieSerializeOptions,
) => {
	const setCookieHeader = res.getHeader("set-cookie") || "";
	res.setHeader(
		"set-cookie",
		setCookieHeader + cookie.serialize(cookieName, cookieValue, opts),
	);
};

export * from "cookie";
