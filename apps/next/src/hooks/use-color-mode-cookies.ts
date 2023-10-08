import React from "react";

import { deleteCookie, setCookie } from "cookies-next";

import {
	ColorModeContext,
	LAST_COLOR_MODE_COOKIE_NAME,
	SELECTED_COLOR_MODE_COOKIE_NAME,
} from "app/contexts/color-mode-context";
import { MONTH } from "app/utils/time";

export const useColorModeCookies = () => {
	const [colorModeConfig] = React.useContext(ColorModeContext);
	React.useEffect(() => {
		if (colorModeConfig.last) {
			setCookie(LAST_COLOR_MODE_COOKIE_NAME, colorModeConfig.last, {
				path: "/",
				maxAge: MONTH / 1000,
				sameSite: "strict",
			});
		} else {
			deleteCookie(LAST_COLOR_MODE_COOKIE_NAME, { sameSite: "strict" });
		}
	}, [colorModeConfig.last]);
	React.useEffect(() => {
		if (colorModeConfig.selected) {
			setCookie(SELECTED_COLOR_MODE_COOKIE_NAME, colorModeConfig.selected, {
				path: "/",
				maxAge: MONTH / 1000,
				sameSite: "strict",
			});
		} else {
			deleteCookie(SELECTED_COLOR_MODE_COOKIE_NAME, { sameSite: "strict" });
		}
	}, [colorModeConfig.selected]);
};
