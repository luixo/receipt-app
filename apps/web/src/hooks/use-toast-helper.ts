import React from "react";

import { closeAllToasts, getToastsAmount } from "~components/toast";

declare global {
	// external interface extension
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface Window {
		removeToasts?: () => number;
	}
}

export const useToastHelper = () => {
	React.useEffect(() => {
		window.removeToasts = () => {
			const currentToastAmount = getToastsAmount();
			closeAllToasts({ disableAnimation: true });
			return currentToastAmount;
		};
	}, []);
};
