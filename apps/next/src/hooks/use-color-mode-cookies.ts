import React from "react";

import {
	ColorModeContext,
	LAST_COLOR_MODE_COOKIE_NAME,
	SELECTED_COLOR_MODE_COOKIE_NAME,
} from "app/contexts/color-mode-context";
import { MONTH } from "app/utils/time";
import { setCookies, removeCookies } from "cookies-next";

export const useColorModeCookies = () => {
	const [colorModeConfig] = React.useContext(ColorModeContext);
	React.useEffect(() => {
		if (colorModeConfig.last) {
			setCookies(LAST_COLOR_MODE_COOKIE_NAME, colorModeConfig.last, {
				path: "/",
				maxAge: MONTH / 1000,
			});
		} else {
			removeCookies(LAST_COLOR_MODE_COOKIE_NAME);
		}
	}, [colorModeConfig.last]);
	React.useEffect(() => {
		if (colorModeConfig.selected) {
			setCookies(SELECTED_COLOR_MODE_COOKIE_NAME, colorModeConfig.selected, {
				path: "/",
				maxAge: MONTH / 1000,
			});
		} else {
			removeCookies(SELECTED_COLOR_MODE_COOKIE_NAME);
		}
	}, [colorModeConfig.selected]);
};
