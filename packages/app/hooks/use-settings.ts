import React from "react";

import { StoreDataContext } from "#app/contexts/store-data-context.ts";
import { SETTINGS_STORE_NAME } from "#app/utils/store/settings.ts";

export const useSettings = () =>
	React.use(StoreDataContext)[SETTINGS_STORE_NAME];
