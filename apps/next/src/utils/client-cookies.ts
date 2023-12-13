import * as cookieNext from "cookies-next";

import { YEAR } from "app/utils/time";

export const setCookie = <T>(key: string, value: T, maxAge = YEAR) => {
	cookieNext.setCookie(key, value, {
		path: "/",
		maxAge: maxAge / 1000,
		sameSite: "strict",
	});
};

export const deleteCookie = (key: string) => {
	cookieNext.deleteCookie(key, { sameSite: "strict" });
};

export * from "cookies-next";
