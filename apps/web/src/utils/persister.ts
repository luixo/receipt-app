import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import type { Persister } from "@tanstack/react-query-persist-client";
import { del, get, set } from "idb-keyval";

export const webPersister: Persister = createAsyncStoragePersister({
	storage:
		typeof window === "undefined"
			? undefined
			: {
					setItem: set,
					getItem: (key) =>
						get(key).then((value) => (value === undefined ? null : value)),
					removeItem: del,
			  },
});
