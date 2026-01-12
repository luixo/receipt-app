export default {
	expo: {
		name: "receipt-app",
		slug: "receipt-app",
		version: "1.0.0",
		scheme: "receipt-app",
		platforms: ["ios", "android"],
		icon: "app-icon.png",
		ios: {
			bundleIdentifier: "ru.luixo.receipt",
			buildNumber: "4",
		},
		android: {
			package: "ru.luixo.receipt",
		},
		plugins: ["expo-router"],
		userInterfaceStyle: "automatic",
	},
};
