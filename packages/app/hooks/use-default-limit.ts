import React from "react";

import { StoreDataContext } from "~app/contexts/store-data-context";
import { LIMIT_STORE_NAME } from "~app/utils/store/limit";
import { DEFAULT_LIMIT } from "~app/utils/validation";

export const useDefaultLimit = () =>
	React.use(StoreDataContext)[LIMIT_STORE_NAME][0] || DEFAULT_LIMIT;
