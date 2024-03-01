import * as cookieNext from "cookies-next";

import type { CookieContext } from "~app/providers/ssr-data";
import { YEAR } from "~utils";

export const nextCookieContext: CookieContext = {
	setCookie: (key, value, { maxAge = YEAR } = {}) => {
		cookieNext.setCookie(key, value, {
			path: "/",
			maxAge: maxAge / 1000,
			sameSite: "strict",
		});
	},
	deleteCookie: (key: string) => {
		cookieNext.deleteCookie(key, { sameSite: "strict" });
	},
};
