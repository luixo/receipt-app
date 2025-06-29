import React from "react";

import type { i18n } from "i18next";
import { useTranslation } from "react-i18next";

declare global {
	// external interface extension
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface Window {
		i18n?: i18n;
	}
}

export const useI18nHelper = () => {
	const { i18n } = useTranslation();
	React.useEffect(() => {
		if (import.meta.env.MODE !== "test") {
			return;
		}
		window.i18n = i18n;
	}, [i18n]);
};
