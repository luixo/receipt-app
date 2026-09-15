import { createServerOnlyFn } from "@tanstack/react-start";
import type { SerializeOptions } from "cookie";
import { parse, serialize } from "cookie";

import type { UnauthorizedContext } from "~web/handlers/context";

export const getCookie = (
	cookieHeader: string | null,
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
	// It seems to be the simplest way to comply with the library
	// oxlint-disable-next-line eslint-js/no-restricted-syntax
	expires: new Date(expires.toInstant().epochMilliseconds),
	...opts,
});

export const setCookie = createServerOnlyFn(
	(
		{ resHeaders }: Pick<UnauthorizedContext, "resHeaders">,
		cookieName: string,
		cookieValue: string,
		opts: Options,
	) => {
		const newCookie = serialize(cookieName, cookieValue, getOptions(opts));
		resHeaders.set("Set-Cookie", newCookie);
	},
);
