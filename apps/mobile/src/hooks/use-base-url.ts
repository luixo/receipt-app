import React from "react";

const getBaseUrl = () => {
	// ExpoProcessEnv interface extends an object with any as value
	const envBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL as string | undefined;
	if (!envBaseUrl) {
		/* eslint-disable no-console */
		console.warn(
			"Expected to have EXPO_PUBLIC_API_BASE_URL environment variable in extra specification in app.config.ts",
		);
		console.warn("No backend host will result in queries failure");
		/* eslint-enable no-console */
	}
	return envBaseUrl || "";
};

export const useBaseUrl = () => React.useMemo(() => getBaseUrl(), []);
