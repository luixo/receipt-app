import type { SerializeOptions } from "cookie";
import { parse, serialize } from "cookie";

import type { UnauthorizedContext } from "~web/handlers/context";
import { getResHeader } from "~web/utils/headers";

export const getCookie = (
	cookieHeader: string | undefined,
	cookieName: string,
): string | undefined => parse(cookieHeader ?? "")[cookieName];

const DEFAULT_SET_COOKIE_OPTIONS: SerializeOptions = {
	httpOnly: true,
	path: "/",
	sameSite: "strict",
};

export const setCookie = (
	ctx: UnauthorizedContext,
	cookieName: string,
	cookieValue: string,
	opts: SerializeOptions = {},
) => {
	const setCookieHeader = getResHeader(ctx, "set-cookie") ?? "";
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
