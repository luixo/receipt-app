import * as cookie from "cookie";
import { IncomingMessage, ServerResponse } from "http";

const getParsedCookies = (cookieHeader?: string | string[] | number) => {
	let stringCookie: string;
	if (Array.isArray(cookieHeader)) {
		stringCookie = cookieHeader[0] || "";
	} else {
		stringCookie = String(cookieHeader);
	}
	return cookie.parse(stringCookie || "");
};

export const getCookie = (
	req: IncomingMessage,
	cookieName: string
): string | undefined => {
	const parsedCookies = getParsedCookies(req.headers.cookie);
	return parsedCookies[cookieName];
};

export const setCookie = (
	res: ServerResponse,
	cookieName: string,
	cookieValue: string,
	opts?: cookie.CookieSerializeOptions
) => {
	const setCookieHeader = res.getHeader("set-cookie") || "";
	res.setHeader(
		"set-cookie",
		setCookieHeader + cookie.serialize(cookieName, cookieValue, opts)
	);
};

export * from "cookie";
