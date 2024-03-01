import AsyncStorage from "@react-native-async-storage/async-storage";

import type { CookieContext } from "~app/providers/ssr-data";
import type { Cookies } from "~app/utils/trpc";

const COOKIE_PREFIX = "__cookie:";
export const mobileCookieContext: CookieContext = {
	setCookie: (key, value) => {
		void AsyncStorage.setItem(`${COOKIE_PREFIX}${key}`, JSON.stringify(value));
	},
	deleteCookie: (key) => {
		void AsyncStorage.removeItem(`${COOKIE_PREFIX}${key}`);
	},
};
export const getCookieContext = async (): Promise<Cookies> => {
	const keys = await AsyncStorage.getAllKeys();
	const filteredKeys = keys.filter((key) => key.startsWith(COOKIE_PREFIX));
	const values = await AsyncStorage.multiGet(filteredKeys);
	return values.reduce(
		(acc, [key, value]) => ({
			...acc,
			[key]: value,
		}),
		{},
	);
};
