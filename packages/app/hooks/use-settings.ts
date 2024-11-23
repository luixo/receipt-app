import React from "react";

import { StoreDataContext } from "~app/contexts/store-data-context";
import { SETTINGS_STORE_NAME } from "~app/utils/store/settings";

export const useSettings = () =>
	React.useContext(StoreDataContext)[SETTINGS_STORE_NAME];
