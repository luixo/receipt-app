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

type Options = Omit<SerializeOptions, "expires"> & {
	expires: Temporal.ZonedDateTime;
};

export const getOptions = ({ expires, ...opts }: Options) => ({
	...DEFAULT_SET_COOKIE_OPTIONS,
	expires: expires.toDate(),
	...opts,
});

export const setCookie = serverOnly(
	(
		{ event }: Pick<UnauthorizedContext, "event">,
		cookieName: string,
		cookieValue: string,
		opts: Options,
	) => {
		setRawCookie(event, cookieName, cookieValue, getOptions(opts));
	},
);
