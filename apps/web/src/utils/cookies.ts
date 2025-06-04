import type { CookieSerializeOptions } from "cookie";
import { parse, serialize } from "cookie";

import type { UnauthorizedContext } from "~web/handlers/context";
import { getReqHeader, getResHeader } from "~web/utils/headers";

const getCookies = (
	req: UnauthorizedContext["req"],
): Partial<Record<string, string>> => parse(getReqHeader(req, "cookie") ?? "");

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
	const setCookieHeader = getResHeader(ctx.res, "set-cookie") ?? "";
	ctx.res.setHeader(
		"set-cookie",
		[
			setCookieHeader,
			serialize(cookieName, cookieValue, {
				...DEFAULT_SET_COOKIE_OPTIONS,
				...opts,
			}),
		]
			.filter(Boolean)
			.join(";"),
	);
};
