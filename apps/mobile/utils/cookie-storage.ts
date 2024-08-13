import AsyncStorage from "@react-native-async-storage/async-storage";

import type { CookieContextType } from "~app/contexts/cookie-context";
import type { Cookies } from "~app/utils/cookies";

const COOKIE_PREFIX = "__cookie:";
export const mobileCookieContext: CookieContextType = {
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
