import React from "react";

import { PersistStorageContext } from "~app/contexts/persist-storage-context";
import { webPersistStorage } from "~web/utils/persist-storage";

export const PersistStorageProvider: React.FC<
	React.PropsWithChildren<object>
> = ({ children }) => (
	<PersistStorageContext.Provider value={webPersistStorage}>
		{children}
	</PersistStorageContext.Provider>
);
