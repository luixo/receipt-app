import { createMMKV } from "react-native-mmkv";
import { fromEntries } from "remeda";

import type { StoreContextType } from "~app/contexts/store-context";
import { getStoreValuesFromInitialValues } from "~app/utils/store-data";

const storage = createMMKV({ id: "cookie-jar" });

export const storeContext: StoreContextType = {
	getInitialItems: () => ({
		...getStoreValuesFromInitialValues(
			fromEntries(
				storage.getAllKeys().map((key) => [key, storage.getString(key)]),
			),
		),
		nowTimestamp: Temporal.Now.zonedDateTimeISO(),
	}),
	setItem: (key, value) => {
		storage.set(key, JSON.stringify(value));
	},
	deleteItem: (key) => {
		storage.remove(key);
	},
};
