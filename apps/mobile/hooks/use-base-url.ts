import React from "react";

import Constants from "expo-constants";

const getBaseUrl = () => {
	const envBaseUrl = Constants.expoConfig?.extra?.host as string;
	if (!envBaseUrl) {
		/* eslint-disable no-console */
		console.warn(
			"Expected to have BACKEND_HOST environment variable in extra specification in app.config.ts",
		);
		console.warn("No backend host will result in queries failure");
		/* eslint-enable no-console */
	}
	return envBaseUrl || "";
};

export const useBaseUrl = () => React.useMemo(() => getBaseUrl(), []);
