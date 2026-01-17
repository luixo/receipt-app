import type { serialize as serializeType } from "cookie";

import type { StoreContextType } from "~app/contexts/store-context";
import type { StoreValues } from "~app/utils/store-data";
import type { Temporal } from "~utils/date";
import { serializeDuration } from "~utils/date";

export const getStoreContext = (
	serialize: typeof serializeType,
	nowTimestamp: Temporal.ZonedDateTime,
	initialValues: StoreValues,
): StoreContextType => ({
	getInitialItems: () => ({ nowTimestamp, values: initialValues }),
	setItem: (key, value) => {
		// Switch to cookie store whenever it's widespread enough
		// eslint-disable-next-line unicorn/no-document-cookie
		document.cookie = serialize(
			key,
			typeof value === "string" ? value : JSON.stringify(value),
			{
				path: "/",
				maxAge: serializeDuration({ years: 1 }) / 1000,
				sameSite: "strict",
			},
		);
	},
	deleteItem: (key: string) => {
		// Switch to cookie store whenever it's widespread enough
		// eslint-disable-next-line unicorn/no-document-cookie
		document.cookie = serialize(key, "", {
			maxAge: -1,
			sameSite: "strict",
		});
	},
});
