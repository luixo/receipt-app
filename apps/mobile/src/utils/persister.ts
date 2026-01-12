import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import type { Persister } from "@tanstack/react-query-persist-client";

export const persister: Persister = createAsyncStoragePersister({
	storage: AsyncStorage,
});
