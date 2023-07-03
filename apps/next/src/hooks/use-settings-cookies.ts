import React from "react";

import { setCookies } from "cookies-next";

import {
	SETTINGS_COOKIE_NAME,
	SettingsContext,
} from "app/contexts/settings-context";
import { MONTH } from "app/utils/time";

export const useSettingsCookies = () => {
	const [settings] = React.useContext(SettingsContext);
	React.useEffect(() => {
		setCookies(SETTINGS_COOKIE_NAME, settings, {
			path: "/",
			maxAge: MONTH / 1000,
		});
	}, [settings]);
};
