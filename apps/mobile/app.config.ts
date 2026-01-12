const fonts = [
	"100Thin",
	"200ExtraLight",
	"300Light",
	"400Regular",
	"500Medium",
	"600SemiBold",
	"700Bold",
	"800ExtraBold",
	"900Black",
];

export default {
	expo: {
		name: "receipt-app",
		slug: "receipt-app",
		version: "1.0.0",
		scheme: "receipt-app",
		platforms: ["ios", "android"],
		icon: "assets/app-icon.png",
		ios: {
			bundleIdentifier: "ru.luixo.receipt",
			buildNumber: "4",
		},
		android: {
			package: "ru.luixo.receipt",
		},
		plugins: [
			"expo-localization",
			"expo-router",
			[
				"expo-font",
				{
					fonts: fonts.map(
						(font) =>
							`node_modules/@expo-google-fonts/inter/${font}/Inter_${font}.ttf`,
					),
				},
			],
			[
				"expo-splash-screen",
				{
					backgroundColor: "#ffffff",
					image: "./assets/app-icon.png",
					dark: {
						image: "./assets/app-icon.png",
						backgroundColor: "#000000",
					},
					imageWidth: 200,
				},
			],
		],
		userInterfaceStyle: "automatic",
	},
};
