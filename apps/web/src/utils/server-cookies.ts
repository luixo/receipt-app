import * as cookie from "cookie";
import type { IncomingMessage, ServerResponse } from "http";

import type { Cookies } from "~app/utils/cookies";

export const getCookies = (
	req: IncomingMessage,
): Partial<Record<string, string>> =>
	cookie.parse(req.headers.cookie ? String(req.headers.cookie) : "");

export const getCookie = (
	req: IncomingMessage,
	cookieName: string,
): string | undefined => getCookies(req)[cookieName];

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

export const AUTH_COOKIE = "authToken";

export const setAuthCookie = (
	res: ServerResponse,
	authToken: string,
	expirationDate: Date,
) => {
	setCookie(res, AUTH_COOKIE, authToken, {
		httpOnly: true,
		expires: expirationDate,
		path: "/",
		sameSite: "strict",
	});
};

export const resetAuthCookie = (res: ServerResponse) =>
	setAuthCookie(res, "", new Date());

export const serializeCookieHeader = (
	cookies: Cookies,
	pick?: string[],
): string => {
	let entries = Object.entries(cookies);
	/* c8 ignore start */
	if (pick) {
		entries = entries.filter(([key]) => pick.includes(key));
	}
	/* c8 ignore stop */
	return entries.map(([key, value]) => cookie.serialize(key, value!)).join(";");
};

export * from "cookie";
