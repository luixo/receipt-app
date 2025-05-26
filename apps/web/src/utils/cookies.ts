import type { CookieSerializeOptions } from "cookie";
import { parse, serialize } from "cookie";

import type { UnauthorizedContext } from "~web/handlers/context";

const getCookies = (
	req: UnauthorizedContext["req"],
): Partial<Record<string, string>> => parse(req.headers.get("cookie") || "");

export const getCookie = (
	req: UnauthorizedContext["req"],
	cookieName: string,
): string | undefined => getCookies(req)[cookieName];

const DEFAULT_SET_COOKIE_OPTIONS: CookieSerializeOptions = {
	httpOnly: true,
	path: "/",
	sameSite: "strict",
};

export const setCookie = (
	ctx: UnauthorizedContext,
	cookieName: string,
	cookieValue: string,
	opts: CookieSerializeOptions = {},
) => {
	const setCookieHeader = ctx.res.headers.get("set-cookie") || "";
	ctx.res.headers.set(
		"set-cookie",
		setCookieHeader.toString() +
			serialize(cookieName, cookieValue, {
				...DEFAULT_SET_COOKIE_OPTIONS,
				...opts,
			}),
	);
};
