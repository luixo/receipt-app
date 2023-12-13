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

export * from "cookie";
