import React from "react";

import { SSRContext } from "app/contexts/ssr-context";
import { SETTINGS_COOKIE_NAME } from "app/utils/cookie/settings";

export const useSettings = () =>
	React.useContext(SSRContext)[SETTINGS_COOKIE_NAME];
