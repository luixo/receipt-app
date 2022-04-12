export default {
	expo: {
		name: "receipt-app",
		slug: "receipt-app",
		version: "1.0.0",
		sdkVersion: "44.0.0",
		scheme: "receipt-app",
		platforms: ["ios", "android"],
		ios: {
			bundleIdentifier: "ru.luixo.receipt",
		},
		extra: {
			host: process.env.HOST || "http://unknown.host",
		},
	},
};
