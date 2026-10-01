import React from "react";

import { StoreDataContext } from "~app/contexts/store-data-context";
import {
	SELECTED_COLOR_MODE_STORE_NAME,
	SYSTEM_COLOR_MODE_STORE_NAME,
} from "~app/utils/store/color-modes";

export const useColorModes = () => ({
	selected: React.use(StoreDataContext)[SELECTED_COLOR_MODE_STORE_NAME],
	system: React.use(StoreDataContext)[SYSTEM_COLOR_MODE_STORE_NAME],
});
