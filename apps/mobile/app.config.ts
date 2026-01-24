import type { AppJSONConfig } from "expo/config";

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

const config: AppJSONConfig = {
	expo: {
		name: "Checkalka",
		slug: "checkalka-app",
		version: "1.0.0",
		scheme: "me.luixo.receipt",
		platforms: ["ios", "android"],
		icon: "assets/app-icon.png",
		ios: {
			bundleIdentifier: "me.luixo.receipt",
			buildNumber: "4",
		},
		android: {
			package: "me.luixo.receipt",
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
		experiments: {
			reactCompiler: true,
		},
	},
};
export default config;
