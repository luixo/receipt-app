import type { AppJSONConfig } from "expo/config";

const config: AppJSONConfig = {
	expo: {
		name: "receipt-app",
		slug: "receipt-app",
		version: "1.0.0",
		scheme: "receipt-app",
		platforms: ["ios", "android"],
		icon: "app-icon.png",
		ios: {
			bundleIdentifier: "me.luixo.receipt",
			buildNumber: "4",
		},
		android: {
			package: "me.luixo.receipt",
		},
		extra: {
			host: process.env.BACKEND_HOST,
		},
		plugins: [["expo-router", { root: "./app" }]],
		userInterfaceStyle: "automatic",
	},
};
export default config;
