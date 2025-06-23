import type { serialize as serializeType } from "cookie";

import type { StoreContextType } from "~app/contexts/store-context";
import type { StoreValues } from "~app/utils/store-data";
import { YEAR } from "~utils/time";

export const getStoreContext = (
	serialize: typeof serializeType,
	nowTimestamp: number,
	initialValues: StoreValues,
): StoreContextType => ({
	getInitialItems: () => ({ nowTimestamp, values: initialValues }),
	setItem: (key, value) => {
		document.cookie = serialize(
			key,
			typeof value === "string" ? value : JSON.stringify(value),
			{
				path: "/",
				maxAge: YEAR / 1000,
				sameSite: "strict",
			},
		);
	},
	deleteItem: (key: string) => {
		document.cookie = serialize(key, "", {
			maxAge: -1,
			sameSite: "strict",
		});
	},
});
