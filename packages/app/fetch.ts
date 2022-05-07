import * as ReactNative from "react-native";
import Constants from "expo-constants";

const getBaseUrl = ReactNative.Platform.select({
	web: () => "",
	default: () => {
		const host = Constants.manifest?.extra?.host;
		if (!host) {
			throw new Error(
				"Expected to have BACKEND_HOST environment variable in extra specification in app.config.ts"
			);
		}
		return host;
	},
});

export const fetch: typeof window.fetch = (uri, opts) => {
	return window.fetch(getBaseUrl() + uri, opts);
};
