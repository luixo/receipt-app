import { serverOnly } from "@tanstack/react-start";
import { setCookie as setRawCookie } from "@tanstack/react-start/server";
import type { SerializeOptions } from "cookie";
import { parse } from "cookie";

import type { Temporal } from "~utils/date";
import type { UnauthorizedContext } from "~web/handlers/context";

export const getCookie = (
	cookieHeader: string | undefined,
	cookieName: string,
): string | undefined => parse(cookieHeader ?? "")[cookieName];

const DEFAULT_SET_COOKIE_OPTIONS: SerializeOptions = {
	httpOnly: true,
	path: "/",
	sameSite: "strict",
};

export const setCookie = serverOnly(
	(
		{ event }: UnauthorizedContext,
		cookieName: string,
		cookieValue: string,
		{
			expires,
			...opts
		}: Omit<SerializeOptions, "expires"> & {
			expires: Temporal.ZonedDateTime;
		},
	) => {
		setRawCookie(event, cookieName, cookieValue, {
			...DEFAULT_SET_COOKIE_OPTIONS,
			expires: expires.toDate(),
			...opts,
		});
	},
);
