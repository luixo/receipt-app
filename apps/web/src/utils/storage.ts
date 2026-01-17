import { del, get, set } from "idb-keyval";

import type { Props } from "~app/providers/persist-client";

export const storage: Props["storage"] =
	typeof window === "undefined"
		? undefined
		: {
				setItem: set,
				getItem: (key) =>
					get<string>(key).then((value) =>
						value === undefined ? null : value,
					),
				removeItem: del,
			};
