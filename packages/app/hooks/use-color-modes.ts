import React from "react";

import { StoreDataContext } from "~app/contexts/store-data-context";
import {
	LAST_COLOR_MODE_STORE_NAME,
	SELECTED_COLOR_MODE_STORE_NAME,
} from "~app/utils/store/color-modes";

export const useLastColorMode = () =>
	React.useContext(StoreDataContext)[LAST_COLOR_MODE_STORE_NAME];

export const useSelectedColorMode = () =>
	React.useContext(StoreDataContext)[SELECTED_COLOR_MODE_STORE_NAME];
