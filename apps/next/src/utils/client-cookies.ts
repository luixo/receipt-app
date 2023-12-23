import * as cookieNext from "cookies-next";

import type { CookieContextType } from "app/contexts/cookie-context";
import { YEAR } from "app/utils/time";

export const nextCookieContext: CookieContextType = {
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
