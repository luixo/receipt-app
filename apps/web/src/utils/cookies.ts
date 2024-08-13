import * as cookie from "cookie";
import type { IncomingMessage, ServerResponse } from "http";

const getCookies = (req: IncomingMessage): Partial<Record<string, string>> =>
	cookie.parse(req.headers.cookie ? String(req.headers.cookie) : "");

export const getCookie = (
	req: IncomingMessage,
	cookieName: string,
): string | undefined => getCookies(req)[cookieName];

const DEFAULT_SET_COOKIE_OPTIONS: cookie.CookieSerializeOptions = {
	httpOnly: true,
	path: "/",
	sameSite: "strict",
};

export const setCookie = (
	res: ServerResponse,
	cookieName: string,
	cookieValue: string,
	opts: cookie.CookieSerializeOptions = {},
) => {
	const setCookieHeader = res.getHeader("set-cookie") || "";
	res.setHeader(
		"set-cookie",
		setCookieHeader.toString() +
			cookie.serialize(cookieName, cookieValue, {
				...DEFAULT_SET_COOKIE_OPTIONS,
				...opts,
			}),
	);
};

export * from "cookie";
