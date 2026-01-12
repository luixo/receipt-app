import AsyncStorage from "@react-native-async-storage/async-storage";

import type { StoreContextType } from "~app/contexts/store-context";
import { getStoreValuesFromInitialValues } from "~app/utils/store-data";
import { getNow } from "~utils/date";

const COOKIE_PREFIX = "__cookie:";

const getValues = async () => {
	const keys = await AsyncStorage.getAllKeys();
	const filteredKeys = keys.filter((key) => key.startsWith(COOKIE_PREFIX));
	const values = await AsyncStorage.multiGet(filteredKeys);
	return getStoreValuesFromInitialValues(
		values.reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {}),
	);
};

export const storeContext: StoreContextType = {
	getInitialItems: () => ({
		nowTimestamp: getNow.zonedDateTime(),
		values: getValues(),
	}),
	setItem: async (key, value) => {
		await AsyncStorage.setItem(`${COOKIE_PREFIX}${key}`, JSON.stringify(value));
	},
	deleteItem: async (key) => {
		await AsyncStorage.removeItem(`${COOKIE_PREFIX}${key}`);
	},
};
