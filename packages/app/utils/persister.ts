import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import type { Persister } from "@tanstack/react-query-persist-client";
import { del, get, set } from "idb-keyval";

export const persister: Persister = createAsyncStoragePersister({
	storage:
		typeof window === "undefined"
			? undefined
			: {
					setItem: set,
					getItem: (key) =>
						get<string>(key).then((value) =>
							value === undefined ? null : value,
						),
					removeItem: del,
			  },
});
