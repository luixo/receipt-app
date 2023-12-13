import React from "react";

import { useSettings } from "./use-settings";

export const useShowResolvedDebts = () => {
	const [settings, setSettings] = useSettings();
	const setShowResolvedDebts = React.useCallback(
		(showResolvedDebts: boolean) => {
			setSettings((prevSettings) => ({ ...prevSettings, showResolvedDebts }));
		},
		[setSettings],
	);
	return [settings.showResolvedDebts, setShowResolvedDebts] as const;
};
