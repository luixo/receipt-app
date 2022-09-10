import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { get, set, del } from "idb-keyval";

export const createIDBStorage = (): Parameters<
	typeof createAsyncStoragePersister
>["0"]["storage"] => ({
	setItem: set,
	getItem: (key) =>
		get(key).then((value) => (value === undefined ? null : value)),
	removeItem: del,
});
