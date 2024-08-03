import React from "react";

import Constants from "expo-constants";

export const useBaseUrl = () => {
	const [baseUrl] = React.useState(() => {
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
	});
	return baseUrl;
};
