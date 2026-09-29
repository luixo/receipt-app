import React from "react";

import { StoreDataContext } from "#app/contexts/store-data-context.ts";
import { LIMIT_STORE_NAME } from "#app/utils/store/limit.ts";
import { DEFAULT_LIMIT } from "#app/utils/validation.ts";

export const useDefaultLimit = () =>
	React.use(StoreDataContext)[LIMIT_STORE_NAME][0] || DEFAULT_LIMIT;
