import { serialize } from "cookie";

import type { StoreContextType } from "~app/contexts/store-context";
import type { StoreValues } from "~app/utils/store-data";

export const getStoreContext = (
	nowTimestamp: Temporal.ZonedDateTime,
	initialValues: StoreValues,
): StoreContextType => ({
	getInitialItems: () => ({ ...initialValues, nowTimestamp }),
	setItem: (key, value) => {
		// Switch to cookie store whenever it's widespread enough
		// oxlint-disable-next-line unicorn/no-document-cookie
		document.cookie = serialize(
			key,
			typeof value === "string" ? value : JSON.stringify(value),
			{
				path: "/",
				maxAge: Temporal.Duration.from({ years: 1 }).total({
					unit: "seconds",
					relativeTo: Temporal.Now.plainDateISO(),
				}),
				sameSite: "strict",
			},
		);
	},
	deleteItem: (key: string) => {
		// Switch to cookie store whenever it's widespread enough
		// oxlint-disable-next-line unicorn/no-document-cookie
		document.cookie = serialize(key, "", {
			maxAge: -1,
			sameSite: "strict",
		});
	},
});
