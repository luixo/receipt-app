import React from "react";

import { SettingsContext } from "app/contexts/settings-context";

export const useShowResolvedDebts = () => {
	const [settings, setSettings] = React.useContext(SettingsContext);
	const setShowResolvedDebts = React.useCallback(
		(showResolvedDebts: boolean) => {
			setSettings((prevSettings) => ({ ...prevSettings, showResolvedDebts }));
		},
		[setSettings],
	);
	return [settings.showResolvedDebts, setShowResolvedDebts] as const;
};
