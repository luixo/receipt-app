import React from "react";

import { SSRContext } from "~app/contexts/ssr-context";
import {
	LAST_COLOR_MODE_COOKIE_NAME,
	SELECTED_COLOR_MODE_COOKIE_NAME,
} from "~app/utils/cookie/color-modes";

export const useLastColorModeCookie = () =>
	React.useContext(SSRContext)[LAST_COLOR_MODE_COOKIE_NAME];

export const useSelectedColorModeCookie = () =>
	React.useContext(SSRContext)[SELECTED_COLOR_MODE_COOKIE_NAME];
