import { createMMKV } from "react-native-mmkv";
import { fromEntries } from "remeda";

import type { StoreContextType } from "~app/contexts/store-context";
import { getStoreValuesFromInitialValues } from "~app/utils/store-data";
import { getNow } from "~utils/date";

const storage = createMMKV({ id: "cookie-jar" });

export const storeContext: StoreContextType = {
	getInitialItems: () => ({
		...getStoreValuesFromInitialValues(
			fromEntries(
				storage.getAllKeys().map((key) => [key, storage.getString(key)]),
			),
		),
		nowTimestamp: getNow.zonedDateTime(),
	}),
	setItem: (key, value) => {
		storage.set(key, JSON.stringify(value));
	},
	deleteItem: (key) => {
		storage.remove(key);
	},
};
