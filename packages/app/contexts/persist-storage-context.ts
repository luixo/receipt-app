import * as React from "react";

import type { Persister } from "@tanstack/query-persist-client-core";

export type PersistStorageContextType = {
	persister: Persister;
};

export const PersistStorageContext =
	React.createContext<PersistStorageContextType | null>(null);
