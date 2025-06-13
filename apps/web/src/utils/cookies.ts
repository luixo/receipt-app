import { setCookie as setRawCookie } from "@tanstack/react-start/server";
import type { CookieSerializeOptions } from "cookie";
import { parse } from "cookie";

import type { UnauthorizedContext } from "~web/handlers/context";

export const getCookie = (
	cookieHeader: string | undefined,
	cookieName: string,
): string | undefined => parse(cookieHeader ?? "")[cookieName];

const DEFAULT_SET_COOKIE_OPTIONS: CookieSerializeOptions = {
	httpOnly: true,
	path: "/",
	sameSite: "strict",
};

export const setCookie = (
	{ event }: UnauthorizedContext,
	cookieName: string,
	cookieValue: string,
	opts: CookieSerializeOptions = {},
) => {
	setRawCookie(event, cookieName, cookieValue, {
		...DEFAULT_SET_COOKIE_OPTIONS,
		...opts,
	});
};
