import React from "react";

import { closeAll } from "~components/toast";

declare global {
	// external interface extension
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface Window {
		removeToasts?: () => void;
	}
}

export const useToastHelper = () => {
	React.useEffect(() => {
		window.removeToasts = () => closeAll();
	}, []);
};
