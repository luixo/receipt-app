import * as ReactNative from "react-native";
import Constants from "expo-constants";

const DEFAULT_NEXT_PORT = 3000;

const getBaseUrl = ReactNative.Platform.select({
	web: () => "",
	default: () => {
		if (!__DEV__) {
			return Constants.manifest?.extra?.host || "";
		}
		if (Constants.manifest?.hostUri) {
			return (
				"http://" +
					Constants.manifest.hostUri.replace(/:\d+/, `:${DEFAULT_NEXT_PORT}`) ??
				""
			);
		}
		return "";
	},
});

export const fetch: typeof window.fetch = (uri, opts) =>
	window.fetch(getBaseUrl() + uri, opts);
