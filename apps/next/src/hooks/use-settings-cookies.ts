import React from "react";

import { setCookie } from "cookies-next";

import {
	SETTINGS_COOKIE_NAME,
	SettingsContext,
} from "app/contexts/settings-context";
import { MONTH } from "app/utils/time";

export const useSettingsCookies = () => {
	const [settings] = React.useContext(SettingsContext);
	React.useEffect(() => {
		setCookie(SETTINGS_COOKIE_NAME, settings, {
			path: "/",
			maxAge: MONTH / 1000,
			sameSite: "strict",
		});
	}, [settings]);
};
