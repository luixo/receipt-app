import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { del, get, set } from "idb-keyval";

import type { PersistStorageContextType } from "app/contexts/persist-storage-context";

export const webPersistStorage: PersistStorageContextType = {
	persister: createAsyncStoragePersister({
		storage:
			typeof window === "undefined"
				? undefined
				: {
						setItem: set,
						getItem: (key) =>
							get(key).then((value) => (value === undefined ? null : value)),
						removeItem: del,
				  },
	}),
};
