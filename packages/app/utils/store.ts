import * as cookieNext from "cookies-next";

import type { StoreContextType } from "~app/contexts/store-context";
import type { StoreValues } from "~app/utils/store-data";
import { YEAR } from "~utils/time";

export const getStoreContext = (
	nowTimestamp: number,
	initialValues: StoreValues,
): StoreContextType => ({
	getInitialItems: () => ({ nowTimestamp, values: initialValues }),
	setItem: (key, value) => {
		cookieNext.setCookie(key, value, {
			path: "/",
			maxAge: YEAR / 1000,
			sameSite: "strict",
		});
	},
	deleteItem: (key: string) => {
		cookieNext.deleteCookie(key, { sameSite: "strict" });
	},
});
