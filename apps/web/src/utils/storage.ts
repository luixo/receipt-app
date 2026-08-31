import { isServer } from "@tanstack/react-query";
import { del, get, set } from "idb-keyval";

import type { Props } from "~app/providers/persist-client";

export const storage: Props["storage"] = isServer
	? undefined
	: {
			setItem: set,
			getItem: async (key) => {
				const value = await get<string>(key);
				return value === undefined ? null : value;
			},
			removeItem: del,
		};
